import { describe, expect, test } from 'vitest';
import { TEAMS, PEOPLE, TICKER, NEXTUP, KICKOFF } from './teams';

describe('teams data', () => {
  test('48 teams in total', () => {
    expect(Object.keys(TEAMS)).toHaveLength(48);
  });

  test('META titles + facts applied to a team', () => {
    expect(TEAMS.BRA.titles).toBe('5× Winners');
    expect(TEAMS.BRA.fact).toBe('Famous for samba football and the golden shirt.');
  });

  test('squad URLs use FIFA slug logic', () => {
    expect(TEAMS.KOR.squad).toBe(
      'https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/teams/korea-republic/squad',
    );
  });
});

describe('people/ticker/next-up/kickoff', () => {
  test('PEOPLE has 6 entries', () => {
    expect(PEOPLE).toHaveLength(6);
  });

  test('Leo backs BRA, NED, JPN with JPN out', () => {
    const leo = PEOPLE.find((p) => p.id === 'leo')!;
    expect(leo.teams).toEqual(['BRA', 'NED', 'JPN']);
    expect(leo.out).toContain('JPN');
  });

  test('KICKOFF equals the opening-match timestamp', () => {
    expect(KICKOFF).toBe(new Date('2026-06-11T20:00:00').getTime());
  });

  test('TICKER and NEXTUP ported', () => {
    expect(TICKER).toHaveLength(8);
    expect(NEXTUP).toHaveLength(3);
  });
});
