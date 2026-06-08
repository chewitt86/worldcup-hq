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
import { STANDINGS, ELIMINATED } from '../data/tournament';

/* ---- types ---- */
export const STAGES = ['R32', 'R16', 'QF', 'SF', 'Final'] as const;
export type Stage = (typeof STAGES)[number];

export interface Tie {
  a: string;
  b: string;
  w: string;
}

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
}

/* ---- odds → number (lower odds = stronger). Reads the supplied teams map so
   that live odds edits (teamEdits) re-seed the bracket. ---- */
function oddsNum(code: string, teams: Record<string, Team>): number {
  const o = (teams[code] && teams[code].odds) || '999/1';
  return parseInt(o.split('/')[0], 10) || 999;
}

/* knockout seeding strength: seed by odds (favourites on top), with the group
   points as a tie-breaker; eliminated teams sink to the bottom seeds so they
   lose in the Round of 32. Identical to the prototype's `strength`. */
export function strength(code: string, teams: Record<string, Team> = TEAMS): number {
  if (ELIMINATED.includes(code)) return -2000 - oddsNum(code, teams);
  const pts = STANDINGS[code] ? STANDINGS[code].pts : 0;
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
export function mkTies(pairs: [string, string][], teams: Record<string, Team> = TEAMS): Tie[] {
  return pairs.map((p) => ({
    a: p[0],
    b: p[1],
    w: strength(p[0], teams) >= strength(p[1], teams) ? p[0] : p[1],
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
): string {
  const r = results[`${stage}:${i}`];
  if (r && r.played) return r.score[0] >= r.score[1] ? a : b;
  return strength(a, teams) >= strength(b, teams) ? a : b;
}

/* Winners of one round paired up into the next round's match-ups. */
function nextPairs(ties: Tie[]): [string, string][] {
  const w = ties.map((t) => t.w);
  const out: [string, string][] = [];
  for (let i = 0; i < w.length; i += 2) out.push([w[i], w[i + 1]]);
  return out;
}

/* Build a full R32 → Final bracket. Seeds all 32 teams by `strength` (odds
   weighted; eliminated sink to the bottom), pairs them via `seedOrder`, then for
   each round resolves every tie from saved results (if played) or projection, and
   propagates the ACTUAL winners into the next round. */
export function buildBracket(state: BracketState): Bracket {
  const { results, teams } = state;

  // seed1 = index 0 (strongest first)
  const seeds = Object.keys(teams).sort((a, b) => strength(b, teams) - strength(a, teams));
  const order = seedOrder(32);

  const r32pairs: [string, string][] = [];
  for (let i = 0; i < 32; i += 2) {
    r32pairs.push([seeds[order[i] - 1], seeds[order[i + 1] - 1]]);
  }

  const buildRound = (pairs: [string, string][], stage: Stage): Tie[] =>
    pairs.map(([a, b], i) => ({ a, b, w: tieWinner(a, b, stage, i, results, teams) }));

  const r32 = buildRound(r32pairs, 'R32');
  const r16 = buildRound(nextPairs(r32), 'R16');
  const qf = buildRound(nextPairs(r16), 'QF');
  const sf = buildRound(nextPairs(qf), 'SF');
  const final = buildRound(nextPairs(sf), 'Final')[0];

  return { r32, r16, qf, sf, final, champ: final.w, seeds };
}

/* Odds-only projection (no saved results). Faithful port of the prototype's
   `bracketFull`, expressed via buildBracket with an empty results map. */
export function bracketFull(teams: Record<string, Team> = TEAMS): Bracket {
  return buildBracket({ results: {}, teams });
}
