import { test, expect } from 'vitest';
import { buildBracket, qualifiers } from './bracket';
import { computeStandings, GROUP_FIXTURES } from '../data/tournament';
import { TEAMS } from '../data/teams';
import type { KoLive, KoTie } from '../store/types';

/* a results map with every group game played (a home win), so the group stage
   is "complete" and the real qualifiers are known. */
function fullGroups(): Record<string, { score: [number, number]; played: boolean }> {
  const r: Record<string, { score: [number, number]; played: boolean }> = {};
  for (const g of Object.keys(GROUP_FIXTURES)) {
    for (const fx of GROUP_FIXTURES[g]) r[fx.id] = { score: [2, 0], played: true };
  }
  return r;
}

/* a full 16-tie R32 koLive round: tie 0 is a penalty win (ARG beat BRA on pens
   after a 1-1 draw); the rest are decisive 2-0 home wins. */
function fullR32(): KoTie[] {
  const ties: KoTie[] = [{ a: 'BRA', b: 'ARG', as: 1, bs: 1, played: true, pen: 'ARG' }];
  for (let i = 1; i < 16; i++) {
    ties.push({ a: `H${i}`, b: `A${i}`, as: 2, bs: 0, played: true, pen: null });
  }
  return ties;
}

const emptyKoLive = (): KoLive => ({ R32: [], R16: [], QF: [], SF: [], Final: [] });

/* ---- TBD before the knockout teams are known ---- */
test('blank/TBD bracket before the group stage finishes', () => {
  const b = buildBracket({ results: {}, teams: TEAMS });
  expect(b.champ).toBe('');
  expect(b.r32).toHaveLength(16);
  expect(b.r32.every((t) => t.a === '' && t.b === '')).toBe(true);
});

/* ---- shape + real qualifiers once the group stage is complete ---- */
test('shape + 32 real qualifiers once the group stage is complete', () => {
  const b = buildBracket({ results: fullGroups(), teams: TEAMS });
  expect(b.r32).toHaveLength(16);
  expect(b.r16).toHaveLength(8);
  expect(b.qf).toHaveLength(4);
  expect(b.sf).toHaveLength(2);
  expect(b.final).toBeDefined();
  const codes = b.r32.flatMap((t) => [t.a, t.b]).filter(Boolean);
  expect(new Set(codes).size).toBe(32);
});

/* ---- qualifiers ---- */
test('qualifiers returns 32 unique team codes', () => {
  const q = qualifiers(computeStandings(fullGroups()));
  expect(q).toHaveLength(32);
  expect(new Set(q).size).toBe(32);
});

/* ---- advancement from saved results ---- */
test('saved R32 upset advances the actual winner', () => {
  const full = fullGroups();
  const b0 = buildBracket({ results: full, teams: TEAMS });
  const tie = b0.r32[0];
  const underdog = tie.w === tie.a ? tie.b : tie.a;
  const score: [number, number] = tie.w === tie.a ? [0, 1] : [1, 0];
  const b = buildBracket({ results: { ...full, 'R32:0': { score, played: true } }, teams: TEAMS });
  expect(b.r32[0].w).toBe(underdog);
  expect(b.r16[0].a === underdog || b.r16[0].b === underdog).toBe(true);
});

/* ---- live knockout (koLive) drives the bracket even before groups complete ---- */
test('a full koLive.R32 carries real teams/scores and the penalty winner advances', () => {
  const koLive: KoLive = { ...emptyKoLive(), R32: fullR32() };
  const b = buildBracket({ results: {}, teams: TEAMS, koLive });

  expect(b.r32).toHaveLength(16);
  expect(b.r32[0].a).toBe('BRA');
  expect(b.r32[0].b).toBe('ARG');
  expect(b.r32[0].as).toBe(1);
  expect(b.r32[0].bs).toBe(1);
  expect(b.r32[0].pen).toBe('ARG');
  expect(b.r32[0].played).toBe(true);
  expect(b.r32[0].w).toBe('ARG');
  expect(b.r16[0].a).toBe('ARG');
});

test('a partial koLive round is ignored (group projection kept)', () => {
  const full = fullGroups();
  const koLive: KoLive = { ...emptyKoLive(), R32: fullR32().slice(0, 8) }; // 8 of 16 → partial
  const b = buildBracket({ results: full, teams: TEAMS, koLive });
  const proj = buildBracket({ results: full, teams: TEAMS });

  expect(b.r32[0].a).toBe(proj.r32[0].a);
  expect(b.r32[0].b).toBe(proj.r32[0].b);
  expect(b.r32[0].played).toBeUndefined();
});
