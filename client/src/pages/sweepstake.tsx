/* World Cup HQ — SWEEPSTAKE page: podium + a card per player.
   Ported from home/page-sweepstake.jsx. Team data is read via the store's
   `selectTeams` selector so admin team-edits propagate live. */

import { Fragment, useMemo } from 'react';
import { type Person, WORST_TEAMS } from '../data/teams';
import { useApp } from '../app/context';
import { useStore, selectTeams } from '../store/store';
import { computeStandings } from '../data/tournament';
import { buildBracket, deepestRound, ROUND_LABEL } from '../lib/bracket';
import { rankTeams, rankPlayers, bestOfWorst, playerTotal, teamPoints, started } from '../lib/scoring';
import { Avatar } from '../components/avatar';
import { Flag } from '../components/flag';
import { PageTitle } from '../components/labels';
import { Podium } from '../components/podium';
import { TeamSpotlight } from '../components/team-spotlight';

/* a player is eliminated when they hold teams and every one is knocked out */
export function isEliminated(p: Person): boolean {
  return p.teams.length > 0 && p.teams.every((c) => p.out.includes(c));
}

function PersonCard({
  p,
  rank,
  total,
  onPerson,
  wide,
}: {
  p: Person;
  rank: number;
  total: number;
  onPerson: (p: Person) => void;
  wide: boolean;
}) {
  const { openTeam } = useApp();
  const T = useStore(selectTeams);
  const stillIn = p.teams.filter((c) => !p.out.includes(c));
  const dead = isEliminated(p);
  const medal = rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : null;
  const rankCol = ({ 1: "var(--sun)", 2: "#d7dde6", 3: "#f0b173" } as Record<number, string>)[rank];

  return (
    <div className="sticker tap" onClick={() => onPerson(p)}
      style={{ position: "relative", padding: wide ? "18px 20px" : "15px 16px",
        overflow: "hidden", background: dead ? "#f3ede0" : "var(--cream)" }}>
      {/* OUT stamp */}
      {dead && (
        <div style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none",
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="head" style={{ transform: "rotate(-11deg)", color: "var(--tomato)",
            border: "5px solid var(--tomato)", borderRadius: 14, padding: "8px 16px",
            fontSize: wide ? 26 : 21, letterSpacing: "1px", background: "rgba(255,253,243,.78)",
            boxShadow: "0 0 0 3px rgba(255,93,93,.25)", textAlign: "center", lineHeight: .95 }}>
            OUT OF THE<br />SWEEPSTAKE
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12, opacity: dead ? .5 : 1 }}>
        <div style={{ position: "relative", flex: "0 0 auto" }}>
          <Avatar person={p} size={wide ? 58 : 50} />
          <div className="head" style={{ position: "absolute", top: -8, left: -8, width: 26, height: 26,
            borderRadius: "50%", background: rankCol || "var(--cream2)", border: "3px solid var(--ink)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
            boxShadow: "1.5px 2px 0 rgba(27,42,74,.7)" }}>{rank}</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="head" style={{ fontSize: wide ? 22 : 19, lineHeight: 1,
            display: "flex", alignItems: "center", gap: 7 }}>
            {p.name}{medal && <span style={{ fontSize: 18 }}>{medal}</span>}
          </div>
          <div style={{ fontWeight: 700, fontSize: 12.5, opacity: .65, marginTop: 3 }}>
            ⭐ Best shot: {T[p.best]?.name || "—"} <span style={{ color: "var(--tomato)" }}>{T[p.best]?.odds || ""}</span>
          </div>
        </div>
        <div style={{ textAlign: "right", flex: "0 0 auto" }}>
          <div className="head" style={{ fontSize: wide ? 30 : 26, lineHeight: 1 }}>{total}</div>
          <div className="head" style={{ fontSize: 10, opacity: .55 }}>POINTS</div>
        </div>
      </div>

      {/* in / out split */}
      <div style={{ display: "flex", gap: 8, marginTop: 13, opacity: dead ? .55 : 1 }}>
        <div className="head" style={{ flex: 1, textAlign: "center", padding: "7px 0", borderRadius: 12,
          border: "3px solid var(--ink)", background: "var(--grass)", fontSize: 13 }}>
          ✅ {stillIn.length} STILL IN</div>
        <div className="head" style={{ flex: 1, textAlign: "center", padding: "7px 0", borderRadius: 12,
          border: "3px solid var(--ink)", background: "var(--tomato)", color: "#fff", fontSize: 13 }}>
          ❌ {p.out.length} KNOCKED OUT</div>
      </div>

      {/* team flag-chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 12, opacity: dead ? .55 : 1 }}>
        {p.teams.map((c) => (
          <span key={c} className="flagchip tap" title={`${c} — team info`}
            onClick={(e) => { e.stopPropagation(); openTeam(c); }}
            style={{ opacity: p.out.includes(c) ? .55 : 1,
            textDecoration: p.out.includes(c) ? "line-through" : "none" }}>
            <Flag code={c} knocked={p.out.includes(c)} />{c}
          </span>
        ))}
        {p.teams.length === 0 && <span style={{ fontSize: 12, fontWeight: 700, opacity: .5 }}>No teams drawn yet</span>}
      </div>
    </div>
  );
}

export function SweepstakePage() {
  const app = useApp();
  const people = app.people;
  const wide = app.wide;
  const settings = app.settings;
  const teams = useStore(selectTeams);
  const results = useStore((s) => s.results);
  const koLive = useStore((s) => s.koLive);
  const standings = useMemo(() => computeStandings(results), [results]);
  const bracket = useMemo(() => buildBracket({ results, teams, koLive }), [results, teams, koLive]);
  const ctx = { teams, standings, bracket };
  const isStarted = started(results, settings.kickoff);

  const ranked = useMemo(() => rankPlayers(people, ctx), [people, ctx]);
  const alive = ranked.filter((p) => !isEliminated(p)).length;

  const runnerCode = isStarted ? (rankTeams(Object.keys(teams), ctx)[3] ?? null) : null;
  const bowCode = bestOfWorst(WORST_TEAMS, ctx, isStarted);
  const sub = (code: string) => `${ROUND_LABEL[deepestRound(code, bracket)]} · ${teamPoints(code, ctx)} pts`;

  return (
    <Fragment>
      <PageTitle sub={`${alive} of ${people.length} still standing`}>SWEEPSTAKE</PageTitle>

      {/* Podium — top 3 TEAMS */}
      <div className="sticker" style={{ padding: wide ? "22px 24px 16px" : "18px 14px 12px",
        background: "linear-gradient(180deg,#13204a,#1b2a4a)", border: "4px solid var(--ink)" }}>
        <div className="head" style={{ color: "var(--sun)", fontSize: 15, letterSpacing: "1px",
          textAlign: "center", marginBottom: 14 }}>🏆 TOP OF THE TABLE 🏆</div>
        <Podium ctx={ctx} started={isStarted} />
      </div>

      {/* Runner-up + Best of the Worst */}
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: wide ? "1fr 1fr" : "1fr", marginTop: 4 }}>
        <TeamSpotlight title="🥈 RUNNER-UP (4TH)" accent="#d7dde6" code={runnerCode}
          subtitle={runnerCode ? sub(runnerCode) : undefined} />
        <TeamSpotlight title="🐐 BEST OF THE WORST" accent="var(--mint)" code={bowCode}
          subtitle={bowCode ? sub(bowCode) : undefined} />
      </div>

      {/* Cards — players ranked by their teams' combined points */}
      <div style={{ display: "grid", gap: 14,
        gridTemplateColumns: wide ? "1fr 1fr" : "1fr", marginTop: 4 }}>
        {ranked.map((p, i) => (
          <PersonCard key={p.id} p={p} rank={i + 1} total={playerTotal(p, ctx)}
            onPerson={app.openPerson} wide={wide} />
        ))}
      </div>

      <div className="head tap" onClick={() => app.go("Teams")}
        style={{ textAlign: "center", color: "var(--ink)", background: "var(--sun)",
          padding: "13px", borderRadius: 16, border: "4px solid var(--ink)", fontSize: 15,
          boxShadow: "4px 5px 0 rgba(27,42,74,.7)", marginTop: 4 }}>
        🌍 BROWSE ALL THE TEAMS →</div>
    </Fragment>
  );
}
