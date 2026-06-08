/* World Cup HQ — mutable app store (Zustand).
   Ported from the prototype's store.js `Store` object. Holds the editable
   board (settings, people, teamEdits, results, bracketNonce) so the Admin
   page can manage it and every page updates live.

   Two deliberate changes from the prototype, per the architecture spec:
   1. Provider API keys never reach the browser — provider patches carry
      metadata only (no raw `key`); the real key lives server-side.
   2. `teamEdits` are applied through a DERIVED selector (`selectTeams`) over
      the static `TEAMS` import rather than by mutating the imported data. The
      bracket re-seeds off `bracketNonce`, which bumps whenever odds change. */

import { createStore as createZustandStore, type StoreApi } from 'zustand/vanilla';
import { useStore as useZustandStore } from 'zustand';
import { TEAMS, type Person, type Team } from '../data/teams';
import type { AppState, Provider, Settings, TeamEdit } from './types';
import { DEFAULTS } from './defaults';

/* editable team fields exposed to Admin (mirrors store.js TEAM_FIELDS) */
const TEAM_FIELDS: (keyof TeamEdit)[] = ['name', 'odds', 'tier', 'titles', 'fact', 'squad'];

const PALETTE = ['#36a9ff', '#9b6cf0', '#ff8fd0', '#ff9f1c', '#2fe0c0', '#ff5d5d', '#ffd23f', '#46b94a'];

/* deep clone helper (matches the prototype's JSON clone) */
function clone<T>(o: T): T {
  return JSON.parse(JSON.stringify(o)) as T;
}

function uid(): string {
  return 'p' + Math.random().toString(36).slice(2, 7);
}

/* derive initials from a display name (ported verbatim from store.js) */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const s = (parts[0]?.[0] || '') + (parts[1]?.[0] || parts[0]?.[1] || '');
  return s.toUpperCase() || '??';
}

/* DERIVED team map: static TEAMS with any saved teamEdits layered on top.
   Never mutates the imported TEAMS.

   MEMOISED on the `teamEdits` object identity: `editTeam` always replaces
   `teamEdits` with a new object, so caching on that reference returns a STABLE
   result between edits. This is essential — `useStore(selectTeams)` runs on
   useSyncExternalStore, which loops infinitely if the selector hands back a
   fresh object every render. */
type Edits = NonNullable<AppState['teamEdits']>;
const EMPTY_EDITS: Edits = {};
let _teamsKey: Edits | null = null;
let _teamsVal: Record<string, Team> | null = null;
export function selectTeams(state: AppState): Record<string, Team> {
  const edits = state.teamEdits ?? EMPTY_EDITS;
  if (_teamsVal && _teamsKey === edits) return _teamsVal;
  const out: Record<string, Team> = {};
  for (const code of Object.keys(TEAMS)) {
    const patch = edits[code];
    out[code] = patch ? { ...TEAMS[code], ...patch } : TEAMS[code];
  }
  _teamsKey = edits;
  _teamsVal = out;
  return out;
}

/* The full store shape: board state + the actions ported from `Store`. */
export interface StoreState extends AppState {
  /* settings + people */
  setSettings: (patch: Partial<Settings>) => void;
  setPeople: (people: Person[]) => void;
  addPerson: (partial: Partial<Person>) => Person;
  updatePerson: (id: string, patch: Partial<Person>) => void;
  removePerson: (id: string) => void;
  toggleOut: (id: string, code: string) => void;

  /* team edits (derived onto TEAMS via selectTeams) */
  editTeam: (code: string, patch: TeamEdit) => void;
  getTeams: () => Record<string, Team>;

  /* match results overlay */
  resultKey: (stage: string, i: number) => string;
  setResult: (stage: string, i: number, score: [number | string, number | string]) => void;
  clearResult: (stage: string, i: number) => void;
  clearAllResults: () => void;

  /* API providers (metadata only — keys stay server-side) */
  getActiveProvider: () => (Provider & { id: string }) | null;
  setActiveProvider: (id: string) => void;
  updateProvider: (id: string, patch: Partial<Provider>) => void;
  addCustomProvider: (name?: string) => string;
  removeProvider: (id: string) => void;

  /* sync + reset */
  sync: () => string;
  reset: () => void;
  /* clean slate for the real draw: clear all scores + eliminations + points,
     keeping the people so they can be renamed/re-drawn. */
  prepareForKickoff: () => void;
}

/* Strip a provider patch of anything key-shaped so a raw key can never be
   persisted client-side, regardless of caller. */
function sanitiseProviderPatch(patch: Partial<Provider> & { key?: unknown }): Partial<Provider> {
  const { key: _key, ...rest } = patch;
  void _key;
  return rest;
}

/* Factory — a fresh, isolated store seeded from DEFAULTS. */
export function createStore(): StoreApi<StoreState> {
  return createZustandStore<StoreState>((set, get) => ({
    ...clone(DEFAULTS),

    setSettings(patch) {
      set({ settings: { ...get().settings, ...patch } });
    },

    setPeople(people) {
      set({ people });
    },

    addPerson(partial) {
      const people = get().people;
      const colour = partial.colour || PALETTE[people.length % PALETTE.length];
      const name = partial.name || 'New Player';
      const person: Person = {
        id: uid(),
        name,
        initials: partial.initials || initials(name),
        colour,
        points: partial.points || 0,
        teams: partial.teams || [],
        out: partial.out || [],
        best: partial.best || (partial.teams && partial.teams[0]) || '',
      };
      set({ people: [...people, person] });
      return person;
    },

    updatePerson(id, patch) {
      set({
        people: get().people.map((p) => {
          if (p.id !== id) return p;
          const next = { ...p, ...patch };
          if (patch.name && !patch.initials) next.initials = initials(patch.name);
          return next;
        }),
      });
    },

    removePerson(id) {
      set({ people: get().people.filter((p) => p.id !== id) });
    },

    /* toggle a team in/out for a person */
    toggleOut(id, code) {
      set({
        people: get().people.map((p) => {
          if (p.id !== id) return p;
          const out = p.out.includes(code) ? p.out.filter((c) => c !== code) : [...p.out, code];
          return { ...p, out };
        }),
      });
    },

    /* patch a team's editable fields → writes teamEdits (does NOT mutate the
       imported TEAMS). An odds change bumps bracketNonce so the projected
       bracket re-seeds on next render. */
    editTeam(code, patch) {
      const clean: TeamEdit = {};
      TEAM_FIELDS.forEach((k) => {
        if (k in patch) (clean as Record<string, unknown>)[k] = patch[k];
      });
      const state = get();
      const teamEdits = { ...state.teamEdits, [code]: { ...(state.teamEdits[code] || {}), ...clean } };
      const bracketNonce = 'odds' in clean ? (state.bracketNonce || 0) + 1 : state.bracketNonce;
      set({ teamEdits, bracketNonce });
    },

    getTeams() {
      return selectTeams(get());
    },

    /* ---- match results overlay (played vs upcoming) ---- */
    resultKey: (stage, i) => stage + ':' + i,

    setResult(stage, i, score) {
      const key = stage + ':' + i;
      set({
        results: {
          ...get().results,
          [key]: { score: [Number(score[0]) || 0, Number(score[1]) || 0], played: true },
        },
      });
    },

    clearResult(stage, i) {
      const key = stage + ':' + i;
      const next = { ...get().results };
      delete next[key];
      set({ results: next });
    },

    clearAllResults() {
      set({ results: {} });
    },

    prepareForKickoff() {
      // wipe every group + knockout score, and reset each player to "all in,
      // nil points" — ready for the real family draw on kickoff day.
      set({
        results: {},
        people: get().people.map((p) => ({ ...p, out: [], points: 0 })),
      });
    },

    /* ---- API providers (metadata only) ---- */
    getActiveProvider() {
      const { settings } = get();
      const id = settings.activeProvider;
      const p = (settings.providers || {})[id];
      return p ? { id, ...p } : null;
    },

    setActiveProvider(id) {
      set({ settings: { ...get().settings, activeProvider: id, dataSource: 'live' } });
    },

    updateProvider(id, patch) {
      const settings = get().settings;
      const provs = { ...(settings.providers || {}) };
      provs[id] = { ...(provs[id] || ({} as Provider)), ...sanitiseProviderPatch(patch) };
      set({ settings: { ...settings, providers: provs } });
    },

    addCustomProvider(name) {
      const id = 'custom-' + Math.random().toString(36).slice(2, 6);
      const settings = get().settings;
      const provs = { ...(settings.providers || {}) };
      provs[id] = {
        name: name || 'New provider',
        status: 'idle',
        baseUrl: '',
        authHeader: 'Authorization',
        docs: '',
        hint: 'Custom REST endpoint.',
        builtin: false,
        keySet: false,
        keyHint: '',
      };
      set({ settings: { ...settings, providers: provs } });
      return id;
    },

    removeProvider(id) {
      const settings = get().settings;
      const provs = { ...(settings.providers || {}) };
      if (provs[id] && provs[id].builtin) return;
      delete provs[id];
      const patch: Partial<Settings> = { providers: provs };
      if (settings.activeProvider === id) patch.activeProvider = 'api-football';
      set({ settings: { ...settings, ...patch } });
    },

    sync() {
      const now = new Date().toISOString();
      set({ settings: { ...get().settings, lastSync: now } });
      return now;
    },

    reset() {
      const fresh = clone(DEFAULTS);
      set({
        settings: fresh.settings,
        people: fresh.people,
        teamEdits: fresh.teamEdits,
        results: fresh.results,
        bracketNonce: fresh.bracketNonce,
      });
    },
  }));
}

/* Singleton store + React hook for the app to share one board. */
export const store: StoreApi<StoreState> = createStore();

export function useStore<T>(selector: (s: StoreState) => T): T {
  return useZustandStore(store, selector);
}
