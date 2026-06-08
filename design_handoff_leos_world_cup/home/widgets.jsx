/* World Cup HQ — composite widgets (exports to window) */

/* ---------- Top nav ---------- */
function TopNav({ active = "Home", device = "mobile", dark = false, onNav, onLogo, onAdmin }) {
  const items = ["Home", "Sweepstake", "Teams", "Groups", "Knockout", "Map"];
  const mobile = device === "mobile";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
      <div className="tap" onClick={() => onLogo && onLogo()}
        style={{ display: "flex", alignItems: "center", gap: 9, flex: "0 0 auto" }}>
        <div className="anim-bob"><Wobbles size={mobile ? 38 : 46} /></div>
        <div style={{ fontFamily: "var(--head)", lineHeight: .82,
          color: dark ? "var(--cream)" : "var(--ink)", fontSize: mobile ? 15 : 19,
          textShadow: dark ? "0 2px 0 rgba(0,0,0,.3)" : "none" }}>
          LEO'S<br />WORLD&nbsp;CUP
        </div>
      </div>
      <div className="noscroll" style={{ display: "flex", gap: 9, overflowX: "auto", flex: 1,
        justifyContent: mobile ? "flex-start" : "flex-end", padding: "4px 2px" }}>
        {items.map((it) => (
          <div key={it} className={"navpill tap" + (it === active ? " active" : "")}
            onClick={() => onNav && onNav(it)}>{it}</div>
        ))}
      </div>
      {onAdmin && (
        <div className={"navpill tap" + (active === "Admin" ? " active" : "")} onClick={onAdmin}
          title="Admin" style={{ flex: "0 0 auto", padding: mobile ? "9px 12px" : "9px 14px" }}>⚙️</div>
      )}
    </div>
  );
}

/* ---------- Match ticker (marquee) ---------- */
function TickerItem({ m, led }) {
  const stroke = led ? { color: "#ffd23f", textShadow: "0 0 8px rgba(255,210,63,.6)" } : {};
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "0 20px",
      borderRight: led ? "1px solid rgba(255,210,63,.25)" : "2px solid rgba(27,42,74,.12)",
      fontFamily: "var(--head)", fontSize: 15, whiteSpace: "nowrap",
      color: led ? "#ffd23f" : "var(--ink)" }}>
      {!led && <Flag code={m.a} style={{ width: 20, height: 14 }} />}
      <span>{m.a}</span>
      {m.type === "result"
        ? <span style={{ ...stroke, padding: "0 2px" }}>{m.as}–{m.bs}</span>
        : <span style={{ opacity: .6, fontSize: 12 }}>v</span>}
      <span>{m.b}</span>
      {!led && <Flag code={m.b} style={{ width: 20, height: 14 }} />}
      <span style={{ fontFamily: "var(--body)", fontWeight: 700, fontSize: 11,
        opacity: led ? .8 : .55, marginLeft: 2 }}>
        {m.type === "soon" ? m.when : m.tag}
      </span>
    </div>
  );
}
function Ticker({ items, led = false, speed = 34 }) {
  const row = [...items, ...items];
  return (
    <div style={{ overflow: "hidden", width: "100%" }}>
      <div style={{ display: "inline-flex", animation: `wchq-marquee ${speed}s linear infinite`,
        willChange: "transform" }}>
        {row.map((m, i) => <TickerItem key={i} m={m} led={led} />)}
      </div>
    </div>
  );
}

/* ---------- Sweepstake podium (top 3) ---------- */
function Podium({ people, onPerson }) {
  const top = [...people].sort((a, b) => b.points - a.points).slice(0, 3);
  // order on stand: 2nd, 1st, 3rd
  const order = [top[1], top[0], top[2]];
  const meta = {
    0: { h: 70, medal: "🥈", col: "#d7dde6", rank: 2 },
    1: { h: 100, medal: "🥇", col: "var(--sun)", rank: 1 },
    2: { h: 50, medal: "🥉", col: "#f0b173", rank: 3 },
  };
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 12 }}>
      {order.map((p, i) => {
        const m = meta[i];
        return (
          <div key={p.id} className="tap" onClick={() => onPerson && onPerson(p)}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1, maxWidth: 96 }}>
            <div style={{ fontSize: i === 1 ? 26 : 20 }}>{m.medal}</div>
            <div className={i === 1 ? "anim-bob" : ""}><Avatar person={p} size={i === 1 ? 54 : 44} /></div>
            <div style={{ fontFamily: "var(--head)", fontSize: 13, lineHeight: 1 }}>{p.name}</div>
            <div className="sticker-sm" style={{ width: "100%", height: m.h, background: m.col,
              borderTopLeftRadius: 10, borderTopRightRadius: 10, borderBottom: "none",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start",
              paddingTop: 8, gap: 0 }}>
              <span style={{ fontFamily: "var(--head)", fontSize: 22, color: "var(--ink)" }}>{p.points}</span>
              <span style={{ fontFamily: "var(--head)", fontSize: 10, opacity: .65 }}>PTS</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Leaderboard ranked rows ---------- */
function LeaderRow({ p, rank, onPerson }) {
  const medals = { 1: "#ffd23f", 2: "#d7dde6", 3: "#f0b173" };
  const stillIn = p.teams.length - p.out.length;
  return (
    <div className="tap sticker-sm" onClick={() => onPerson && onPerson(p)}
      style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 12px", background: "var(--cream)" }}>
      <div style={{ fontFamily: "var(--head)", fontSize: 20, width: 30, textAlign: "center",
        color: medals[rank] ? "var(--ink)" : "var(--ink)",
        background: medals[rank], borderRadius: 8,
        border: medals[rank] ? "2.5px solid var(--ink)" : "none", lineHeight: "26px",
        boxShadow: medals[rank] ? "1.5px 2px 0 rgba(27,42,74,.8)" : "none" }}>{rank}</div>
      <Avatar person={p} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--head)", fontSize: 16, lineHeight: 1 }}>{p.name}</div>
        <div style={{ fontSize: 11.5, fontWeight: 700, opacity: .7, marginTop: 2 }}>
          ✅ {stillIn} in · ❌ {p.out.length} out
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontFamily: "var(--head)", fontSize: 22, lineHeight: 1 }}>{p.points}</div>
        <div style={{ fontFamily: "var(--head)", fontSize: 9, opacity: .6 }}>PTS</div>
      </div>
    </div>
  );
}

/* ---------- Next-up match card ---------- */
function NextUpCard({ m, onReminder, reminded = false, compact = false }) {
  const T = window.WCHQ.TEAMS;
  return (
    <div className="sticker" style={{ padding: compact ? "12px 14px" : "16px 18px",
      background: m.featured ? "var(--cream2)" : "var(--cream)", position: "relative", overflow: "hidden" }}>
      {m.featured && (
        <div style={{ position: "absolute", top: 10, right: -34, transform: "rotate(34deg)",
          background: "var(--tomato)", color: "#fff", fontFamily: "var(--head)", fontSize: 11,
          padding: "3px 38px", letterSpacing: "1px", border: "2px solid var(--ink)" }}>OPENER</div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--head)",
        fontSize: 12, color: "var(--ink-soft)" }}>
        <span style={{ background: "var(--blue)", color: "#fff", padding: "2px 8px", borderRadius: 8,
          border: "2px solid var(--ink)" }}>{m.group}</span>
        <span style={{ opacity: .7 }}>{m.date} · {m.time}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 8, margin: "12px 0 8px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
          <Flag code={m.a} style={{ width: 46, height: 33, borderRadius: 6 }} />
          <span style={{ fontFamily: "var(--head)", fontSize: 15 }}>{T[m.a]?.name}</span>
        </div>
        <div style={{ fontFamily: "var(--head)", fontSize: 24, color: "var(--tomato)" }}>VS</div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
          <Flag code={m.b} style={{ width: 46, height: 33, borderRadius: 6 }} />
          <span style={{ fontFamily: "var(--head)", fontSize: 15 }}>{T[m.b]?.name}</span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, opacity: .6 }}>📍 {m.venue}</span>
        <div className="tap" onClick={() => onReminder && onReminder(m)}
          style={{ fontFamily: "var(--head)", fontSize: 12,
            background: reminded ? "var(--grass)" : "var(--sun)",
            border: "2.5px solid var(--ink)", borderRadius: 999, padding: "5px 12px",
            boxShadow: reminded ? "2px 2px 0 rgba(27,42,74,.8)" : "2px 2px 0 rgba(27,42,74,.8)",
            whiteSpace: "nowrap", transition: "background .15s" }}>
          {reminded ? "✅ Reminded" : "🔔 Remind me"}</div>
      </div>
    </div>
  );
}

/* ---------- Toast ---------- */
function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ position: "absolute", left: "50%", bottom: 22, transform: "translateX(-50%)",
      zIndex: 60, background: "var(--ink)", color: "var(--cream)", fontFamily: "var(--head)",
      fontSize: 14, padding: "10px 18px", borderRadius: 999, border: "3px solid var(--cream)",
      boxShadow: "0 6px 0 rgba(27,42,74,.35)", whiteSpace: "nowrap",
      animation: "wchq-pop .3s ease-out" }}>{msg}</div>
  );
}

/* ---------- Person detail popup ---------- */
function PersonPopup({ person, onClose }) {
  if (!person) return null;
  const T = window.WCHQ.TEAMS;
  const stillIn = person.teams.filter((c) => !person.out.includes(c));
  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, zIndex: 80,
      background: "rgba(27,42,74,.45)", display: "flex", alignItems: "center",
      justifyContent: "center", padding: 18, backdropFilter: "blur(2px)" }}>
      <div onClick={(e) => e.stopPropagation()} className="sticker"
        style={{ width: "100%", maxWidth: 320, padding: 20, animation: "wchq-pop .32s ease-out" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar person={person} size={56} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--head)", fontSize: 22, lineHeight: 1 }}>{person.name}</div>
            <div style={{ fontWeight: 700, fontSize: 13, opacity: .7, marginTop: 3 }}>{person.points} points</div>
          </div>
          <div className="tap" onClick={onClose} style={{ fontFamily: "var(--head)", fontSize: 20,
            width: 32, height: 32, borderRadius: "50%", border: "3px solid var(--ink)",
            display: "flex", alignItems: "center", justifyContent: "center" }}>×</div>
        </div>
        <div style={{ display: "flex", gap: 8, margin: "16px 0 6px" }}>
          <div style={{ flex: 1, textAlign: "center", padding: "8px 0", borderRadius: 12,
            border: "3px solid var(--ink)", background: "var(--grass)" }}>
            <div style={{ fontFamily: "var(--head)", fontSize: 24 }}>{stillIn.length}</div>
            <div style={{ fontFamily: "var(--head)", fontSize: 10 }}>✅ STILL IN</div>
          </div>
          <div style={{ flex: 1, textAlign: "center", padding: "8px 0", borderRadius: 12,
            border: "3px solid var(--ink)", background: "var(--tomato)" }}>
            <div style={{ fontFamily: "var(--head)", fontSize: 24 }}>{person.out.length}</div>
            <div style={{ fontFamily: "var(--head)", fontSize: 10 }}>❌ OUT</div>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 12 }}>
          {person.teams.map((c) => <FlagChip key={c} code={c} knocked={person.out.includes(c)} />)}
        </div>
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8,
          background: "var(--cream2)", border: "3px solid var(--ink)", borderRadius: 14, padding: "8px 12px" }}>
          <span style={{ fontSize: 20 }}>⭐</span>
          <span style={{ fontWeight: 700, fontSize: 13 }}>Best shot:</span>
          <Flag code={person.best} style={{ width: 24, height: 17 }} />
          <span style={{ fontFamily: "var(--head)", fontSize: 14 }}>{T[person.best]?.name}</span>
          <span style={{ marginLeft: "auto", fontFamily: "var(--head)", fontSize: 13, color: "var(--tomato)" }}>{T[person.best]?.odds}</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { TopNav, Ticker, TickerItem, Podium, LeaderRow, NextUpCard, Toast, PersonPopup });
