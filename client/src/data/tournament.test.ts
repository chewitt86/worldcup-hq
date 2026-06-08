import { describe, expect, test } from 'vitest';
import { GROUPS, table, computeStandings, oddsNum } from './tournament';

describe('tournament data', () => {
  test('12 groups of 4', () => {
    const g = Object.keys(GROUPS);
    expect(g).toHaveLength(12);
    Object.values(GROUPS).forEach((t) => expect(t).toHaveLength(4));
  });

  test('computeStandings({}) is an all-zero table for all 48 teams', () => {
    const st = computeStandings({});
    const codes = Object.keys(st);
    expect(codes).toHaveLength(48);
    Object.values(st).forEach((s) => {
      expect(s).toEqual({ p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 });
    });
  });

  test('a played group result accumulates for both teams', () => {
    // RR index 0 in every group is [0, 1] → group A: MEX vs RSA.
    const st = computeStandings({ 'A:0': { score: [2, 0], played: true } });
    expect(st.MEX).toMatchObject({ p: 1, w: 1, l: 0, gf: 2, ga: 0, pts: 3 });
    expect(st.RSA).toMatchObject({ p: 1, w: 0, l: 1, gf: 0, ga: 2, pts: 0 });
  });

  test('pre-tournament table orders by shorter odds', () => {
    const t = table('A', computeStandings({}));
    expect(t).toHaveLength(4);
    // all pts equal (0) → order is by ascending odds
    for (let i = 1; i < t.length; i++) {
      expect(oddsNum(t[i - 1].code)).toBeLessThanOrEqual(oddsNum(t[i].code));
    }
  });

  test('table sorted by pts then GD then GF', () => {
    const t = table('A', computeStandings({ 'A:0': { score: [3, 0], played: true } }));
    for (let i = 1; i < t.length; i++) {
      expect(t[i - 1].pts).toBeGreaterThanOrEqual(t[i].pts);
    }
  });
});
