/* World Cup HQ — shared MatchPopup: a game's two teams + owners, and either
   the final score (played) or kick-off date/time (BST) + venue (upcoming). */

function MatchPopup({ match, onClose, onTeam, people }) {
  if (!match) return null;
  const W = window.WCHQ;
  const m = match;
  const hostName = { USA: "USA", CAN: "Canada", MEX: "Mexico" }[m.host] || m.host;

  const Row = ({ code, score }) => {
    const win = m.winner === code;
    const dead = W.ELIMINATED.includes(code);
    const owners = W.backers(code, people || []);
    return (
      <div className="tap" onClick={() => onTeam && onTeam(code)}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12,
          border: "3px solid var(--ink)", background: win ? "var(--sun)" : "var(--cream)", opacity: dead ? .65 : 1 }}>
        <Flag code={code} knocked={dead} style={{ width: 40, height: 28, borderRadius: 5 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="head" style={{ fontSize: 17, lineHeight: 1 }}>{W.TEAMS[code].name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3, flexWrap: "wrap" }}>
            {owners.length ? owners.map((p) => (
              <span key={p.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700, fontSize: 11 }}>
                <Avatar person={p} size={16} ring={false} />{p.name}</span>
            )) : <span style={{ fontSize: 11, fontWeight: 700, opacity: .5 }}>Not in the sweepstake</span>}
          </div>
        </div>
        {m.played && <span className="head" style={{ fontSize: 22 }}>{score}</span>}
        {!m.played && win && <span className="head" style={{ fontSize: 12 }}>WINS ✓</span>}
      </div>
    );
  };

  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, zIndex: 80, background: "rgba(27,42,74,.5)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 18, backdropFilter: "blur(2px)" }}>
      <div onClick={(e) => e.stopPropagation()} className="sticker" style={{ width: "100%", maxWidth: 340, padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
          <span className="head" style={{ background: m.played ? "var(--grass)" : "var(--grape)", color: "#fff",
            fontSize: 13, padding: "4px 12px", borderRadius: 999, border: "2.5px solid var(--ink)" }}>
            {m.label}{m.played ? " · FULL-TIME" : ""}</span>
          <div className="tap" onClick={onClose} style={{ marginLeft: "auto", fontFamily: "var(--head)", fontSize: 20,
            width: 30, height: 30, borderRadius: "50%", border: "3px solid var(--ink)", display: "flex",
            alignItems: "center", justifyContent: "center" }}>×</div>
        </div>

        <Row code={m.a} score={m.score ? m.score[0] : ""} />
        <div className="head" style={{ textAlign: "center", color: "var(--tomato)", fontSize: 16, margin: "6px 0" }}>
          {m.played ? `${m.score[0]} – ${m.score[1]}` : "VS"}</div>
        <Row code={m.b} score={m.score ? m.score[1] : ""} />

        {!m.played && (m.date || m.city) && (
          <div style={{ marginTop: 14, background: "var(--cream2)", border: "3px solid var(--ink)", borderRadius: 14, padding: "11px 13px",
            display: "flex", flexDirection: "column", gap: 7 }}>
            {m.date && (
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ fontSize: 17 }}>📅</span>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{m.date} · {m.time}
                  <span style={{ color: "var(--tomato)", fontFamily: "var(--head)" }}> BST</span></span>
              </div>
            )}
            {m.city && (
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ fontSize: 17 }}>📍</span>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{m.city}{hostName ? `, ${hostName}` : ""}</span>
              </div>
            )}
          </div>
        )}
        {!m.played && m.winner && (
          <div style={{ textAlign: "center", fontWeight: 700, fontSize: 12, color: "var(--ink-soft)", marginTop: 10 }}>
            ✨ Projected winner: <span className="head">{W.TEAMS[m.winner].name}</span></div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { MatchPopup });
