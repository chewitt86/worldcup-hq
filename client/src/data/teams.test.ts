import { describe, expect, test } from 'vitest';
import { TEAMS, PEOPLE, TICKER, NEXTUP, KICKOFF, WORST_TEAMS } from './teams';

describe('best / worst pots + rankings', () => {
  test('exactly 24 worst teams, all real', () => {
    expect(WORST_TEAMS).toHaveLength(24);
    expect(new Set(WORST_TEAMS).size).toBe(24);
    for (const c of WORST_TEAMS) expect(TEAMS[c]?.worst, c).toBe(true);
  });

  test('every team carries a world ranking and a worst flag', () => {
    for (const c of Object.keys(TEAMS)) {
      expect(typeof TEAMS[c].worldRanking, c).toBe('number');
      expect(typeof TEAMS[c].worst, c).toBe('boolean');
    }
  });

  test('each player has exactly one best + one worst, and best is the best-pot team', () => {
    for (const p of PEOPLE) {
      const worsts = p.teams.filter((c) => TEAMS[c].worst);
      expect(worsts.length, p.name).toBe(1);
      expect(TEAMS[p.best].worst, `${p.name} best`).toBe(false);
    }
  });
});

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

describe('the family draw', () => {
  test('24 players, each drawing 2 teams', () => {
    expect(PEOPLE).toHaveLength(24);
    for (const p of PEOPLE) expect(p.teams).toHaveLength(2);
  });

  test('covers all 48 teams exactly once', () => {
    const drawn = PEOPLE.flatMap((p) => p.teams);
    expect(drawn).toHaveLength(48);
    expect(new Set(drawn).size).toBe(48);
    expect(new Set(drawn)).toEqual(new Set(Object.keys(TEAMS)));
  });

  test('every drawn code is a real team and best is one of the pair', () => {
    for (const p of PEOPLE) {
      for (const code of p.teams) expect(TEAMS[code], `${p.name} → ${code}`).toBeDefined();
      expect(p.teams).toContain(p.best);
    }
  });

  test('player ids are unique', () => {
    const ids = PEOPLE.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('Leo drew Türkiye + Canada (best-pot team first)', () => {
    const leo = PEOPLE.find((p) => p.id === 'leo')!;
    expect(leo.teams).toEqual(['TUR', 'CAN']);
    expect(leo.best).toBe('TUR');
  });
});

describe('ticker/next-up/kickoff', () => {
  test('KICKOFF equals the opening-match timestamp', () => {
    expect(KICKOFF).toBe(new Date('2026-06-11T20:00:00').getTime());
  });

  test('TICKER and NEXTUP ported', () => {
    expect(TICKER).toHaveLength(8);
    expect(NEXTUP).toHaveLength(3);
  });
});
