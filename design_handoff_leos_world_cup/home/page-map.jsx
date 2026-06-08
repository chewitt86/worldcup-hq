/* World Cup HQ — MAP page: stage tabs + team/person filters over the
   geographic WorldMap (defined in map-globe.jsx). */

const STAGES = [
  { id: "Groups", label: "⚽ Groups" },
  { id: "R32", label: "🎲 Last 32" },
  { id: "R16", label: "🎲 Last 16" },
  { id: "QF", label: "🥊 Quarters" },
  { id: "SF", label: "🔥 Semis" },
  { id: "F", label: "🏆 Final" },
];

function MapPage() {
  const app = useApp();
  const { people } = useStoreState();
  const W = window.WCHQ;
  const wide = app.wide;
  const [stage, setStage] = React.useState("Groups");
  const [selected, setSelected] = React.useState(null);
  const [personId, setPersonId] = React.useState(null);
  const [showAll, setShowAll] = React.useState(false);
  const [popup, setPopup] = React.useState(null);
  const [match, setMatch] = React.useState(null);

  const sr = React.useMemo(() => W.stageRoutes(stage), [stage]);
  const pool = sr.teams.slice().sort((a, b) => W.oddsNum(a) - W.oddsNum(b));
  const person = people.find((p) => p.id === personId);
  const chipTeams = person ? person.teams.filter((c) => pool.includes(c)) : pool;

  const shownTeams = showAll ? pool
    : (selected && pool.includes(selected)) ? [selected]
    : person ? chipTeams
    : (stage === "Groups" ? (pool.includes("BRA") ? ["BRA"] : pool.slice(0, 1)) : pool);

  const switchStage = (id) => { setStage(id); setSelected(null); setShowAll(false); setPersonId(null); };
  const onVenue = (vid) => { const v = W.VENUES[vid]; app.ping(`📍 ${v.city}, ${v.host}`); };

  // fixtures strip content
  const single = shownTeams.length === 1 ? shownTeams[0] : null;
  const stripRef = React.useRef(null);
  // when a team is explicitly picked (chip or map pin), bring its games into view
  React.useEffect(() => {
    if (!selected || !stripRef.current) return;
    const sc = stripRef.current.closest(".wchq-scroll");
    if (!sc) return;
    const dy = stripRef.current.getBoundingClientRect().top - sc.getBoundingClientRect().top;
    sc.scrollTop = sc.scrollTop + dy - 90;
  }, [selected, stage]);

  return (
    <React.Fragment>
      <PageTitle sub="🛫 home → where they actually play · pinch to zoom" accent="var(--blue)">WORLD MAP</PageTitle>

      {/* stage tabs */}
      <div className="noscroll" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
        {STAGES.map((s) => (
          <div key={s.id} className={"navpill tap" + (stage === s.id ? " active" : "")}
            style={{ fontSize: 13.5, flex: "0 0 auto" }} onClick={() => switchStage(s.id)}>{s.label}</div>
        ))}
      </div>

      {/* whose teams */}
      <div className="noscroll" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
        <div className={"navpill tap" + (!personId && !showAll && !selected ? " active" : "")}
          style={{ fontSize: 12.5, flex: "0 0 auto" }}
          onClick={() => { setPersonId(null); setSelected(null); setShowAll(false); }}>🌍 Default</div>
        <div className={"navpill tap" + (showAll ? " active" : "")} style={{ fontSize: 12.5, flex: "0 0 auto" }}
          onClick={() => { setShowAll((s) => !s); setSelected(null); setPersonId(null); }}>✨ Show all</div>
        {people.map((p) => (
          <div key={p.id} className={"navpill tap" + (personId === p.id ? " active" : "")}
            style={{ fontSize: 12.5, flex: "0 0 auto", display: "flex", alignItems: "center", gap: 6 }}
            onClick={() => { setPersonId(personId === p.id ? null : p.id); setSelected(null); setShowAll(false); }}>
            <Avatar person={p} size={18} ring={false} />{p.name}</div>
        ))}
      </div>

      {/* team chips */}
      <div className="noscroll" style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 2 }}>
        {chipTeams.map((c) => {
          const dead = W.ELIMINATED.includes(c);
          const on = !showAll && selected === c;
          return (
            <div key={c} className="flagchip tap" style={{ flex: "0 0 auto", opacity: dead ? .6 : 1,
              background: on ? "var(--sun)" : "var(--cream)", borderWidth: on ? 3 : 2.5 }}
              onClick={() => { setShowAll(false); setSelected(selected === c ? null : c); }}>
              <Flag code={c} knocked={dead} />{c}</div>
          );
        })}
        {chipTeams.length === 0 && <span style={{ color: "var(--cream)", fontWeight: 700, fontSize: 13, opacity: .7 }}>
          None of their teams reached this stage 😬</span>}
      </div>

      {/* the map */}
      <div className="sticker" style={{ padding: 6, overflow: "hidden", height: wide ? "62vh" : "56vh",
        minHeight: 320 }}>
        <WorldMap pool={pool} routeOf={sr.routeOf} shownTeams={shownTeams}
          onTeam={(c) => { setShowAll(false); setPersonId(null); setSelected(c); }}
          onVenue={onVenue} motion={app.motion !== false} />
      </div>

      {/* legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
        {[["USA", "#36a9ff"], ["CANADA", "#ff5d5d"], ["MEXICO", "#46b94a"]].map(([l, c]) => (
          <span key={l} className="head" style={{ display: "flex", alignItems: "center", gap: 6,
            color: "var(--cream)", fontSize: 12 }}>
            <span style={{ width: 13, height: 13, borderRadius: "50%", background: c, border: "2px solid var(--ink)" }} />{l}</span>
        ))}
        <span className="head" style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--cream)", fontSize: 12 }}>
          <span style={{ width: 20, height: 3, background: "var(--sun)", borderRadius: 2 }} />JOURNEY</span>
      </div>

      {/* fixtures strip */}
      {single ? (
        <div ref={stripRef} className="sticker" style={{ padding: "13px 15px" }}>
          <div className="head" style={{ fontSize: 15, display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Flag code={single} style={{ width: 26, height: 18 }} />{W.TEAMS[single].name.toUpperCase()}'S GAMES
            <span className="tap" onClick={() => setPopup(single)}
              style={{ marginLeft: "auto", fontSize: 11, fontFamily: "var(--head)", color: "#fff",
                background: "var(--blue)", border: "2.5px solid var(--ink)", borderRadius: 999,
                padding: "3px 10px" }}>ⓘ TEAM INFO</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {W.teamGames(single, stage).map((gm, i) => {
              const resCol = { W: "var(--grass2)", D: "var(--orange)", L: "var(--tomato)" }[gm.result];
              return (
                <div key={i} className="tap sticker-sm" style={{ background: "var(--cream)", padding: "9px 12px",
                  display: "flex", alignItems: "center", gap: 9 }}
                  onClick={() => setMatch({ a: single, b: gm.opp, label: gm.label, played: gm.played,
                    score: gm.score, date: gm.date, time: gm.time, city: gm.city, host: gm.host,
                    winner: gm.played ? (gm.result === "W" ? single : gm.result === "L" ? gm.opp : null)
                      : (W.strength(single) >= W.strength(gm.opp) ? single : gm.opp) })}>
                  <span style={{ fontSize: 11, fontWeight: 800, opacity: .5, width: 14 }}>v</span>
                  <Flag code={gm.opp} knocked={W.ELIMINATED.includes(gm.opp)} style={{ width: 28, height: 20 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="head" style={{ fontSize: 14, lineHeight: 1 }}>{W.TEAMS[gm.opp].name}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, opacity: .6, marginTop: 2,
                      display: "flex", alignItems: "center", gap: 4 }}>
                      📍 {gm.city}{gm.date ? ` · ${gm.date}` : ""}</div>
                  </div>
                  <OwnerIcons code={gm.opp} people={people} size={16} max={1} />
                  {gm.played
                    ? <span className="head" style={{ fontSize: 16, color: resCol }}>{gm.score[0]}–{gm.score[1]}</span>
                    : <span className="head" style={{ fontSize: 11, color: "var(--tomato)" }}>{gm.time} BST</span>}
                </div>
              );
            })}
          </div>
        </div>
      ) : stage !== "Groups" && (
        <div className="sticker" style={{ padding: "13px 15px" }}>
          <div className="head" style={{ fontSize: 15, marginBottom: 10 }}>
            {STAGES.find((s) => s.id === stage).label} · PROJECTED TIES</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sr.matches.map((m, i) => {
              const v = W.VENUES[m.venue];
              const info = W.koGame(stage, i);
              const winner = W.strength(m.a) >= W.strength(m.b) ? m.a : m.b;
              return (
                <div key={i} className="sticker-sm tap" onClick={() => setMatch({ a: m.a, b: m.b, label: info.label,
                  played: info.played, score: info.score, date: info.date, time: info.time, city: info.city, host: info.host, winner })}
                  style={{ background: "var(--cream)", padding: "8px 12px", display: "flex", alignItems: "center", gap: 7 }}>
                  <Flag code={m.a} style={{ width: 24, height: 17 }} />
                  <span className="head" style={{ fontSize: 14 }}>{m.a}</span>
                  <OwnerIcons code={m.a} people={people} size={14} max={1} />
                  <span className="head" style={{ fontSize: 12, color: "var(--tomato)" }}>v</span>
                  <OwnerIcons code={m.b} people={people} size={14} max={1} />
                  <span className="head" style={{ fontSize: 14 }}>{m.b}</span>
                  <Flag code={m.b} style={{ width: 24, height: 17 }} />
                  <span style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 700, opacity: .65 }}>📍 {v.city}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ textAlign: "center", color: "var(--cream)", fontWeight: 700, fontSize: 12.5, opacity: .7 }}>
        Tap a flag pin to open the team · tap a venue pin for the city
      </div>

      {popup && <TeamPopup code={popup} onClose={() => setPopup(null)} onPerson={app.openPerson} />}
      {match && <MatchPopup match={match} people={people} onClose={() => setMatch(null)}
        onTeam={(c) => { setMatch(null); setPopup(c); }} />}
    </React.Fragment>
  );
}

Object.assign(window, { MapPage, STAGES });
