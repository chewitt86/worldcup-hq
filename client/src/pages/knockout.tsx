/* World Cup HQ — KNOCKOUT page: two-sided 32-team bracket on a pan/zoom
   canvas + owner icons per team + tap-a-game for kickoff (BST)/venue or score.
   Ported byte-for-byte from the prototype's home/page-knockout.jsx. The bracket
   is re-derived from buildBracket whenever the store's saved results or derived
   team display data (selectTeams) change, so admin odds-edits and entered
   knockout scores drive projection + advancement live. */

import { Fragment, useState, useRef, useCallback, useMemo } from 'react';
import { useApp } from '../app/context';
import { useStore, selectTeams } from '../store/store';
import type { Person, Team } from '../data/teams';
import { backers, ELIMINATED } from '../data/tournament';
import { buildBracket, type Tie } from '../lib/bracket';
import { koGame, type KoStage, type ResultsMap } from '../data/map';
import { Flag } from '../components/flag';
import { Avatar } from '../components/avatar';
import { PageTitle } from '../components/labels';
import { PanZoom, type PanZoomHandle } from '../components/panzoom';
import { TeamPopup } from './teams';

const KO_CONTENT_W = 1290, KO_CONTENT_H = 600;
function koDead(code: string) { return ELIMINATED.includes(code); }

/* a tapped game: which tie, at which round + index */
interface GameRef { tie: Tie; stage: KoStage; i: number }

/* bracket connector lines (geometry matches the column layout below) */
function KOConnectors() {
  const centers = (N: number) => Array.from({ length: N }, (_, i) => 50 + (i + 0.5) * (530 / N));
  const segs: number[][] = [];
  const pair = (cE: number, cYs: number[], pE: number, pYs: number[]) => {
    const midX = (cE + pE) / 2;
    pYs.forEach((py, k) => {
      const a = cYs[2 * k], b = cYs[2 * k + 1], my = (a + b) / 2;
      segs.push([cE, a, midX, a], [cE, b, midX, b], [midX, a, midX, b], [midX, my, pE, py]);
    });
  };
  pair(140, centers(8), 150, centers(4));
  pair(270, centers(4), 280, centers(2));
  pair(408, centers(2), 418, centers(1));
  pair(1150, centers(8), 1140, centers(4));
  pair(1020, centers(4), 1010, centers(2));
  pair(882, centers(2), 872, centers(1));
  segs.push([546, centers(1)[0], 556, 300], [744, centers(1)[0], 734, 300]);
  return (
    <svg viewBox={`0 0 ${KO_CONTENT_W} ${KO_CONTENT_H}`} width={KO_CONTENT_W} height={KO_CONTENT_H}
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", zIndex: 0 }}>
      {segs.map((s, i) => <path key={i} d={`M${s[0]} ${s[1]} L${s[2]} ${s[3]}`}
        fill="none" stroke="#3a558f" strokeWidth="2.5" strokeLinecap="round" />)}
    </svg>
  );
}

/* sweepstake owner avatars for a team */
function OwnerIcons({
  code,
  people,
  size = 15,
  max = 2,
}: {
  code: string;
  people?: Person[];
  size?: number;
  max?: number;
}) {
  const list = backers(code, people);
  if (!list.length) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", flex: "0 0 auto" }}>
      {list.slice(0, max).map((p, i) => (
        <div key={p.id} style={{ marginLeft: i ? -6 : 0 }} title={p.name}>
          <Avatar person={p} size={size} ring={false} />
        </div>
      ))}
      {list.length > max && (
        <span className="head" style={{ marginLeft: 2, fontSize: 9, color: "#9fb2d4" }}>+{list.length - max}</span>
      )}
    </div>
  );
}

function TieCard({
  tie,
  stage,
  gi,
  onGame,
  people,
  big,
  teams,
  results,
}: {
  tie: Tie;
  stage: KoStage;
  gi: number;
  onGame: (g: GameRef) => void;
  people: Person[];
  big?: boolean;
  teams: Record<string, Team>;
  results: ResultsMap;
}) {
  const g = koGame(stage, gi, results);
  // prefer the tie's OWN koLive score when it carries a played feed result,
  // else fall back to the koGame/results overlay.
  const live = tie.played === true && tie.as != null && tie.bs != null;
  const sc = live ? ([tie.as, tie.bs] as [number, number]) : g.score;
  const played = live || (g.played && sc != null);
  const actualWin = played ? (sc![0] > sc![1] ? tie.a : sc![1] > sc![0] ? tie.b : tie.w) : tie.w;
  return (
    <div className="tap" onClick={() => onGame({ tie, stage, i: gi })}
      style={{ width: "100%", background: "#0c1838", border: "2px solid #2c4378",
      borderRadius: 10, overflow: "hidden", boxShadow: big ? "0 0 16px rgba(255,210,63,.4)" : "0 2px 0 rgba(0,0,0,.3)" }}>
      {[tie.a, tie.b].map((code, i) => {
        const win = !!code && actualWin === code, dead = koDead(code);
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: big ? "9px 11px" : "6px 8px",
            background: win ? "var(--sun)" : "transparent", borderTop: i ? "1px solid #1b2a4a" : "none", opacity: dead ? 0.5 : 1 }}>
            <Flag code={code} knocked={dead} style={{ width: big ? 30 : 22, height: big ? 21 : 15 }} />
            <span className="head" style={{ fontSize: big ? 16 : 13.5, color: win ? "var(--ink)" : "#d4ddf2" }}>
              {big ? (teams[code]?.name ?? (code || "TBD")) : (code || "TBD")}</span>
            <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
              <OwnerIcons code={code} people={people} size={big ? 20 : 15} />
              {played
                ? <span className="head" style={{ fontSize: big ? 16 : 13, color: win ? "var(--ink)" : "#d4ddf2" }}>{sc![i]}</span>
                : (win && <span style={{ fontSize: big ? 14 : 11, color: "var(--ink)" }}>✓</span>)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function RoundCol({
  label,
  ties,
  stage,
  offset = 0,
  onGame,
  people,
  width,
  teams,
  results,
}: {
  label: string;
  ties: Tie[];
  stage: KoStage;
  offset?: number;
  onGame: (g: GameRef) => void;
  people: Person[];
  width: number;
  teams: Record<string, Team>;
  results: ResultsMap;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width, flex: "0 0 auto", position: "relative", zIndex: 1 }}>
      <div className="head" style={{ textAlign: "center", color: "var(--cream)", fontSize: 12,
        letterSpacing: "1px", marginBottom: 10, opacity: .9 }}>{label}</div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-around", gap: 8 }}>
        {ties.map((t, i) => <TieCard key={i} tie={t} stage={stage} gi={offset + i} onGame={onGame}
          people={people} teams={teams} results={results} />)}
      </div>
    </div>
  );
}

function CenterCol({
  final,
  onGame,
  people,
  teams,
  results,
}: {
  final: Tie;
  onGame: (g: GameRef) => void;
  people: Person[];
  teams: Record<string, Team>;
  results: ResultsMap;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: 178, flex: "0 0 auto", position: "relative", zIndex: 1,
      justifyContent: "center", alignItems: "center", gap: 14 }}>
      <div className="head pill" style={{ color: "var(--ink)", background: "var(--sun)", fontSize: 14,
        letterSpacing: "1px", padding: "6px 22px", borderRadius: 999, border: "3px solid var(--ink)",
        boxShadow: "2px 3px 0 rgba(27,42,74,.6)" }}>★ FINAL ★</div>
      <TieCard tie={final} stage="F" gi={0} onGame={onGame} people={people} teams={teams} results={results} big />
      <div style={{ fontSize: 40, lineHeight: 1, animation: "wchq-bob 3.4s ease-in-out infinite",
        filter: "drop-shadow(0 4px 8px rgba(0,0,0,.4))" }}>🏆</div>
    </div>
  );
}

/* ---- game detail popup ---- */
function GameModal({
  game,
  onClose,
  onTeam,
  people,
  teams,
  results,
}: {
  game: GameRef;
  onClose: () => void;
  onTeam: (code: string) => void;
  people: Person[];
  teams: Record<string, Team>;
  results: ResultsMap;
}) {
  const { tie, stage, i } = game;
  const info = koGame(stage, i, results);
  const host = ({ USA: "USA", CAN: "Canada", MEX: "Mexico" } as Record<string, string>)[info.host];
  // prefer the tie's OWN koLive score when it carries a played feed result.
  const live = tie.played === true && tie.as != null && tie.bs != null;
  const sc = live ? ([tie.as, tie.bs] as [number, number]) : info.score;
  const played = live || (info.played && sc != null);
  const actualWin = played ? (sc![0] > sc![1] ? tie.a : sc![1] > sc![0] ? tie.b : tie.w) : tie.w;

  const TeamRow = ({ code }: { code: string }) => {
    const win = actualWin === code, dead = koDead(code);
    const owners = backers(code, people);
    return (
      <div className="tap" onClick={() => onTeam(code)}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12,
          border: "3px solid var(--ink)", background: win ? "var(--sun)" : "var(--cream)", opacity: dead ? .65 : 1 }}>
        <Flag code={code} knocked={dead} style={{ width: 40, height: 28, borderRadius: 5 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="head" style={{ fontSize: 17, lineHeight: 1 }}>{teams[code]?.name ?? (code || "TBD")}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3, flexWrap: "wrap" }}>
            {owners.length ? owners.map((p) => (
              <span key={p.id} style={{ display: "inline-flex", alignItems: "center", gap: 4,
                fontWeight: 700, fontSize: 11 }}>
                <Avatar person={p} size={16} ring={false} />{p.name}</span>
            )) : <span style={{ fontSize: 11, fontWeight: 700, opacity: .5 }}>Not in the sweepstake</span>}
          </div>
        </div>
        {win && <span className="head" style={{ fontSize: 12, color: "var(--ink)" }}>WINS ✓</span>}
      </div>
    );
  };

  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, zIndex: 80, background: "rgba(27,42,74,.5)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 18, backdropFilter: "blur(2px)" }}>
      <div onClick={(e) => e.stopPropagation()} className="sticker"
        style={{ width: "100%", maxWidth: 340, padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
          <span className="head pill" style={{ background: "var(--grape)", color: "#fff", fontSize: 13,
            padding: "5px 12px", borderRadius: 999, border: "2.5px solid var(--ink)" }}>{info.label}</span>
          <div className="tap" onClick={onClose} style={{ marginLeft: "auto", fontFamily: "var(--head)", fontSize: 20,
            width: 30, height: 30, borderRadius: "50%", border: "3px solid var(--ink)", display: "flex",
            alignItems: "center", justifyContent: "center" }}>×</div>
        </div>

        <TeamRow code={tie.a} />
        <div className="head" style={{ textAlign: "center", color: "var(--tomato)", fontSize: 16, margin: "6px 0" }}>
          {played ? `${sc![0]} – ${sc![1]}` : "VS"}</div>
        <TeamRow code={tie.b} />

        {/* kickoff / score panel */}
        <div style={{ marginTop: 14, background: "var(--cream2)", border: "3px solid var(--ink)", borderRadius: 14,
          padding: "11px 13px" }}>
          {played ? (
            <div className="head" style={{ fontSize: 15, textAlign: "center" }}>
              FULL-TIME · {sc![0]}–{sc![1]}{tie.pen ? ` · ${tie.pen} on pens` : ""}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ fontSize: 17 }}>📅</span>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{info.date} · {info.time}
                  <span style={{ color: "var(--tomato)", fontFamily: "var(--head)" }}> BST</span></span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ fontSize: 17 }}>📍</span>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{info.city}, {host}</span>
              </div>
            </div>
          )}
        </div>
        {!played && tie.w && teams[tie.w] && (
          <div style={{ textAlign: "center", fontWeight: 700, fontSize: 12, color: "var(--ink-soft)", marginTop: 10 }}>
            ✨ Projected winner: <span className="head">{teams[tie.w].name}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ChampionHero({
  champ,
  runnerUp,
  onTeam,
  teams,
}: {
  champ: string;
  runnerUp: string;
  onTeam: (code: string) => void;
  teams: Record<string, Team>;
}) {
  const t = teams[champ];
  // Before the knockout teams are known, show a "to be decided" hero, not a pick.
  if (!t) {
    return (
      <div className="sticker" style={{ position: "relative", padding: "16px 18px", overflow: "hidden",
        background: "radial-gradient(circle at 28% 18%, #2a3e72, #0c1838)", border: "4px solid var(--sun)",
        boxShadow: "0 0 26px rgba(255,210,63,.45), 5px 6px 0 rgba(0,0,0,.4)",
        display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ fontSize: 52, lineHeight: 1, animation: "wchq-bob 3.4s ease-in-out infinite",
          filter: "drop-shadow(0 4px 8px rgba(0,0,0,.4))" }}>🏆</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="head" style={{ color: "var(--sun)", fontSize: 12, letterSpacing: "1.5px" }}>WHO WILL WIN?</div>
          <div className="head" style={{ color: "#fff", fontSize: 22, marginTop: 5 }}>To be decided!</div>
          <div style={{ color: "#9fb2d4", fontWeight: 700, fontSize: 13, marginTop: 6 }}>
            The knockout bracket fills in once the group stage finishes. ⚽</div>
        </div>
      </div>
    );
  }
  return (
    <div className="sticker" style={{ position: "relative", padding: "16px 18px", overflow: "hidden",
      background: "radial-gradient(circle at 28% 18%, #2a3e72, #0c1838)", border: "4px solid var(--sun)",
      boxShadow: "0 0 26px rgba(255,210,63,.45), 5px 6px 0 rgba(0,0,0,.4)",
      display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ fontSize: 52, lineHeight: 1, animation: "wchq-bob 3.4s ease-in-out infinite",
        filter: "drop-shadow(0 4px 8px rgba(0,0,0,.4))" }}>🏆</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="head" style={{ color: "var(--sun)", fontSize: 12, letterSpacing: "1.5px" }}>PROJECTED CHAMPION</div>
        <div className="tap" onClick={() => onTeam(champ)}
          style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 5, flexWrap: "wrap" }}>
          <Flag code={champ} style={{ width: 42, height: 30, borderRadius: 6, boxShadow: "2px 2px 0 rgba(0,0,0,.4)" }} />
          <span className="head" style={{ color: "#fff", fontSize: 26, textShadow: "0 0 12px rgba(255,210,63,.7)" }}>{t.name}</span>
          <span className="head pill" style={{ color: "var(--ink)", background: "var(--sun)", fontSize: 13,
            padding: "4px 10px", borderRadius: 999, border: "2px solid var(--ink)" }}>{t.odds}</span>
        </div>
        <div style={{ color: "#9fb2d4", fontWeight: 700, fontSize: 13, marginTop: 6 }}>
          Beats {teams[runnerUp]?.name} in the final ✨</div>
      </div>
      {[[16, 20], [90, 26], [62, 80]].map((s, i) => (
        <span key={i} style={{ position: "absolute", left: s[0] + "%", top: s[1] + "%", fontSize: 13,
          animation: `wchq-ledpulse ${1 + i * .3}s ease-in-out infinite`, pointerEvents: "none" }}>✨</span>
      ))}
    </div>
  );
}

function Graveyard({
  onTeam,
  teams,
}: {
  onTeam: (code: string) => void;
  teams: Record<string, Team>;
}) {
  return (
    <div className="sticker" style={{ padding: 16, background: "#222b3d" }}>
      <div className="head" style={{ color: "var(--cream)", fontSize: 17, letterSpacing: ".5px",
        display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        🪦 THE GRAVEYARD
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#8aa0c8" }}>{ELIMINATED.length} teams out</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {ELIMINATED.map((c) => (
          <div key={c} className="tap" onClick={() => onTeam(c)}
            style={{ width: 90, textAlign: "center", padding: "12px 8px 9px", borderRadius: "12px 12px 8px 8px",
              background: "#171f2e", border: "3px solid #0c1320" }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>✝️</div>
            <Flag code={c} knocked style={{ width: 30, height: 21, margin: "0 auto 7px" }} />
            <div className="head" style={{ color: "#9fb2d4", fontSize: 13, textDecoration: "line-through" }}>
              {teams[c]?.name ?? c}</div>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#6f84ad", marginTop: 2 }}>R.I.P.</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function KnockoutPage() {
  const app = useApp();
  const wide = app.wide;
  const people = app.people;
  const results = useStore((s) => s.results);
  const teams = useStore(selectTeams);
  const koLive = useStore((s) => s.koLive);
  const [team, setTeam] = useState<string | null>(null);
  const [game, setGame] = useState<GameRef | null>(null);
  // re-derive when the store's results, live knockout feed or derived team
  // display data change; full koLive rounds drive real advancement, saved
  // knockout scores and odds-edits feed the projection
  const b = useMemo(() => buildBracket({ results, teams, koLive }), [results, teams, koLive]);
  const runnerUp = b.final.a === b.champ ? b.final.b : b.final.a;
  const tbd = !b.champ; // bracket not yet decided (group stage still to finish)
  const apiRef = useRef<PanZoomHandle | null>(null);
  const onReady = useCallback((api: PanZoomHandle) => { apiRef.current = api; }, []);
  const centers8 = Array.from({ length: 8 }, (_, i) => 50 + (i + 0.5) * (530 / 8));
  const jump = (code: string) => {
    const i = b.r32.findIndex((t) => t.a === code || t.b === code);
    if (i < 0 || !apiRef.current) return;
    apiRef.current.focusTo(i < 8 ? 80 : 1210, centers8[i < 8 ? i : i - 8], 1.5);
  };
  const teamOpts = Object.keys(teams).sort((x, y) => teams[x].name.localeCompare(teams[y].name));

  const half = (arr: Tie[]): [Tie[], Tie[]] => [arr.slice(0, arr.length / 2), arr.slice(arr.length / 2)];
  const [r32L, r32R] = half(b.r32);
  const [r16L, r16R] = half(b.r16);
  const [qfL, qfR] = half(b.qf);
  const [sfL, sfR] = half(b.sf);
  const wA = 120, wB = 128;
  const openTeam = (code: string) => { setGame(null); setTeam(code); };

  const bracket = (
    <div style={{ width: KO_CONTENT_W, height: KO_CONTENT_H, display: "flex", alignItems: "stretch",
      justifyContent: "center", gap: 10, padding: 20, boxSizing: "border-box", position: "relative" }}>
      <KOConnectors />
      <RoundCol label="ROUND OF 32" ties={r32L} stage="R32" offset={0} onGame={setGame} people={people} width={wA} teams={teams} results={results} />
      <RoundCol label="LAST 16" ties={r16L} stage="R16" offset={0} onGame={setGame} people={people} width={wA} teams={teams} results={results} />
      <RoundCol label="QUARTERS" ties={qfL} stage="QF" offset={0} onGame={setGame} people={people} width={wB} teams={teams} results={results} />
      <RoundCol label="SEMIS" ties={sfL} stage="SF" offset={0} onGame={setGame} people={people} width={wB} teams={teams} results={results} />
      <CenterCol final={b.final} onGame={setGame} people={people} teams={teams} results={results} />
      <RoundCol label="SEMIS" ties={sfR} stage="SF" offset={1} onGame={setGame} people={people} width={wB} teams={teams} results={results} />
      <RoundCol label="QUARTERS" ties={qfR} stage="QF" offset={2} onGame={setGame} people={people} width={wB} teams={teams} results={results} />
      <RoundCol label="LAST 16" ties={r16R} stage="R16" offset={4} onGame={setGame} people={people} width={wA} teams={teams} results={results} />
      <RoundCol label="ROUND OF 32" ties={r32R} stage="R32" offset={8} onGame={setGame} people={people} width={wA} teams={teams} results={results} />
    </div>
  );

  return (
    <Fragment>
      <PageTitle sub={tbd
        ? '🎟 teams qualify from the group stage — tap a game for kick-off & venue'
        : '✨ projected road to the final — tap a game for kick-off & venue'} accent="var(--grape)">
        KNOCKOUTS</PageTitle>

      <ChampionHero champ={b.champ} runnerUp={runnerUp} onTeam={setTeam} teams={teams} />

      {/* jump-to-team */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span className="head" style={{ color: "var(--cream)", fontSize: 13, letterSpacing: ".5px" }}>🔎 JUMP TO</span>
        <select value="" onChange={(e) => { if (e.target.value) jump(e.target.value); }}
          style={{ fontFamily: "var(--body)", fontWeight: 700, fontSize: 14, padding: "7px 10px", borderRadius: 11,
            border: "3px solid var(--ink)", background: "var(--cream)", color: "var(--ink)", cursor: "pointer", flex: 1, minWidth: 150 }}>
          <option value="">Pick a team…</option>
          {teamOpts.map((c) => (
            <option key={c} value={c}>{backers(c, people).length ? "⭐ " : ""}{teams[c].name}</option>
          ))}
        </select>
        <button onClick={() => apiRef.current && apiRef.current.fit()}
          style={{ fontFamily: "var(--head)", fontSize: 13, background: "var(--sun)", color: "var(--ink)",
            border: "3px solid var(--ink)", borderRadius: 11, padding: "7px 14px", cursor: "pointer",
            boxShadow: "2px 3px 0 rgba(27,42,74,.7)" }}>⟲ Fit</button>
      </div>

      <div className="sticker" style={{ padding: 0, overflow: "hidden", height: wide ? "64vh" : "58vh",
        minHeight: 340, background: "linear-gradient(180deg,#13204a,#1b2a4a)", border: "4px solid var(--ink)" }}>
        <PanZoom width={KO_CONTENT_W} height={KO_CONTENT_H} minScale={0.22} maxScale={2.6} onReady={onReady}>
          {bracket}
        </PanZoom>
      </div>
      <div className="head" style={{ textAlign: "center", color: "var(--cream)", fontSize: 12,
        opacity: .7, letterSpacing: ".5px" }}>drag to pan · scroll or pinch to zoom · tap a game for details</div>

      <Graveyard onTeam={setTeam} teams={teams} />

      {game && <GameModal game={game} people={people} teams={teams} results={results}
        onClose={() => setGame(null)} onTeam={openTeam} />}
      {team && <TeamPopup code={team} onClose={() => setTeam(null)} onPerson={app.openPerson} />}
    </Fragment>
  );
}

export { TieCard, RoundCol, CenterCol, GameModal, ChampionHero, Graveyard, OwnerIcons };
