/* World Cup HQ — GROUPS page: four live standings tables + results */

function GroupTable({ g, onTeam, onMatch, people, wide }) {
  const W = window.WCHQ;
  const rows = W.table(g);
  const results = W.GROUP_RESULTS[g] || [];
  return (
    <div className="sticker" style={{ padding: 0, overflow: "hidden" }}>
      {/* header */}
      <div className="head" style={{ background: "var(--ink)", color: "var(--cream)",
        padding: "10px 16px", fontSize: 18, letterSpacing: "1px",
        display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ background: "var(--sun)", color: "var(--ink)", width: 30, height: 30,
          borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>{g}</span>
        GROUP {g}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#7fa8e6" }}>● LIVE</span>
      </div>

      {/* column heads */}
      <div style={{ display: "grid", gridTemplateColumns: "26px 1fr 26px 26px 26px 34px 34px",
        gap: 4, padding: "7px 12px", fontFamily: "var(--head)", fontSize: 11, opacity: .6,
        background: "var(--cream2)" }}>
        <span></span><span>TEAM</span><span style={{ textAlign: "center" }}>W</span>
        <span style={{ textAlign: "center" }}>D</span><span style={{ textAlign: "center" }}>L</span>
        <span style={{ textAlign: "center" }}>GD</span><span style={{ textAlign: "center" }}>PTS</span>
      </div>

      {/* rows */}
      {rows.map((r, i) => {
        const dead = W.ELIMINATED.includes(r.code);
        const leader = i === 0 && !dead;
        const gd = r.gf - r.ga;
        return (
          <div key={r.code} className="tap" onClick={() => onTeam(r.code)}
            style={{ display: "grid", gridTemplateColumns: "26px 1fr 26px 26px 26px 34px 34px",
              gap: 4, alignItems: "center", padding: "9px 12px",
              borderTop: "2px solid rgba(27,42,74,.08)",
              background: leader ? "rgba(255,210,63,.28)" : dead ? "#f1ece0" : "var(--cream)",
              opacity: dead ? .62 : 1 }}>
            <span className="head" style={{ fontSize: 14, textAlign: "center" }}>{leader ? "👑" : i + 1}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <Flag code={r.code} knocked={dead} style={{ width: 24, height: 17 }} />
              <span className="head" style={{ fontSize: 14, textDecoration: dead ? "line-through" : "none" }}>
                {r.code}</span>
              <OwnerIcons code={r.code} people={people} size={15} max={2} />
            </span>
            <span style={{ textAlign: "center", fontWeight: 700, fontSize: 13 }}>{r.w}</span>
            <span style={{ textAlign: "center", fontWeight: 700, fontSize: 13 }}>{r.d}</span>
            <span style={{ textAlign: "center", fontWeight: 700, fontSize: 13 }}>{r.l}</span>
            <span style={{ textAlign: "center", fontWeight: 700, fontSize: 13 }}>{gd > 0 ? "+" + gd : gd}</span>
            <span className="head" style={{ textAlign: "center", fontSize: 17 }}>{r.pts}</span>
          </div>
        );
      })}

      {/* results strip — tap a result for the match card */}
      <div style={{ background: "var(--ink)", padding: "9px 12px", display: "flex",
        flexWrap: "wrap", gap: 8 }}>
        {results.map((m, i) => (
          <span key={i} className="head tap" onClick={() => onMatch({ a: m.a, b: m.b, label: "Group " + g,
            played: true, score: [m.as, m.bs], winner: m.as > m.bs ? m.a : m.bs > m.as ? m.b : null })}
            style={{ fontSize: 12, color: "var(--cream)", background: "rgba(255,255,255,.08)",
              border: "2px solid #2c3f66", borderRadius: 8, padding: "3px 8px" }}>
            {m.a} <span style={{ color: "var(--sun)" }}>{m.as}–{m.bs}</span> {m.b}
          </span>
        ))}
      </div>
    </div>
  );
}

function GroupsPage() {
  const app = useApp();
  const wide = app.wide;
  const W = window.WCHQ;
  const { people } = useStoreState();
  const [team, setTeam] = React.useState(null);
  const [match, setMatch] = React.useState(null);
  const groups = Object.keys(W.GROUPS);

  return (
    <React.Fragment>
      <PageTitle sub="👑 = leader · tap a score for the match · faded = out" accent="var(--mint)">GROUPS</PageTitle>
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: wide ? "1fr 1fr" : "1fr" }}>
        {groups.map((g) => (
          <GroupTable key={g} g={g} onTeam={setTeam} onMatch={setMatch} people={people} wide={wide} />
        ))}
      </div>
      {team && <TeamPopup code={team} onClose={() => setTeam(null)} onPerson={app.openPerson} />}
      {match && <MatchPopup match={match} people={people} onClose={() => setMatch(null)}
        onTeam={(c) => { setMatch(null); setTeam(c); }} />}
    </React.Fragment>
  );
}

Object.assign(window, { GroupsPage, GroupTable });
