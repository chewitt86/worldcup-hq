/* World Cup HQ — sweepstake scoring & ranking (pure, no state).
   Team points = 3 per win + 1 per draw, across the group stage AND the knockout.
   Live ranking is by points; once the final is decided the top finishers are
   ordered by their knockout finish. Ties break by wins → goal difference →
   goals for → knockout depth → better world ranking. */

import type { Bracket } from './bracket';
import { deepestRound, koWins } from './bracket';
import type { Standing } from '../data/tournament';
import type { Person, Team } from '../data/teams';

export interface ScoreCtx {
  teams: Record<string, Team>;
  standings: Record<string, Standing>;
  bracket: Bracket;
}

export function teamWins(code: string, ctx: ScoreCtx): number {
  const s = ctx.standings[code];
  return (s ? s.w : 0) + koWins(code, ctx.bracket);
}
export function teamDraws(code: string, ctx: ScoreCtx): number {
  return ctx.standings[code]?.d ?? 0;
}
export function teamGD(code: string, ctx: ScoreCtx): number {
  const s = ctx.standings[code];
  return s ? s.gf - s.ga : 0;
}
export function teamGF(code: string, ctx: ScoreCtx): number {
  return ctx.standings[code]?.gf ?? 0;
}

/* 3 per win + 1 per draw (group + knockout). */
export function teamPoints(code: string, ctx: ScoreCtx): number {
  return 3 * teamWins(code, ctx) + teamDraws(code, ctx);
}

/* The tournament is over only once the final has actually been played (a
   projected champion does not count). */
export function tournamentFinished(b: Bracket): boolean {
  return b.final.played === true && !!b.champ;
}

/* < 0 means `a` ranks above `b`. */
export function compareTeams(a: string, b: string, ctx: ScoreCtx): number {
  const da = deepestRound(a, ctx.bracket);
  const db = deepestRound(b, ctx.bracket);
  if (tournamentFinished(ctx.bracket) && da !== db) return db - da; // final result by knockout
  const pa = teamPoints(a, ctx), pb = teamPoints(b, ctx);
  if (pa !== pb) return pb - pa;
  const wa = teamWins(a, ctx), wb = teamWins(b, ctx);
  if (wa !== wb) return wb - wa;
  const gda = teamGD(a, ctx), gdb = teamGD(b, ctx);
  if (gda !== gdb) return gdb - gda;
  const gfa = teamGF(a, ctx), gfb = teamGF(b, ctx);
  if (gfa !== gfb) return gfb - gfa;
  if (da !== db) return db - da;
  const ra = ctx.teams[a]?.worldRanking ?? 999;
  const rb = ctx.teams[b]?.worldRanking ?? 999;
  return ra - rb; // better (lower) world ranking first
}

export function rankTeams(codes: string[], ctx: ScoreCtx): string[] {
  return [...codes].sort((a, b) => compareTeams(a, b, ctx));
}

/* The highest-ranked team among a subset (e.g. the "worst" pot), or null before
   the competition has started. */
export function bestOfWorst(worst: string[], ctx: ScoreCtx, isStarted: boolean): string | null {
  if (!isStarted) return null;
  return rankTeams(worst, ctx)[0] ?? null;
}

export function playerTotal(p: Person, ctx: ScoreCtx): number {
  return p.teams.reduce((sum, c) => sum + teamPoints(c, ctx), 0);
}

export function rankPlayers(people: Person[], ctx: ScoreCtx): Person[] {
  return [...people].sort((a, b) => {
    const ta = playerTotal(a, ctx), tb = playerTotal(b, ctx);
    if (ta !== tb) return tb - ta;
    const wa = a.teams.reduce((s, c) => s + teamWins(c, ctx), 0);
    const wb = b.teams.reduce((s, c) => s + teamWins(c, ctx), 0);
    if (wa !== wb) return wb - wa;
    return a.name.localeCompare(b.name);
  });
}

/* The player's furthest-progressing team (for the podium). */
export function furthestTeam(p: Person, ctx: ScoreCtx): string {
  return [...p.teams].sort((a, b) => compareTeams(a, b, ctx))[0] ?? p.best;
}

/* Has the tournament begun? (a played result, or kickoff has passed) */
export function started(results: Record<string, { played?: boolean }>, kickoff: number): boolean {
  if (results && Object.values(results).some((r) => r && r.played)) return true;
  const k = Number(kickoff);
  return Number.isFinite(k) && Date.now() >= k;
}
