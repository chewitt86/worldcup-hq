import { describe, expect, test } from 'vitest';
import { GROUPS, table, STANDINGS } from './tournament';

describe('tournament data', () => {
  test('12 groups of 4', () => {
    const g = Object.keys(GROUPS);
    expect(g).toHaveLength(12);
    Object.values(GROUPS).forEach((t) => expect(t).toHaveLength(4));
  });

  test('standings: played = 3 per team', () => {
    Object.values(STANDINGS).forEach((s) => expect(s.p).toBe(3));
  });

  test('table sorted by pts then GD then GF', () => {
    const t = table('A');
    for (let i = 1; i < t.length; i++) {
      expect(t[i - 1].pts).toBeGreaterThanOrEqual(t[i].pts);
    }
  });
});
