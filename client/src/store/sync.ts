/* World Cup HQ — client <-> server sync layer.

   Ports the shared-board behaviour from the legacy client (legacy/public/index.html:
   pullState/pushState/readCache/writeCache) onto the Zustand store. The server owns
   the board behind a revision envelope ({ rev, updatedAt, state }); every client
   hydrates from it and polls for newer revisions, while admin writes push back.

   Deliberate, faithful-to-legacy behaviours:
   - hydrate() applies the server's state ONLY when env.rev > the last-applied rev,
     and skips applying while a form field is focused (so a live edit isn't clobbered).
   - push() POSTs the board with the admin bearer token; it no-ops for non-admins.
   - localStorage key `wchq.store.v2` is an OFFLINE READ CACHE only — never the source
     of truth. It mirrors the board so the app still shows something when the server
     can't be reached; it is never used to seed a write back to the server.

   Framework-light by design: a `createSync(...)` factory keeps everything injectable
   (store, token getter, focus check, poll interval) so it is trivially unit-testable
   with a mocked global `fetch`. */

import type { StoreApi } from 'zustand/vanilla';
import type { AppState } from './types';
import type { StoreState } from './store';
import { store as singletonStore } from './store';

/* localStorage key for the offline read cache (matches the prototype's KEY). */
export const CACHE_KEY = 'wchq.store.v2';

/* localStorage key for the admin bearer token (set after /api/admin/login). */
export const ADMIN_TOKEN_KEY = 'wchq.admin';

/* the shared-board endpoint. */
const STATE_URL = '/api/state';

/* poll cadence — roughly every ten seconds, like the legacy live sync. */
const DEFAULT_POLL_MS = 10_000;

/* the revision envelope the server wraps the board in. */
export interface Envelope {
  rev: number;
  updatedAt: string | null;
  state: AppState | null;
}

export interface SyncOptions {
  /* the store to hydrate into / push from. */
  store: StoreApi<StoreState>;
  /* returns the admin bearer token, or null/empty for a viewer. */
  getToken?: () => string | null;
  /* poll interval in ms (default ~10s). */
  pollMs?: number;
  /* override the endpoint (handy for tests). */
  url?: string;
  /* override the cache key (handy for tests). */
  cacheKey?: string;
  /* true when a form field is focused — applying server state is skipped so a
     live edit isn't clobbered. Injected for deterministic tests. */
  isFieldFocused?: () => boolean;
}

export interface Sync {
  /* GET the envelope; apply state when newer and not mid-edit. Falls back to the
     offline cache when the request fails. Returns the envelope, or null offline. */
  hydrate: () => Promise<Envelope | null>;
  /* POST the board (admin only). No-ops for non-admins. Always mirrors to cache. */
  push: () => Promise<void>;
  /* start the poll loop (fires an immediate hydrate, then every pollMs). */
  start: () => void;
  /* stop the poll loop. */
  stop: () => void;
  /* is the poll loop running? */
  isRunning: () => boolean;
  /* the last server revision applied locally. */
  localRev: () => number;
  /* are we currently reaching the server? */
  isOnline: () => boolean;
  /* true while a hydrated board is being applied (so push-on-change can skip). */
  isApplying: () => boolean;
}

/* the editable board fields the store shares with the server. */
function extractBoard(s: StoreState): AppState {
  return {
    settings: s.settings,
    people: s.people,
    teamEdits: s.teamEdits,
    results: s.results,
    bracketNonce: s.bracketNonce,
    koLive: s.koLive ?? null,
    fixtures: s.fixtures ?? [],
  };
}

/* apply a (possibly partial) board onto the store without disturbing its actions.
   Zustand's vanilla setState shallow-merges, so the action functions survive. */
function applyBoard(store: StoreApi<StoreState>, board: Partial<AppState>): void {
  const patch: Partial<AppState> = {};
  // MERGE settings onto the current ones (don't replace): a server board can
  // legitimately carry only a subset of settings, and replacing would wipe the
  // client's title/kickoff (→ NaN countdown + Admin crash).
  if (board.settings) patch.settings = { ...store.getState().settings, ...board.settings };
  if (Array.isArray(board.people)) patch.people = board.people;
  if (board.teamEdits) patch.teamEdits = board.teamEdits;
  if (board.results) patch.results = board.results;
  if (typeof board.bracketNonce === 'number') patch.bracketNonce = board.bracketNonce;
  if ('koLive' in board) patch.koLive = board.koLive ?? null;
  if (Array.isArray(board.fixtures)) patch.fixtures = board.fixtures;
  store.setState(patch as Partial<StoreState>);
}

/* default focus check — treat text-ish inputs as "mid-edit". */
function defaultFieldFocused(): boolean {
  if (typeof document === 'undefined') return false;
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
}

/* Factory: build an isolated sync controller bound to a store. */
export function createSync(opts: SyncOptions): Sync {
  const store = opts.store;
  const getToken = opts.getToken ?? (() => null);
  const pollMs = opts.pollMs ?? DEFAULT_POLL_MS;
  const url = opts.url ?? STATE_URL;
  const cacheKey = opts.cacheKey ?? CACHE_KEY;
  const isFieldFocused = opts.isFieldFocused ?? defaultFieldFocused;

  let localRev = 0;
  let online = false;
  let timer: ReturnType<typeof setInterval> | null = null;
  /* true while we're applying a hydrated board, so the push-on-change wiring
     doesn't echo a just-received update straight back to the server. */
  let applying = false;
  function applyGuarded(board: Partial<AppState>): void {
    applying = true;
    try { applyBoard(store, board); } finally { applying = false; }
  }

  /* ----- offline read cache (localStorage) ----- */
  function writeCache(): void {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(extractBoard(store.getState())));
    } catch {
      /* storage may be full or unavailable — the cache is best-effort only. */
    }
  }

  function readCache(): AppState | null {
    try {
      const raw = localStorage.getItem(cacheKey);
      return raw ? (JSON.parse(raw) as AppState) : null;
    } catch {
      return null;
    }
  }

  /* ----- hydrate (GET) ----- */
  async function hydrate(): Promise<Envelope | null> {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('bad status ' + res.status);
      online = true;
      const env = (await res.json()) as Envelope;
      if (env && env.state) {
        /* nothing newer — leave local state alone. */
        if ((env.rev || 0) <= localRev) return env;
        /* don't clobber a live edit. */
        if (isFieldFocused()) return env;
        applyGuarded(env.state);
        localRev = env.rev || 0;
        writeCache();
      }
      return env;
    } catch {
      /* offline: fall back to the read cache the first time only, so we never
         overwrite freshly-applied server state with a stale local copy. */
      online = false;
      if (localRev === 0) {
        const cached = readCache();
        if (cached) applyGuarded(cached);
      }
      return null;
    }
  }

  /* ----- push (POST) ----- */
  async function push(): Promise<void> {
    /* always mirror locally first, even for viewers/offline. */
    writeCache();
    const token = getToken();
    /* viewers are read-only — never write to the shared board. */
    if (!token) return;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ state: extractBoard(store.getState()) }),
      });
      if (res.ok) {
        online = true;
        const env = (await res.json()) as Pick<Envelope, 'rev'>;
        localRev = env.rev || localRev;
      }
    } catch {
      online = false;
    }
  }

  /* ----- poll loop ----- */
  function start(): void {
    if (timer) return;
    void hydrate();
    timer = setInterval(() => void hydrate(), pollMs);
  }

  function stop(): void {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  return {
    hydrate,
    push,
    start,
    stop,
    isRunning: () => timer !== null,
    localRev: () => localRev,
    isOnline: () => online,
    isApplying: () => applying,
  };
}

/* ----- app singleton, bound to the shared store ----- */

function readAdminToken(): string | null {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

/* Persist (or clear) the admin bearer token used by the singleton sync's push(). */
export function setAdminToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
    else localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    /* ignore storage failures — token simply won't persist across reloads. */
  }
}

/* The app-wide sync controller wired to the singleton store. */
export const sync: Sync = createSync({
  store: singletonStore,
  getToken: readAdminToken,
});

/* Wire the singleton sync into the app lifecycle (call once at boot):
   - start the poll loop (immediate hydrate, then every ~10s);
   - push local edits back to the shared board, debounced, skipping changes that
     are just a hydrated update being applied. push() itself no-ops for viewers
     (no admin token), so only admin edits reach the server. */
let wired = false;
export function wireSync(): void {
  if (wired) return;
  wired = true;
  sync.start();
  let t: ReturnType<typeof setTimeout> | null = null;
  singletonStore.subscribe(() => {
    if (sync.isApplying()) return;
    if (t) clearTimeout(t);
    t = setTimeout(() => void sync.push(), 400);
  });
}
