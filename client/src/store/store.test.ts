/* World Cup HQ — store action tests.
   Covers the methods ported from the prototype's store.js `Store`. The two
   plan-mandated tests (editTeam odds bumps bracketNonce; toggleOut add then
   remove) are reproduced verbatim. */

import { describe, expect, test } from 'vitest';
import { createStore, selectTeams } from './store';
import { TEAMS } from '../data/teams';

describe('store actions', () => {
  test('editTeam odds bumps bracketNonce', () => {
    const s = createStore();
    const n0 = s.getState().bracketNonce;
    s.getState().editTeam('BRA', { odds: '2/1' });
    expect(s.getState().bracketNonce).toBe(n0 + 1);
  });

  // Regression: selectTeams must return a STABLE reference between edits, or
  // useStore(selectTeams) loops forever (useSyncExternalStore getSnapshot).
  test('selectTeams returns a stable reference until teamEdits change', () => {
    const s = createStore();
    const a = selectTeams(s.getState());
    const b = selectTeams(s.getState());
    expect(a).toBe(b); // same object — no infinite render loop
    s.getState().editTeam('BRA', { odds: '2/1' });
    const c = selectTeams(s.getState());
    expect(c).not.toBe(a); // recomputed after an edit
    expect(c.BRA.odds).toBe('2/1');
  });

  test('toggleOut adds then removes', () => {
    const s = createStore();
    const id = s.getState().people[0].id;
    const code = 'BRA';
    s.getState().toggleOut(id, code);
    expect(s.getState().people[0].out).toContain(code);
    s.getState().toggleOut(id, code);
    expect(s.getState().people[0].out).not.toContain(code);
  });

  test('editTeam without odds leaves bracketNonce unchanged', () => {
    const s = createStore();
    const n0 = s.getState().bracketNonce;
    s.getState().editTeam('BRA', { name: 'Brasil' });
    expect(s.getState().bracketNonce).toBe(n0);
  });

  test('editTeam writes teamEdits applied via derived selector, not the import', () => {
    const s = createStore();
    s.getState().editTeam('BRA', { odds: '2/1' });
    expect(s.getState().teamEdits.BRA).toEqual({ odds: '2/1' });
    // derived map reflects the edit
    expect(selectTeams(s.getState()).BRA.odds).toBe('2/1');
    // the static import is untouched
    expect(TEAMS.BRA.odds).toBe('11/1');
  });

  test('addPerson appends with derived initials, updatePerson re-derives, removePerson deletes', () => {
    const s = createStore();
    const before = s.getState().people.length;
    const p = s.getState().addPerson({ name: 'Great Auntie' });
    expect(s.getState().people).toHaveLength(before + 1);
    expect(p.initials).toBe('GA');

    s.getState().updatePerson(p.id, { name: 'Cousin Joe' });
    const updated = s.getState().people.find((x) => x.id === p.id)!;
    expect(updated.initials).toBe('CJ');

    s.getState().removePerson(p.id);
    expect(s.getState().people.find((x) => x.id === p.id)).toBeUndefined();
    expect(s.getState().people).toHaveLength(before);
  });

  test('setResult stores a played scoreline; clearResult / clearAllResults remove it', () => {
    const s = createStore();
    s.getState().setResult('R32', 0, [2, 1]);
    expect(s.getState().results['R32:0']).toEqual({ score: [2, 1], played: true });

    s.getState().setResult('R32', 1, [0, 0]);
    s.getState().clearResult('R32', 0);
    expect(s.getState().results['R32:0']).toBeUndefined();
    expect(s.getState().results['R32:1']).toBeDefined();

    s.getState().clearAllResults();
    expect(Object.keys(s.getState().results)).toHaveLength(0);
  });

  test('provider CRUD updates metadata and never stores a raw key', () => {
    const s = createStore();
    // updateProvider strips any key-shaped field
    s.getState().updateProvider('api-football', { status: 'ok', key: 'super-secret' } as never);
    const prov = s.getState().settings.providers['api-football'];
    expect(prov.status).toBe('ok');
    expect(prov).not.toHaveProperty('key');

    const id = s.getState().addCustomProvider('My Feed');
    expect(s.getState().settings.providers[id].name).toBe('My Feed');
    expect(s.getState().settings.providers[id]).not.toHaveProperty('key');

    s.getState().removeProvider(id);
    expect(s.getState().settings.providers[id]).toBeUndefined();

    // builtin providers cannot be removed
    s.getState().removeProvider('api-football');
    expect(s.getState().settings.providers['api-football']).toBeDefined();
  });

  test('setActiveProvider switches active id and flips dataSource to live', () => {
    const s = createStore();
    s.getState().setActiveProvider('football-data');
    expect(s.getState().settings.activeProvider).toBe('football-data');
    expect(s.getState().settings.dataSource).toBe('live');
    expect(s.getState().getActiveProvider()?.id).toBe('football-data');
  });

  test('sync stamps lastSync', () => {
    const s = createStore();
    const ts = s.getState().sync();
    expect(s.getState().settings.lastSync).toBe(ts);
  });

  test('reset restores DEFAULTS', () => {
    const s = createStore();
    s.getState().editTeam('BRA', { odds: '2/1' });
    s.getState().setResult('R32', 0, [3, 0]);
    s.getState().removePerson(s.getState().people[0].id);

    s.getState().reset();
    expect(s.getState().bracketNonce).toBe(0);
    expect(s.getState().teamEdits).toEqual({});
    expect(s.getState().results).toEqual({});
    expect(s.getState().people).toHaveLength(6);
    expect(s.getState().settings.activeProvider).toBe('api-football');
    expect(s.getState().settings.dataSource).toBe('demo');
  });
});
