import { test, expect } from 'vitest';
import { buildBracket, qualifiers } from './bracket';
import { computeStandings } from '../data/tournament';
import { TEAMS } from '../data/teams';
import type { KoLive, KoTie } from '../store/types';

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

/* ---- shape ---- */
test('shape', () => {
  const b = buildBracket({ results: {}, teams: TEAMS });
  expect(b.r32).toHaveLength(16);
  expect(b.r16).toHaveLength(8);
  expect(b.qf).toHaveLength(4);
  expect(b.sf).toHaveLength(2);
  expect(b.final).toBeDefined();
});

/* ---- qualifiers ---- */
test('qualifiers returns 32 unique team codes', () => {
  const q = qualifiers(computeStandings({}));
  expect(q).toHaveLength(32);
  expect(new Set(q).size).toBe(32);
});

test('weakest-by-odds team in a group does not qualify pre-tournament', () => {
  // Group C = BRA(11/1), MAR(66/1), SCO(200/1), HAI(500/1). HAI is last on odds,
  // so it is neither a top-2 nor a best-third and never reaches the Round of 32.
  const b = buildBracket({ results: {}, teams: TEAMS });
  const r32codes = b.r32.flatMap((t) => [t.a, t.b]);
  expect(r32codes).not.toContain('HAI');
});

/* ---- advancement from saved results ---- */
test('saved R32 upset advances the actual winner', () => {
  const b0 = buildBracket({ results: {}, teams: TEAMS });
  const tie = b0.r32[0];
  const underdog = tie.w === tie.a ? tie.b : tie.a;
  const score: [number, number] = tie.w === tie.a ? [0, 1] : [1, 0];
  const b = buildBracket({ results: { 'R32:0': { score, played: true } }, teams: TEAMS });
  expect(b.r32[0].w).toBe(underdog);
  expect(b.r16[0].a === underdog || b.r16[0].b === underdog).toBe(true);
});

/* ---- live knockout (koLive) ---- */
test('a full koLive.R32 carries real teams/scores and the penalty winner advances', () => {
  const koLive: KoLive = { ...emptyKoLive(), R32: fullR32() };
  const b = buildBracket({ results: {}, teams: TEAMS, koLive });

  // R32 is replaced by the feed: real teams, scores and played flag.
  expect(b.r32).toHaveLength(16);
  expect(b.r32[0].a).toBe('BRA');
  expect(b.r32[0].b).toBe('ARG');
  expect(b.r32[0].as).toBe(1);
  expect(b.r32[0].bs).toBe(1);
  expect(b.r32[0].pen).toBe('ARG');
  expect(b.r32[0].played).toBe(true);
  // level on the night → the penalty winner takes the tie...
  expect(b.r32[0].w).toBe('ARG');
  // ...and advances into the Round of 16.
  expect(b.r16[0].a).toBe('ARG');
});

test('a partial koLive round is ignored (projection kept)', () => {
  const koLive: KoLive = { ...emptyKoLive(), R32: fullR32().slice(0, 8) }; // 8 of 16 → partial
  const b = buildBracket({ results: {}, teams: TEAMS, koLive });
  const proj = buildBracket({ results: {}, teams: TEAMS });

  // the projection is untouched: same pairing, no feed score carried.
  expect(b.r32[0].a).toBe(proj.r32[0].a);
  expect(b.r32[0].b).toBe(proj.r32[0].b);
  expect(b.r32[0].w).toBe(proj.r32[0].w);
  expect(b.r32[0].played).toBeUndefined();
});
