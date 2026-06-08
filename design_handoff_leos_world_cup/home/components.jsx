/* World Cup HQ — core visual components (exports to window) */

/* ---------- Flag chip ---------- */
function Flag({ code, knocked, style }) {
  return (
    <span className={"flag" + (knocked ? " knocked" : "")}
      style={{ background: window.WCHQ.flagCss(code), ...style }} />
  );
}
function FlagChip({ code, knocked, onClick }) {
  const t = window.WCHQ.TEAMS[code] || {};
  return (
    <span className={"flagchip tap" + (knocked ? "" : "")} onClick={onClick}
      style={{ opacity: knocked ? 0.6 : 1, textDecoration: knocked ? "line-through" : "none" }}>
      <Flag code={code} knocked={knocked} />
      {code}
    </span>
  );
}

/* ---------- Person avatar ---------- */
function Avatar({ person, size = 44, ring = true }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: person.colour,
      border: ring ? "3px solid var(--ink)" : "none",
      boxShadow: ring ? "2px 2px 0 rgba(27,42,74,.85)" : "none",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--head)", color: "#fff", fontSize: size * 0.36,
      letterSpacing: "1px", flex: "0 0 auto",
      textShadow: "0 2px 0 rgba(27,42,74,.4)",
    }}>{person.initials}</div>
  );
}

/* ---------- Wobbles the mascot (googly-eyed football) ---------- */
function Wobbles({ size = 120, mood = "happy", className = "", style = {} }) {
  // pupil offset by mood
  const cheer = mood === "cheer";
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 120 120"
      style={{ overflow: "visible", ...style }}>
      {/* arms */}
      <g stroke="#1b2a4a" strokeWidth="5" strokeLinecap="round">
        <path d={cheer ? "M22 54 L6 34" : "M22 60 L8 64"} />
        <path d={cheer ? "M98 54 L114 34" : "M98 60 L112 64"} />
      </g>
      {/* legs + boots */}
      <g>
        <path d="M44 110 L42 122" stroke="#1b2a4a" strokeWidth="5" strokeLinecap="round" />
        <path d="M76 110 L78 122" stroke="#1b2a4a" strokeWidth="5" strokeLinecap="round" />
        <ellipse cx="38" cy="124" rx="9" ry="5" fill="#ff5d5d" stroke="#1b2a4a" strokeWidth="3" />
        <ellipse cx="82" cy="124" rx="9" ry="5" fill="#ff5d5d" stroke="#1b2a4a" strokeWidth="3" />
      </g>
      {/* ball body */}
      <circle cx="60" cy="62" r="46" fill="#fffdf3" stroke="#1b2a4a" strokeWidth="5" />
      {/* pentagon patches (simple) */}
      <polygon points="60,40 70,47 66,59 54,59 50,47" fill="#1b2a4a" />
      <polygon points="34,58 42,52 49,58 46,68 37,68" fill="#1b2a4a" opacity=".9" />
      <polygon points="86,58 78,52 71,58 74,68 83,68" fill="#1b2a4a" opacity=".9" />
      <polygon points="52,82 68,82 64,94 56,94" fill="#1b2a4a" opacity=".9" />
      {/* googly eyes */}
      <g>
        <circle cx="48" cy="50" r="13" fill="#fff" stroke="#1b2a4a" strokeWidth="3.5" />
        <circle cx="72" cy="50" r="13" fill="#fff" stroke="#1b2a4a" strokeWidth="3.5" />
        <circle className="anim-eye" cx={cheer ? 48 : 50} cy={cheer ? 46 : 53} r="6" fill="#1b2a4a"
          style={{ animation: "wchq-eye 2.6s ease-in-out infinite" }} />
        <circle className="anim-eye" cx={cheer ? 72 : 74} cy={cheer ? 46 : 53} r="6" fill="#1b2a4a"
          style={{ animation: "wchq-eye 2.6s ease-in-out infinite" }} />
      </g>
      {/* smile */}
      <path d={cheer ? "M44 74 Q60 92 76 74" : "M46 76 Q60 88 74 76"} fill={cheer ? "#ff5d5d" : "none"}
        stroke="#1b2a4a" strokeWidth="4" strokeLinecap="round" />
      {cheer && <path d="M50 78 Q60 84 70 78" fill="#fff" opacity=".9" stroke="none" />}
    </svg>
  );
}

/* ---------- Animated backdrop ---------- */
function Backdrop({ dark = false, sun = true, clouds = true, grass = true }) {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0,
      background: dark
        ? "linear-gradient(180deg,#10204a 0%,#1b2a4a 55%,#24407a 100%)"
        : "linear-gradient(180deg,var(--sky1) 0%,var(--sky2) 62%)" }}>
      {sun && !dark && (
        <div className="anim-spin" style={{ position: "absolute", top: -36, right: -36, width: 150, height: 150 }}>
          <svg viewBox="0 0 100 100" width="150" height="150">
            {Array.from({ length: 12 }).map((_, i) => (
              <rect key={i} x="47" y="0" width="6" height="22" rx="3" fill="#ffd23f"
                transform={`rotate(${i * 30} 50 50)`} />
            ))}
            <circle cx="50" cy="50" r="30" fill="#ffd23f" stroke="#1b2a4a" strokeWidth="3" />
          </svg>
        </div>
      )}
      {dark && (
        <div style={{ position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(rgba(255,255,255,.18) 1px, transparent 1.4px)",
          backgroundSize: "26px 26px", opacity: .5 }} />
      )}
      {clouds && [
        { top: "12%", dur: 38, delay: 0, s: 1 },
        { top: "30%", dur: 52, delay: -14, s: .72 },
        { top: "52%", dur: 46, delay: -28, s: .9 },
      ].map((c, i) => (
        <div key={i} style={{ position: "absolute", top: c.top, left: 0, width: "100%", pointerEvents: "none" }}>
          <div style={{ animation: `wchq-drift ${c.dur}s linear infinite`, animationDelay: `${c.delay}s`,
            display: "inline-block", transform: `scale(${c.s})`, opacity: dark ? .12 : .92 }}>
            <Cloud />
          </div>
        </div>
      ))}
      {grass && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 56 }}>
          <svg width="100%" height="56" preserveAspectRatio="none" viewBox="0 0 100 56" style={{ display: "block" }}>
            <path d="M0 14 Q5 4 10 14 T20 14 T30 14 T40 14 T50 14 T60 14 T70 14 T80 14 T90 14 T100 14 L100 56 L0 56 Z"
              fill="#5fd35f" stroke="#1b2a4a" strokeWidth="1.4" />
            <rect x="0" y="20" width="100" height="36" fill="#46b94a" opacity=".5" />
          </svg>
        </div>
      )}
    </div>
  );
}
function Cloud() {
  return (
    <svg width="92" height="44" viewBox="0 0 92 44">
      <g fill="#fff" stroke="#1b2a4a" strokeWidth="3">
        <ellipse cx="30" cy="28" rx="22" ry="14" />
        <ellipse cx="54" cy="22" rx="20" ry="16" />
        <ellipse cx="70" cy="30" rx="16" ry="11" />
      </g>
    </svg>
  );
}

/* ---------- Confetti ---------- */
function Confetti({ show, count = 26 }) {
  const colours = ["#ffd23f", "#ff5d5d", "#ff8fd0", "#36a9ff", "#2fe0c0", "#9b6cf0", "#ff9f1c"];
  const pieces = React.useMemo(() =>
    Array.from({ length: count }).map((_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      dur: 1.6 + Math.random() * 1.4,
      col: colours[i % colours.length],
      w: 7 + Math.random() * 7,
      rot: Math.random() * 360,
      round: Math.random() > 0.6,
    })), [count, show]);
  if (!show) return null;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 40 }}>
      {pieces.map((p, i) => (
        <div key={i} style={{
          position: "absolute", top: -16, left: p.left + "%",
          width: p.w, height: p.w * (p.round ? 1 : 1.5),
          background: p.col, borderRadius: p.round ? "50%" : 2,
          border: "1.5px solid rgba(27,42,74,.5)",
          transform: `rotate(${p.rot}deg)`,
          animation: `wchq-conffall ${p.dur}s ease-in ${p.delay}s forwards`,
        }} />
      ))}
    </div>
  );
}

/* ---------- Countdown hook + boxes ---------- */
function useCountdown(target) {
  const calc = () => {
    const diff = Math.max(0, target - Date.now());
    return {
      d: Math.floor(diff / 86400000),
      h: Math.floor((diff / 3600000) % 24),
      m: Math.floor((diff / 60000) % 60),
      s: Math.floor((diff / 1000) % 60),
      done: diff <= 0,
    };
  };
  const [t, setT] = React.useState(calc);
  React.useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, [target]);
  return t;
}

function CountdownBoxes({ t, size = "md", boxBg = "var(--cream)", digitColour = "var(--ink)" }) {
  const units = [
    { n: t.d, l: "DAYS" }, { n: t.h, l: "HRS" },
    { n: t.m, l: "MIN" }, { n: t.s, l: "SEC" },
  ];
  const dims = {
    sm: { box: 52, font: 30, lab: 10, gap: 8 },
    md: { box: 70, font: 42, lab: 12, gap: 11 },
    lg: { box: 94, font: 58, lab: 14, gap: 14 },
  }[size];
  return (
    <div style={{ display: "flex", gap: dims.gap }}>
      {units.map((u, i) => (
        <div key={u.l} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flex: 1 }}>
          <div className="sticker-sm" style={{
            background: boxBg, border: "var(--bw) solid var(--ink)",
            minWidth: dims.box, width: "100%", height: dims.box * 1.06,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--head)", fontSize: dims.font, color: digitColour,
            lineHeight: 1, position: "relative", overflow: "hidden",
          }}>
            <span key={u.n} style={{ display: "inline-block", animation: "wchq-digitpop .35s ease-out" }}>
              {String(u.n).padStart(2, "0")}
            </span>
          </div>
          <span style={{ fontFamily: "var(--head)", fontSize: dims.lab, letterSpacing: "1.5px",
            color: digitColour === "var(--ink)" ? "var(--ink)" : "var(--cream)" }}>{u.l}</span>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { Flag, FlagChip, Avatar, Wobbles, Backdrop, Cloud, Confetti, useCountdown, CountdownBoxes });
