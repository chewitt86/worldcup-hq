/* World Cup HQ — tournament data: 12 groups, round-robin fixtures, and standings
   COMPUTED from saved results, plus the small derived helpers
   (table/groupOf/backers/isAlive). Groups reflect the real 2026 World Cup final
   draw (48 teams / 12 groups). Pure, no window.

   Group results live in the SAME store `results` map as knockout results, keyed
   `"<GROUP>:<i>"` (e.g. "A:0".."A:5"). Standings are derived from those results,
   so an empty results map yields a correct all-zero pre-tournament table. */

import { TEAMS, PEOPLE, type Person } from './teams';

export interface Standing {
  p: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  pts: number;
}

export interface TableRow extends Standing {
  code: string;
}

/* A saved result (group or knockout). `score` is [home, away] aligned to the
   fixture's [a, b]; only `played` results affect standings. */
export interface SavedResult {
  score: [number, number];
  played: boolean;
}

/* ---- 12 groups of 4 (real 2026 final-draw line-ups) ---- */
export const GROUPS: Record<string, string[]> = {
  A: ['MEX', 'RSA', 'KOR', 'CZE'],
  B: ['CAN', 'BIH', 'QAT', 'SUI'],
  C: ['BRA', 'MAR', 'HAI', 'SCO'],
  D: ['USA', 'PAR', 'AUS', 'TUR'],
  E: ['GER', 'CUW', 'CIV', 'ECU'],
  F: ['NED', 'JPN', 'SWE', 'TUN'],
  G: ['BEL', 'EGY', 'IRN', 'NZL'],
  H: ['ESP', 'CPV', 'KSA', 'URU'],
  I: ['FRA', 'SEN', 'IRQ', 'NOR'],
  J: ['ARG', 'ALG', 'AUT', 'JOR'],
  K: ['POR', 'COD', 'UZB', 'COL'],
  L: ['ENG', 'CRO', 'GHA', 'PAN'],
};

/* ---- teams knocked OUT so far. Clean slate at kick-off; eliminations are
   tracked per-person (Person.out), not statically here. ---- */
export const ELIMINATED: string[] = [];

export function oddsNum(code: string): number {
  const o = (TEAMS[code] && TEAMS[code].odds) || '999/1';
  return parseInt(o.split('/')[0], 10) || 999;
}

/* round-robin pairing order (4 teams → 6 matches) */
export const RR: [number, number][] = [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]];

/* ---- round-robin fixtures per group; id = `${group}:${i}` (i = RR index) ---- */
export const GROUP_FIXTURES: Record<string, { id: string; a: string; b: string }[]> = {};
Object.keys(GROUPS).forEach((g) => {
  const t = GROUPS[g];
  GROUP_FIXTURES[g] = RR.map(([i, j], k) => ({ id: `${g}:${k}`, a: t[i], b: t[j] }));
});

/* ---- compute standings from saved group results (pure). Initialises ALL 48
   teams to zero; only `played` fixtures accumulate. ---- */
export function computeStandings(results: Record<string, SavedResult>): Record<string, Standing> {
  const st: Record<string, Standing> = {};
  Object.keys(GROUPS).forEach((g) => {
    GROUPS[g].forEach((c) => {
      st[c] = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
    });
  });
  Object.keys(GROUP_FIXTURES).forEach((g) => {
    GROUP_FIXTURES[g].forEach((fx) => {
      const r = results[fx.id];
      if (!r || !r.played) return;
      const [as, bs] = r.score;
      const A = st[fx.a];
      const B = st[fx.b];
      A.p++;
      B.p++;
      A.gf += as;
      A.ga += bs;
      B.gf += bs;
      B.ga += as;
      if (as > bs) {
        A.w++;
        B.l++;
        A.pts += 3;
      } else if (as < bs) {
        B.w++;
        A.l++;
        B.pts += 3;
      } else {
        A.d++;
        B.d++;
        A.pts++;
        B.pts++;
      }
    });
  });
  return st;
}

export function isAlive(code: string): boolean {
  return !ELIMINATED.includes(code);
}

export function backers(code: string, people?: Person[]): Person[] {
  return (people || PEOPLE).filter((p) => p.teams.includes(code));
}

export function groupOf(code: string): string | undefined {
  return Object.keys(GROUPS).find((g) => GROUPS[g].includes(code));
}

const ZERO: Standing = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };

/* group table sorted by pts, then GD, then GF, then (tiebreak) shorter odds —
   so a pre-tournament all-zero table still orders by odds. */
export function table(g: string, standings: Record<string, Standing>): TableRow[] {
  return GROUPS[g]
    .map((c) => ({ code: c, ...(standings[c] || ZERO) }))
    .sort(
      (x, y) =>
        y.pts - x.pts ||
        (y.gf - y.ga) - (x.gf - x.ga) ||
        y.gf - x.gf ||
        oddsNum(x.code) - oddsNum(y.code),
    );
}
