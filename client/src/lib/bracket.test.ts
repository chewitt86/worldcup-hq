import { test, expect } from 'vitest';
import { buildBracket } from './bracket';
import { TEAMS } from '../data/teams';

/* ---- seeding ---- */
test('shape', () => {
  const b = buildBracket({ results: {}, teams: TEAMS });
  expect(b.r32).toHaveLength(16);
  expect(b.r16).toHaveLength(8);
  expect(b.qf).toHaveLength(4);
  expect(b.sf).toHaveLength(2);
});

test('eliminated team is seeded out of the Round of 32', () => {
  // With 48 teams the bracket takes the strongest 32; eliminated teams sink to
  // the bottom seeds and so never reach the Round of 32 at all.
  const b = buildBracket({ results: {}, teams: TEAMS });
  const r32codes = b.r32.flatMap((t) => [t.a, t.b]);
  expect(r32codes).not.toContain('JPN');
});

/* ---- advancement from saved results (the improvement) ---- */
test('saved R32 upset advances the actual winner', () => {
  const b0 = buildBracket({ results: {}, teams: TEAMS });
  const tie = b0.r32[0];
  const underdog = tie.w === tie.a ? tie.b : tie.a;
  const score: [number, number] = tie.w === tie.a ? [0, 1] : [1, 0];
  const b = buildBracket({ results: { 'R32:0': { score, played: true } }, teams: TEAMS });
  expect(b.r32[0].w).toBe(underdog);
  expect(b.r16[0].a === underdog || b.r16[0].b === underdog).toBe(true);
});
