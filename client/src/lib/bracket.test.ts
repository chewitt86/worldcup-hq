import { test, expect } from 'vitest';
import { buildBracket, qualifiers } from './bracket';
import { computeStandings } from '../data/tournament';
import { TEAMS } from '../data/teams';

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
