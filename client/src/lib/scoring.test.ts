import { describe, expect, test } from 'vitest';
import type { Bracket } from './bracket';
import type { ScoreCtx } from './scoring';
import { teamPoints, compareTeams, bestOfWorst, playerTotal, started } from './scoring';
import type { Standing } from '../data/tournament';
import { TEAMS, PEOPLE, WORST_TEAMS } from '../data/teams';

const st = (w = 0, d = 0, gf = 0, ga = 0): Standing => ({ p: w + d, w, d, l: 0, gf, ga, pts: w * 3 + d });
const bracket = (o: Partial<Bracket> = {}): Bracket =>
  ({ r32: [], r16: [], qf: [], sf: [], final: { a: '', b: '', w: '' }, champ: '', seeds: [], ...o });
const mk = (standings: Record<string, Standing>, b: Bracket): ScoreCtx =>
  ({ teams: TEAMS, standings, bracket: b });
/* a played knockout tie (the only kind that counts towards points/progression) */
const ko = (a: string, b: string, w: string) => ({ a, b, w, as: null, bs: null, pen: null, played: true });

describe('scoring', () => {
  test('teamPoints = 3*wins + 1*draws across the group stage', () => {
    const ctx = mk({ BRA: st(2, 1) }, bracket());
    expect(teamPoints('BRA', ctx)).toBe(7);
  });

  test('played knockout wins add 3 points each (projected ties do not)', () => {
    const b = bracket({ sf: [ko('BRA', 'X', 'BRA')], final: ko('BRA', 'Y', 'BRA') });
    const ctx = mk({ BRA: st(3, 0) }, b); // 3 group wins + 2 played ko wins = 5 wins
    expect(teamPoints('BRA', ctx)).toBe(15);
    // an UNplayed (projected) final win must NOT score
    const proj = bracket({ final: { a: 'BRA', b: 'Y', w: 'BRA' }, champ: 'BRA' });
    expect(teamPoints('BRA', mk({ BRA: st(3, 0) }, proj))).toBe(9);
  });

  test('while live, ranking is by points (winner above loser)', () => {
    const ctx = mk({ BRA: st(2), ARG: st(1) }, bracket());
    expect(compareTeams('BRA', 'ARG', ctx)).toBeLessThan(0);
  });

  test('once finished, the deeper knockout team ranks higher despite fewer points', () => {
    // CRO qualified and won R32/R16/QF/SF (reached the final), then lost it.
    const b = bracket({
      r32: [ko('CRO', 'a', 'CRO')], r16: [ko('CRO', 'b', 'CRO')], qf: [ko('CRO', 'c', 'CRO')],
      sf: [ko('CRO', 'd', 'CRO')], final: ko('CRO', 'Z', 'Z'), champ: 'Z',
    });
    const ctx = mk({ CRO: st(0), JPN: st(3) }, b); // JPN has more group points but didn't qualify
    expect(compareTeams('CRO', 'JPN', ctx)).toBeLessThan(0);
  });

  test('bestOfWorst is null before the competition starts', () => {
    expect(bestOfWorst(WORST_TEAMS, mk({}, bracket()), false)).toBeNull();
  });

  test('bestOfWorst picks the leading worst-pot team', () => {
    expect(bestOfWorst(WORST_TEAMS, mk({ CAN: st(3) }, bracket()), true)).toBe('CAN');
  });

  test('playerTotal sums a player two teams', () => {
    const leo = PEOPLE.find((p) => p.id === 'leo')!; // TUR + CAN
    const ctx = mk({ TUR: st(2), CAN: st(1) }, bracket());
    expect(playerTotal(leo, ctx)).toBe(9); // 6 + 3
  });

  test('started flips on a played result or a passed kickoff', () => {
    expect(started({}, 9e15)).toBe(false);
    expect(started({}, 0)).toBe(true);
    expect(started({ 'A:0': { played: true } }, 9e15)).toBe(true);
  });
});
