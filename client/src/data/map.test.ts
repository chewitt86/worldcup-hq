import { describe, expect, test } from 'vitest';
import { VENUES, HOME, lonLatXY, stageRoutes, teamGames, koGame, koTieInfo, CITY_HOST } from './map';
import type { Tie } from '../lib/bracket';

describe('map data', () => {
  test('16 host venues, 48 team homes', () => {
    expect(Object.keys(VENUES)).toHaveLength(16);
    expect(Object.keys(HOME)).toHaveLength(48);
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

  test('CITY_HOST maps host cities back to their host code', () => {
    expect(CITY_HOST['New York']).toBe('USA');
    expect(CITY_HOST['Toronto']).toBe('CAN');
    expect(CITY_HOST['Mexico City']).toBe('MEX');
  });

  test("koTieInfo prefers the tie's real ts/venue when present", () => {
    const tie: Tie = {
      a: 'ARG', b: 'FRA', w: 'ARG', as: null, bs: null, played: false,
      ts: Date.UTC(2026, 6, 4, 19, 0), venue: 'New York',
    };
    const info = koTieInfo(tie, 'R16', 0);
    expect(info.city).toBe('New York');
    expect(info.host).toBe('USA');
    expect(info.played).toBe(false);
    expect(info.date).toMatch(/4 Jul/);
    expect(info.time).toBe('20:00'); // 19:00 UTC -> 20:00 BST
  });

  test('koTieInfo carries the real score for a played tie', () => {
    const tie: Tie = {
      a: 'ARG', b: 'FRA', w: 'ARG', as: 3, bs: 2, played: true,
      ts: Date.UTC(2026, 6, 19, 18, 0), venue: 'New York',
    };
    const info = koTieInfo(tie, 'F', 0);
    expect(info.played).toBe(true);
    expect(info.score).toEqual([3, 2]);
  });

  test('koTieInfo falls back to koGame when the tie has no real fixture', () => {
    const tie: Tie = { a: 'ARG', b: 'FRA', w: 'ARG' };
    expect(koTieInfo(tie, 'R32', 0)).toEqual(koGame('R32', 0));
  });
});
