/* ---------- Animated backdrop ---------- */
// Sky/dark backdrop with a spinning sun, drifting clouds, grass strip and star dots.

interface BackdropProps {
  dark?: boolean;
  sun?: boolean;
  clouds?: boolean;
  grass?: boolean;
}

export function Backdrop({ dark = false, sun = true, clouds = true, grass = true }: BackdropProps) {
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

export function Cloud() {
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
