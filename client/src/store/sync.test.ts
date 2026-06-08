/* World Cup HQ — sync layer tests.
   The shared-board sync is exercised against a mocked global `fetch` and an
   isolated store, covering the plan-mandated behaviours:
   - hydrate() applies env.state when env.rev > localRev;
   - hydrate() skips applying while a form field is focused (no clobbered edit);
   - hydrate() leaves state alone when the server isn't newer;
   - push() POSTs the board with the admin bearer token;
   - push() no-ops for a non-admin viewer;
   - offline → keeps and reads the localStorage cache;
   - the poll loop can be started and stopped. */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StoreApi } from 'zustand/vanilla';
import { createStore, type StoreState } from './store';
import { createSync, CACHE_KEY, type Envelope } from './sync';

/* build a server envelope from a store's current board, with an optional tweak. */
function envFrom(
  store: StoreApi<StoreState>,
  rev: number,
  mutate?: (state: Envelope['state'] & object) => void,
): Envelope {
  const s = store.getState();
  const state = {
    settings: { ...s.settings },
    people: s.people,
    teamEdits: { ...s.teamEdits },
    results: { ...s.results },
    bracketNonce: s.bracketNonce,
  };
  mutate?.(state);
  return { rev, updatedAt: new Date().toISOString(), state };
}

/* a fetch mock that resolves to a JSON body. */
function jsonResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => body } as Response;
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  localStorage.clear();
});

describe('sync.hydrate', () => {
  it('GETs /api/state and applies env.state when env.rev > localRev', async () => {
    const store = createStore();
    const env = envFrom(store, 1, (st) => {
      st.settings = { ...st.settings, title: 'FROM SERVER' };
    });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(env));
    vi.stubGlobal('fetch', fetchMock);

    const sync = createSync({ store, isFieldFocused: () => false });
    const result = await sync.hydrate();

    expect(fetchMock).toHaveBeenCalledWith('/api/state', expect.objectContaining({ cache: 'no-store' }));
    expect(store.getState().settings.title).toBe('FROM SERVER');
    expect(sync.localRev()).toBe(1);
    expect(result?.rev).toBe(1);
    expect(sync.isOnline()).toBe(true);
  });

  it('does not re-apply when the server is not newer (rev <= localRev)', async () => {
    const store = createStore();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(envFrom(store, 1, (st) => { st.settings = { ...st.settings, title: 'V1' }; })))
      .mockResolvedValueOnce(jsonResponse(envFrom(store, 1, (st) => { st.settings = { ...st.settings, title: 'V2-SAME-REV' }; })));
    vi.stubGlobal('fetch', fetchMock);

    const sync = createSync({ store, isFieldFocused: () => false });
    await sync.hydrate();
    expect(store.getState().settings.title).toBe('V1');

    /* a local edit at the same rev must survive a non-newer poll. */
    store.getState().setSettings({ title: 'LOCAL EDIT' });
    await sync.hydrate();
    expect(store.getState().settings.title).toBe('LOCAL EDIT');
    expect(sync.localRev()).toBe(1);
  });

  it('skips applying server state while a form field is focused', async () => {
    const store = createStore();
    const env = envFrom(store, 5, (st) => {
      st.settings = { ...st.settings, title: 'SERVER WANTS THIS' };
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(env)));

    const sync = createSync({ store, isFieldFocused: () => true });
    await sync.hydrate();

    /* untouched, even though the server rev is newer. */
    expect(store.getState().settings.title).toBe("LEO'S WORLD CUP");
    expect(sync.localRev()).toBe(0);
  });
});

describe('sync.push', () => {
  it('POSTs the board with the admin bearer token and records the new rev', async () => {
    const store = createStore();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ rev: 2, updatedAt: 'now' }));
    vi.stubGlobal('fetch', fetchMock);

    const sync = createSync({ store, getToken: () => 'TOKEN123' });
    store.getState().setSettings({ title: 'PUSHED' });
    await sync.push();

    expect(fetchMock).toHaveBeenCalledWith('/api/state', expect.objectContaining({ method: 'POST' }));
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer TOKEN123');
    const body = JSON.parse(init.body as string);
    expect(body.state.settings.title).toBe('PUSHED');
    expect(sync.localRev()).toBe(2);
  });

  it('no-ops for a non-admin viewer (never POSTs) but still mirrors to cache', async () => {
    const store = createStore();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const sync = createSync({ store, getToken: () => null });
    store.getState().setSettings({ title: 'VIEWER LOCAL' });
    await sync.push();

    expect(fetchMock).not.toHaveBeenCalled();
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) as string);
    expect(cached.settings.title).toBe('VIEWER LOCAL');
  });
});

describe('sync offline cache', () => {
  it('caches applied state, then reads the cache when the server is unreachable', async () => {
    /* 1. an online hydrate writes the offline cache. */
    const store1 = createStore();
    const env = envFrom(store1, 3, (st) => {
      st.settings = { ...st.settings, title: 'CACHED TITLE' };
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(env)));
    const sync1 = createSync({ store: store1, isFieldFocused: () => false });
    await sync1.hydrate();
    expect(localStorage.getItem(CACHE_KEY)).toBeTruthy();

    /* 2. a fresh store goes offline and falls back to that cache. */
    const store2 = createStore();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const sync2 = createSync({ store: store2, isFieldFocused: () => false });
    const result = await sync2.hydrate();

    expect(result).toBeNull();
    expect(sync2.isOnline()).toBe(false);
    expect(store2.getState().settings.title).toBe('CACHED TITLE');
    /* the cache itself is untouched by the offline read. */
    expect(JSON.parse(localStorage.getItem(CACHE_KEY) as string).settings.title).toBe('CACHED TITLE');
  });
});

describe('sync poll loop', () => {
  it('starts (immediate hydrate + interval) and stops cleanly', async () => {
    vi.useFakeTimers();
    const store = createStore();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ rev: 0, updatedAt: null, state: null }));
    vi.stubGlobal('fetch', fetchMock);

    const sync = createSync({ store, pollMs: 10_000, isFieldFocused: () => false });
    expect(sync.isRunning()).toBe(false);

    sync.start();
    expect(sync.isRunning()).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1); // immediate hydrate

    await vi.advanceTimersByTimeAsync(10_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    sync.stop();
    expect(sync.isRunning()).toBe(false);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(fetchMock).toHaveBeenCalledTimes(2); // no further polls after stop
  });
});
