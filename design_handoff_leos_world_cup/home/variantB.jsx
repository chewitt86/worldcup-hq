/* World Cup HQ — Variation B: "Jumbotron" (stadium big-screen) */

function LEDDigits({ t, big }) {
  const units = [
    { n: t.d, l: "DAYS" }, { n: t.h, l: "HOURS" },
    { n: t.m, l: "MINS" }, { n: t.s, l: "SECS" },
  ];
  const fs = big ? 76 : 46;
  const box = big ? 120 : 74;
  return (
    <div style={{ display: "flex", gap: big ? 14 : 9, justifyContent: "center" }}>
      {units.map((u, i) => (
        <div key={u.l} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
          <div style={{ width: "100%", minWidth: box * 0.7, height: box, borderRadius: big ? 16 : 11,
            background: "radial-gradient(circle at 50% 30%, #15224a 0%, #0a1230 100%)",
            border: "3px solid #2c3f66", position: "relative", overflow: "hidden",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "inset 0 2px 10px rgba(0,0,0,.7)" }}>
            {/* dot-matrix sheen */}
            <div style={{ position: "absolute", inset: 0, opacity: .35,
              backgroundImage: "radial-gradient(rgba(255,255,255,.14) 1px, transparent 1.3px)",
              backgroundSize: "7px 7px" }} />
            <span key={u.n} style={{ fontFamily: "var(--head)", fontSize: fs, lineHeight: 1,
              color: "#ffd23f", textShadow: "0 0 12px rgba(255,210,63,.9), 0 0 26px rgba(255,159,28,.6)",
              animation: "wchq-digitpop .35s ease-out" }}>
              {String(u.n).padStart(2, "0")}
            </span>
          </div>
          <span style={{ fontFamily: "var(--head)", fontSize: big ? 13 : 10, letterSpacing: "2px",
            color: "#7fa8e6" }}>{u.l}</span>
        </div>
      ))}
    </div>
  );
}

function Jumbotron({ t, big, title }) {
  const banner = title || "WORLD CUP 2026";
  return (
    <div style={{ position: "relative", borderRadius: big ? 30 : 22,
      background: "linear-gradient(180deg,#1b2a4a,#13204200)",
      padding: big ? 16 : 11 }}>
      {/* housing */}
      <div style={{ position: "relative", borderRadius: big ? 24 : 18,
        background: "linear-gradient(180deg,#0c1838 0%,#0a1330 100%)",
        border: "5px solid #1b2a4a", boxShadow: "6px 7px 0 rgba(0,0,0,.45), inset 0 0 0 3px #243a6a",
        padding: big ? "26px 30px 30px" : "18px 16px 22px", overflow: "hidden" }}>
        {/* corner bolts */}
        {[[10, 10], [null, 10], [10, null], [null, null]].map((p, i) => (
          <div key={i} style={{ position: "absolute", width: 9, height: 9, borderRadius: "50%",
            background: "#3a558f", border: "2px solid #0a1330",
            top: p[1] === 10 ? 10 : undefined, bottom: p[1] === null ? 10 : undefined,
            left: p[0] === 10 ? 10 : undefined, right: p[0] === null ? 10 : undefined }} />
        ))}
        {/* scanlines */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: .25,
          background: "repeating-linear-gradient(0deg, rgba(0,0,0,.5) 0 2px, transparent 2px 4px)" }} />
        {/* title banner */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: big ? 22 : 16, position: "relative" }}>
          <div className="head" style={{ background: "var(--sun)", color: "var(--ink)",
            fontSize: big ? 30 : 19, letterSpacing: "1px", padding: big ? "8px 26px" : "6px 16px",
            borderRadius: 999, border: "3px solid var(--ink)", boxShadow: "3px 3px 0 rgba(0,0,0,.4)",
            whiteSpace: "nowrap" }}>★ {banner} ★</div>
        </div>
        <div className="head" style={{ textAlign: "center", color: "#ff5d5d", fontSize: big ? 18 : 13,
          letterSpacing: "3px", marginBottom: big ? 16 : 11,
          textShadow: "0 0 10px rgba(255,93,93,.7)", position: "relative" }}>
          ● KICK-OFF IN
        </div>
        <div style={{ position: "relative" }}><LEDDigits t={t} big={big} /></div>
      </div>
    </div>
  );
}

function LiveLeaders({ people, onPerson, big }) {
  const top = [...people].sort((a, b) => b.points - a.points).slice(0, 3);
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div style={{ borderRadius: 18, overflow: "hidden", border: "4px solid var(--ink)",
      boxShadow: "5px 6px 0 rgba(27,42,74,.4)" }}>
      <div className="head" style={{ background: "var(--tomato)", color: "#fff", padding: "8px 16px",
        fontSize: 16, letterSpacing: "1px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#fff",
          animation: "wchq-ledpulse 1.1s infinite", display: "inline-block" }} />
        LIVE LEADERS
      </div>
      <div style={{ display: "flex", background: "#0c1838" }}>
        {top.map((p, i) => (
          <div key={p.id} className="tap" onClick={() => onPerson(p)}
            style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column",
              alignItems: "center", gap: 5, borderRight: i < 2 ? "2px solid #1b2a4a" : "none",
              background: i === 0 ? "rgba(255,210,63,.12)" : "transparent" }}>
            <div style={{ fontSize: 18 }}>{medals[i]}</div>
            <Avatar person={p} size={big ? 48 : 40} />
            <div className="head" style={{ color: "#fff", fontSize: 13 }}>{p.name}</div>
            <div className="head" style={{ color: "#ffd23f", fontSize: 18,
              textShadow: "0 0 10px rgba(255,210,63,.6)" }}>{p.points}<span style={{ fontSize: 9, color: "#7fa8e6" }}> PTS</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VariantB({ device = "mobile" }) {
  const { PEOPLE, TICKER, NEXTUP, KICKOFF } = window.WCHQ;
  const t = useCountdown(KICKOFF);
  const mobile = device === "mobile";
  const big = !mobile;
  const [toast, setToast] = React.useState(null);
  const [person, setPerson] = React.useState(null);
  const [fire, setFire] = React.useState(true);
  const ping = (msg) => { setToast(msg); clearTimeout(window.__wb); window.__wb = setTimeout(() => setToast(null), 2200); };
  React.useEffect(() => {
    const id = setInterval(() => { setFire(false); setTimeout(() => setFire(true), 80); }, 7000);
    const off = setTimeout(() => setFire(false), 2600);
    return () => { clearInterval(id); clearTimeout(off); };
  }, []);

  const LEDTicker = (
    <div style={{ background: "#0a1330", border: "4px solid var(--ink)", borderRadius: 12,
      padding: "9px 0", overflow: "hidden", boxShadow: "inset 0 0 18px rgba(255,210,63,.08)",
      display: "flex", alignItems: "center" }}>
      <span className="head" style={{ background: "#ff5d5d", color: "#fff", fontSize: 12,
        padding: "5px 10px", margin: "0 8px", borderRadius: 7, flex: "0 0 auto",
        boxShadow: "0 0 10px rgba(255,93,93,.6)" }}>⚽ SCORES</span>
      <div style={{ flex: 1, minWidth: 0 }}><Ticker items={TICKER} led speed={30} /></div>
    </div>
  );

  const NextUp = (
    <div style={{ display: mobile ? "flex" : "grid", flexDirection: "column",
      gridTemplateColumns: mobile ? undefined : "1fr 1fr", gap: 14 }}>
      {NEXTUP.slice(0, 2).map((m, i) => (
        <NextUpCard key={i} m={m} onReminder={(mm) => ping(`🔔 Reminder set for ${mm.a} v ${mm.b}!`)} />
      ))}
    </div>
  );

  return (
    <div className="wchq-screen">
      <Backdrop dark sun={false} />
      {/* spotlights */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
        background: "radial-gradient(120% 60% at 20% -10%, rgba(54,169,255,.35), transparent 60%), radial-gradient(120% 60% at 80% -10%, rgba(255,210,63,.3), transparent 60%)" }} />
      <Confetti show={fire} count={30} />
      <div className="noscroll wchq-stack" style={{ position: "relative", zIndex: 1, height: "100%",
        overflowY: "auto", padding: mobile ? "16px 16px 40px" : "22px 34px 48px",
        gap: mobile ? 18 : 24, maxWidth: mobile ? "none" : 1100, margin: "0 auto" }}>
        <TopNav active="Home" device={device} dark />
        {mobile ? (
          <React.Fragment>
            <Jumbotron t={t} big={false} />
            {LEDTicker}
            <LiveLeaders people={PEOPLE} onPerson={setPerson} big={false} />
            <div className="head" style={{ color: "#fff", fontSize: 18, letterSpacing: ".5px",
              display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>⚽ NEXT UP</div>
            {NextUp}
          </React.Fragment>
        ) : (
          <React.Fragment>
            <Jumbotron t={t} big={true} />
            {LEDTicker}
            <div style={{ display: "grid", gridTemplateColumns: ".9fr 1.1fr", gap: 24, alignItems: "start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <LiveLeaders people={PEOPLE} onPerson={setPerson} big />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="head" style={{ color: "#fff", fontSize: 20, letterSpacing: ".5px" }}>⚽ NEXT UP</div>
                {NextUp}
              </div>
            </div>
          </React.Fragment>
        )}
      </div>
      <Toast msg={toast} />
      <PersonPopup person={person} onClose={() => setPerson(null)} />
    </div>
  );
}

Object.assign(window, { VariantB, Jumbotron, LEDDigits, LiveLeaders });
