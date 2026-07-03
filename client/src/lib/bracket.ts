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
  GROUP_FIXTURES,
  ELIMINATED,
  computeStandings,
  table,
  oddsNum as groupOddsNum,
  type Standing,
} from '../data/tournament';
import type { KoLive, KoTie, Fixture } from '../store/types';

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
  /* present only when a real fixture drives this tie (kick-off ms + host city). */
  ts?: number | null;
  venue?: string;
}

/* The full count a round must report before its koLive array is authoritative. */
const ROUND_COUNT: Record<Stage, number> = { R32: 16, R16: 8, QF: 4, SF: 2, Final: 1 };

/* A raw knockout tie pulled from the fixtures feed, carrying real schedule data.
   The winner is decided later (in buildBracket) once teams/standings are known. */
export interface FxTie {
  a: string;
  b: string;
  as: number | null;
  bs: number | null;
  played: boolean;
  ts: number;
  venue: string;
}

/* Bucket the feed's knockout fixtures by stage, order each bucket by kick-off,
   and return ONLY fully-drawn rounds: a round whose tie count matches
   ROUND_COUNT[stage] and where every tie has both teams known. Partial/undrawn
   rounds are omitted so the odds projection fills them. The 'Third' place
   fixture has no bracket slot and is ignored (it is not a member of STAGES). */
export function fullKoRounds(fixtures: Fixture[] = []): Partial<Record<Stage, FxTie[]>> {
  const out: Partial<Record<Stage, FxTie[]>> = {};
  for (const stage of STAGES) {
    const rows = fixtures
      .filter((f) => f.stage === stage)
      .slice()
      .sort((x, y) => x.ts - y.ts);
    if (rows.length !== ROUND_COUNT[stage]) continue;
    if (!rows.every((f) => f.a && f.b)) continue;
    out[stage] = rows.map((f) => ({
      a: f.a, b: f.b, as: f.as, bs: f.bs, played: f.played, ts: f.ts, venue: f.venue,
    }));
  }
  return out;
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
  /* live knockout ties from the feed; a round is only applied when it holds its
     full expected count (see ROUND_COUNT). Absent/partial rounds keep the
     projection. */
  koLive?: KoLive | null;
  /* day-by-day schedule from the feed; fully-drawn knockout rounds here are the
     PRIMARY source for the bracket (real matchups, scores, dates, venues). */
  fixtures?: Fixture[];
}

/* Map a feed KoTie onto a Tie: the winner is the higher-scoring side, or the
   penalty winner's code when level (or undecided). */
function mapKoTie(t: KoTie): Tie {
  const { a, b, as, bs, pen } = t;
  const w = (as as number) > (bs as number) ? a : (bs as number) > (as as number) ? b : (pen || '');
  return { a, b, w, as, bs, pen, played: t.played };
}

/* Map a fixtures-derived FxTie onto a Tie. Only a played, decisive result sets a
   winner (the higher-scoring side); an unplayed or score-level tie has NO winner
   ('') so nothing is guessed and the next round stays TBD until real results land.
   The real ts/venue ride along for the schedule popup. */
function mapFxTie(t: FxTie): Tie {
  const decisive = t.played && t.as != null && t.bs != null && t.as !== t.bs;
  const w = decisive ? ((t.as as number) > (t.bs as number) ? t.a : t.b) : '';
  return { a: t.a, b: t.b, w, as: t.as, bs: t.bs, played: t.played, ts: t.ts, venue: t.venue };
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
   side; an unplayed tie has NO winner ('') — an advancement is never guessed. */
function tieWinner(
  a: string,
  b: string,
  stage: Stage,
  i: number,
  results: Record<string, SavedResult>,
): string {
  const r = results[`${stage}:${i}`];
  if (r && r.played) return r.score[0] >= r.score[1] ? a : b;
  return '';
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

/* Build a full R32 → Final bracket from REAL data only. R32 comes from the drawn
   fixtures (or koLive); each later round shows the ACTUAL winners advanced from
   the round before, and any slot whose feeding tie hasn't been played stays TBD.
   No odds projection is ever shown. The odds `strength`/`seedOrder` seeding is
   retained only to order the R32 participants when the feed hasn't drawn them. */
/* Every group round-robin game has a played score → the qualifiers are known. */
function groupStageComplete(results: BracketState['results']): boolean {
  for (const g of Object.keys(GROUP_FIXTURES)) {
    for (const fx of GROUP_FIXTURES[g]) {
      if (!results[fx.id] || !results[fx.id].played) return false;
    }
  }
  return true;
}

/* Does the feed carry a real (fully-drawn) knockout round? */
function hasRealKoLive(koLive: KoLive | null | undefined): boolean {
  if (!koLive) return false;
  return STAGES.some((s) => {
    const arr = koLive[s];
    return !!arr && arr.length === ROUND_COUNT[s] && arr.every((t) => t.a && t.b);
  });
}

/* A blank bracket: every slot "TBD". Used before the knockout teams are known. */
function tbdTies(n: number): Tie[] {
  return Array.from({ length: n }, () => ({ a: '', b: '', w: '' }));
}
function tbdBracket(): Bracket {
  return {
    r32: tbdTies(16), r16: tbdTies(8), qf: tbdTies(4), sf: tbdTies(2),
    final: { a: '', b: '', w: '' }, champ: '', seeds: [],
  };
}

export function buildBracket(state: BracketState): Bracket {
  const { results, teams, koLive, fixtures } = state;
  const standings = computeStandings(results);
  const koFx = fullKoRounds(fixtures);
  const hasFx = Object.keys(koFx).length > 0;

  /* Until the group stage finishes (so the qualifiers are real) — or the feed
     delivers an actual knockout draw via koLive or fixtures — the knockout teams
     aren't known. Show a blank/TBD bracket rather than an odds-based prediction. */
  if (!groupStageComplete(results) && !hasRealKoLive(koLive) && !hasFx) {
    return tbdBracket();
  }

  // the 32 qualifiers, ordered strongest-first (seed1 = index 0)
  const seeds = qualifiers(standings).sort(
    (a, b) => strength(b, teams, standings) - strength(a, teams, standings),
  );
  const order = seedOrder(32);

  const r32pairs: [string, string][] = [];
  for (let i = 0; i < 32; i += 2) {
    r32pairs.push([seeds[order[i] - 1], seeds[order[i + 1] - 1]]);
  }

  /* A round's koLive array, but only when it reports its FULL expected count
     AND every tie has both teams decided. */
  const liveRound = (stage: Stage): KoTie[] | null => {
    const arr = koLive ? koLive[stage] : null;
    if (!arr || arr.length !== ROUND_COUNT[stage]) return null;
    return arr.every((t) => t.a && t.b) ? arr : null;
  };

  /* Resolve one round. Precedence: a fully-drawn fixtures round (real matchups,
     scores, dates, venues) REPLACES everything; else a full koLive round; else
     the ACTUAL winners advanced from the previous round (unknown slots stay TBD —
     no odds projection is ever shown). */
  const resolveRound = (pairs: [string, string][], stage: Stage): Tie[] => {
    const fx = koFx[stage];
    if (fx) return fx.map((t) => mapFxTie(t));
    const live = liveRound(stage);
    if (live) return live.map(mapKoTie);
    return pairs.map(([a, b], i) => ({ a, b, w: tieWinner(a, b, stage, i, results) }));
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

/* Count a team's ACTUAL knockout wins — only ties that were played (from the
   live feed). Projected ties (no `played`) don't count, so points/progression
   only ever reflect real results. */
export function koWins(code: string, b: Bracket): number {
  let n = 0;
  for (const t of [...b.r32, ...b.r16, ...b.qf, ...b.sf, b.final]) if (t.w === code && t.played) n++;
  return n;
}

/* How far a team ACTUALLY got: 0 = didn't qualify, 1 = reached R32, then +1 per
   knockout win up to 6 = Champion. Based on real results, not the projection. */
export function deepestRound(code: string, b: Bracket): number {
  if (!code) return 0;
  const qualified = b.r32.some((t) => t.a === code || t.b === code);
  if (!qualified) return 0;
  return Math.min(6, 1 + koWins(code, b));
}

export const ROUND_LABEL: Record<number, string> = {
  0: 'Group stage',
  1: 'Round of 32',
  2: 'Round of 16',
  3: 'Quarter-final',
  4: 'Semi-final',
  5: 'Final',
  6: 'Champion! 🏆',
};
