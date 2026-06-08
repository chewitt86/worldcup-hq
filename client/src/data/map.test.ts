import { describe, expect, test } from 'vitest';
import { VENUES, HOME, lonLatXY, stageRoutes, teamGames, koGame } from './map';

describe('map data', () => {
  test('16 host venues, 32 team homes', () => {
    expect(Object.keys(VENUES)).toHaveLength(16);
    expect(Object.keys(HOME)).toHaveLength(32);
  });

  test('lonLatXY maps the corners of the equirectangular plane', () => {
    expect(lonLatXY(-180, 90)).toEqual({ x: 0, y: 0 });
    expect(lonLatXY(180, -90)).toEqual({ x: 1, y: 1 });
  });

  test("teamGames('BRA','Groups') has 3 fixtures with cities", () => {
    const games = teamGames('BRA', 'Groups');
    expect(games).toHaveLength(3);
    games.forEach((g) => {
      expect(typeof g.opp).toBe('string');
      expect(typeof g.city).toBe('string');
    });
  });

  test("stageRoutes('R32') returns 16 matches", () => {
    const sr = stageRoutes('R32');
    expect(sr.matches).toHaveLength(16);
  });

  test('koGame overlays a saved result when present', () => {
    const base = koGame('R32', 0);
    expect(base.played).toBe(false);
    expect(base.score).toBeNull();

    const overlaid = koGame('R32', 0, { 'R32:0': { score: [2, 1], played: true } });
    expect(overlaid.played).toBe(true);
    expect(overlaid.score).toEqual([2, 1]);
  });
});
