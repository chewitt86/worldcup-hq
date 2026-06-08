/* World Cup HQ — odds-seeded knockout bracket with advancement from saved results.
   Ported from the prototype's data-tournament.js (strength/seedOrder/mkTies/
   bracketFull) into a typed, pure module (no window), then extended per the plan
   so that SAVED knockout results drive actual advancement round-by-round.

   The prototype only ever overrode the tapped tie's winner; here a saved, played
   result decides each tie (higher-scoring side wins) and that ACTUAL winner is
   propagated into the next round. Unplayed ties fall back to the odds-seeded
   projection (the stronger seed). All seeding values/logic are identical to the
   prototype. */

import { TEAMS, type Team } from '../data/teams';
import {
  GROUPS,
  ELIMINATED,
  computeStandings,
  table,
  oddsNum as groupOddsNum,
  type Standing,
} from '../data/tournament';
import type { KoLive, KoTie } from '../store/types';

/* ---- types ---- */
export const STAGES = ['R32', 'R16', 'QF', 'SF', 'Final'] as const;
export type Stage = (typeof STAGES)[number];

export interface Tie {
  a: string;
  b: string;
  w: string;
  /* present only when a koLive feed result drives this tie. */
  as?: number | null;
  bs?: number | null;
  pen?: string | null;
  played?: boolean;
}

/* The full count a round must report before its koLive array is authoritative. */
const ROUND_COUNT: Record<Stage, number> = { R32: 16, R16: 8, QF: 4, SF: 2, Final: 1 };

export interface Bracket {
  r32: Tie[];
  r16: Tie[];
  qf: Tie[];
  sf: Tie[];
  final: Tie;
  champ: string;
  seeds: string[];
}

/* A saved knockout result. `score` is [home, away] aligned to a tie's [a, b];
   only `played` results affect advancement. */
export interface SavedResult {
  score: [number, number];
  played: boolean;
}

export interface BracketState {
  results: Record<string, SavedResult>;
  teams: Record<string, Team>;
  /* live knockout ties from the feed; a round is only applied when it holds its
     full expected count (see ROUND_COUNT). Absent/partial rounds keep the
     projection. */
  koLive?: KoLive | null;
}

/* Map a feed KoTie onto a Tie: the winner is the higher-scoring side, or the
   penalty winner's code when level (or undecided). */
function mapKoTie(t: KoTie): Tie {
  const { a, b, as, bs, pen } = t;
  const w = (as as number) > (bs as number) ? a : (bs as number) > (as as number) ? b : (pen || '');
  return { a, b, w, as, bs, pen, played: t.played };
}

/* ---- odds → number (lower odds = stronger). Reads the supplied teams map so
   that live odds edits (teamEdits) re-seed the bracket. ---- */
function oddsNum(code: string, teams: Record<string, Team>): number {
  const o = (teams[code] && teams[code].odds) || '999/1';
  return parseInt(o.split('/')[0], 10) || 999;
}

/* knockout seeding strength: seed by odds (favourites on top), with the group
   points as a tie-breaker; eliminated teams sink to the bottom seeds so they
   lose in the Round of 32. Standings default to empty (pre-tournament, 0 pts),
   so seeding is purely odds-driven until group results land. */
export function strength(
  code: string,
  teams: Record<string, Team> = TEAMS,
  standings: Record<string, Standing> = {},
): number {
  if (ELIMINATED.includes(code)) return -2000 - oddsNum(code, teams);
  const pts = standings[code] ? standings[code].pts : 0;
  return (1000 - oddsNum(code, teams)) * 100 + pts;
}

/* Standard single-elimination seed order for a bracket of `n` slots
   (1 plays n, 2 plays n-1, …). Identical to the prototype's `seedOrder`. */
export function seedOrder(n: number): number[] {
  let s = [1];
  while (s.length < n) {
    const m = s.length * 2 + 1;
    const nx: number[] = [];
    s.forEach((x) => {
      nx.push(x, m - x);
    });
    s = nx;
  }
  return s;
}

/* Projected ties (winner = stronger seed). Faithful port of the prototype's
   `mkTies`; used for the odds-only projection (no saved results). */
export function mkTies(
  pairs: [string, string][],
  teams: Record<string, Team> = TEAMS,
  standings: Record<string, Standing> = {},
): Tie[] {
  return pairs.map((p) => ({
    a: p[0],
    b: p[1],
    w: strength(p[0], teams, standings) >= strength(p[1], teams, standings) ? p[0] : p[1],
  }));
}

/* Decide a single tie's winner: a saved, played result picks the higher-scoring
   side; otherwise fall back to the projected stronger seed. */
function tieWinner(
  a: string,
  b: string,
  stage: Stage,
  i: number,
  results: Record<string, SavedResult>,
  teams: Record<string, Team>,
  standings: Record<string, Standing>,
): string {
  const r = results[`${stage}:${i}`];
  if (r && r.played) return r.score[0] >= r.score[1] ? a : b;
  return strength(a, teams, standings) >= strength(b, teams, standings) ? a : b;
}

/* Winners of one round paired up into the next round's match-ups. */
function nextPairs(ties: Tie[]): [string, string][] {
  const w = ties.map((t) => t.w);
  const out: [string, string][] = [];
  for (let i = 0; i < w.length; i += 2) out.push([w[i], w[i + 1]]);
  return out;
}

/* The 32 Round-of-32 participants under the real 2026 rule: the top 2 of each of
   the 12 groups (24), PLUS the 8 best third-placed teams (all 12 third-placed
   teams ranked by pts → GD → GF → shorter odds, top 8 taken). Deterministic. */
export function qualifiers(standings: Record<string, Standing>): string[] {
  const top2: string[] = [];
  const thirds: { code: string; pts: number; gf: number; ga: number }[] = [];
  Object.keys(GROUPS).forEach((g) => {
    const rows = table(g, standings);
    top2.push(rows[0].code, rows[1].code);
    thirds.push(rows[2]);
  });
  const bestThirds = thirds
    .slice()
    .sort(
      (x, y) =>
        y.pts - x.pts ||
        (y.gf - y.ga) - (x.gf - x.ga) ||
        y.gf - x.gf ||
        groupOddsNum(x.code) - groupOddsNum(y.code),
    )
    .slice(0, 8)
    .map((r) => r.code);
  return [...top2, ...bestThirds];
}

/* Build a full R32 → Final bracket. Standings are computed from saved group
   results; the 32 qualifiers (top-2 + 8 best thirds) are seeded by `strength`
   (odds weighted + group points), paired via `seedOrder`, then each round
   resolves every tie from saved results (if played) or projection, and
   propagates the ACTUAL winners into the next round. Pre-tournament (no results)
   the 32 strongest-by-odds qualify and seed — the correct projection. */
export function buildBracket(state: BracketState): Bracket {
  const { results, teams, koLive } = state;
  const standings = computeStandings(results);

  // the 32 qualifiers, ordered strongest-first (seed1 = index 0)
  const seeds = qualifiers(standings).sort(
    (a, b) => strength(b, teams, standings) - strength(a, teams, standings),
  );
  const order = seedOrder(32);

  const r32pairs: [string, string][] = [];
  for (let i = 0; i < 32; i += 2) {
    r32pairs.push([seeds[order[i] - 1], seeds[order[i + 1] - 1]]);
  }

  /* A round's koLive array, but only when it reports its FULL expected count;
     a partially-drawn round is treated as not-yet-available. */
  const liveRound = (stage: Stage): KoTie[] | null => {
    const arr = koLive ? koLive[stage] : null;
    return arr && arr.length === ROUND_COUNT[stage] ? arr : null;
  };

  /* Resolve one round: a full koLive round REPLACES the projection (real teams
     + scores, with the penalty winner advancing); otherwise build the
     projection from the pairs fed in from the previous round's winners. */
  const resolveRound = (pairs: [string, string][], stage: Stage): Tie[] => {
    const live = liveRound(stage);
    if (live) return live.map(mapKoTie);
    return pairs.map(([a, b], i) => ({ a, b, w: tieWinner(a, b, stage, i, results, teams, standings) }));
  };

  const r32 = resolveRound(r32pairs, 'R32');
  const r16 = resolveRound(nextPairs(r32), 'R16');
  const qf = resolveRound(nextPairs(r16), 'QF');
  const sf = resolveRound(nextPairs(qf), 'SF');
  const final = resolveRound(nextPairs(sf), 'Final')[0];

  return { r32, r16, qf, sf, final, champ: final.w, seeds };
}

/* Odds-only projection (no saved results). Faithful port of the prototype's
   `bracketFull`, expressed via buildBracket with an empty results map. */
export function bracketFull(teams: Record<string, Team> = TEAMS): Bracket {
  return buildBracket({ results: {}, teams });
}
