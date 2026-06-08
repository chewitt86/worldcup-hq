/* World Cup HQ — tournament data: 12 groups, generated round-robin results and
   standings, plus the small derived helpers (table/groupOf/backers/isAlive).
   Groups reflect the real 2026 World Cup final draw (48 teams / 12 groups).
   The standings model is still generated from odds — pure, no window. */

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

export interface GroupResult {
  a: string;
  b: string;
  as: number;
  bs: number;
}

export interface TableRow extends Standing {
  code: string;
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

/* ---- teams knocked OUT so far (= union of everyone's sweepstake outs) ---- */
export const ELIMINATED: string[] = ['JPN', 'CAN', 'GHA', 'POR', 'GER'];

export function oddsNum(code: string): number {
  const o = (TEAMS[code] && TEAMS[code].odds) || '999/1';
  return parseInt(o.split('/')[0], 10) || 999;
}

// strength used to generate scores: lower odds = stronger; eliminated heavily penalised
export function scoreStrength(code: string): number {
  return -oddsNum(code) - (ELIMINATED.includes(code) ? 600 : 0);
}

/* ---- generate full round-robin results per group from strength ---- */
export function gscore(a: string, b: string): [number, number] {
  const d = scoreStrength(a) - scoreStrength(b);
  if (d > 300) return [3, 0];
  if (d > 120) return [2, 0];
  if (d > 30) return [2, 1];
  if (d > -30) return [1, 1];
  if (d > -120) return [1, 2];
  if (d > -300) return [0, 2];
  return [0, 3];
}

export const RR: [number, number][] = [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]];

export const GROUP_RESULTS: Record<string, GroupResult[]> = {};
Object.keys(GROUPS).forEach((g) => {
  const t = GROUPS[g];
  GROUP_RESULTS[g] = RR.map(([i, j]) => {
    const [as, bs] = gscore(t[i], t[j]);
    return { a: t[i], b: t[j], as, bs };
  });
});

/* ---- compute standings from those results ---- */
export const STANDINGS: Record<string, Standing> = {};
Object.keys(GROUPS).forEach((g) => {
  GROUPS[g].forEach((c) => (STANDINGS[c] = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }));
  GROUP_RESULTS[g].forEach((m) => {
    const A = STANDINGS[m.a];
    const B = STANDINGS[m.b];
    A.p++;
    B.p++;
    A.gf += m.as;
    A.ga += m.bs;
    B.gf += m.bs;
    B.ga += m.as;
    if (m.as > m.bs) {
      A.w++;
      B.l++;
      A.pts += 3;
    } else if (m.as < m.bs) {
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

export function isAlive(code: string): boolean {
  return !ELIMINATED.includes(code);
}

export function backers(code: string, people?: Person[]): Person[] {
  return (people || PEOPLE).filter((p) => p.teams.includes(code));
}

export function groupOf(code: string): string | undefined {
  return Object.keys(GROUPS).find((g) => GROUPS[g].includes(code));
}

export function table(g: string): TableRow[] {
  return GROUPS[g]
    .map((c) => ({ code: c, ...STANDINGS[c] }))
    .sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf);
}
