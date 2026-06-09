import React from 'react';

/* ---------- Wobbles: the wobbly football mascot ---------- */

export type WobblesMood = 'happy' | 'cheer' | 'wow' | 'love' | 'wink' | 'cool';

export function Wobbles({
  size = 120,
  mood = 'happy',
  className = '',
  style = {},
}: {
  size?: number;
  mood?: WobblesMood;
  className?: string;
  style?: React.CSSProperties;
}) {
  const armsUp = mood !== 'happy';
  const eyeAnim: React.CSSProperties = { animation: 'wchq-eye 2.6s ease-in-out infinite' };

  /* ----- eyes (vary by mood) ----- */
  let eyes: React.ReactNode;
  if (mood === 'love') {
    const heart = (cx: number) => (
      <path
        d={`M${cx},56 C${cx - 10},45 ${cx - 5},38 ${cx},45 C${cx + 5},38 ${cx + 10},45 ${cx},56 Z`}
        fill="#ff5d5d" stroke="#1b2a4a" strokeWidth="2.5" strokeLinejoin="round"
      />
    );
    eyes = <g>{heart(48)}{heart(72)}</g>;
  } else if (mood === 'wink') {
    eyes = (
      <g>
        <circle cx="48" cy="50" r="13" fill="#fff" stroke="#1b2a4a" strokeWidth="3.5" />
        <circle cx="48" cy="48" r="6" fill="#1b2a4a" style={eyeAnim} />
        <path d="M64 51 Q72 44 80 51" fill="none" stroke="#1b2a4a" strokeWidth="4" strokeLinecap="round" />
      </g>
    );
  } else if (mood === 'cool') {
    eyes = (
      <g>
        <rect x="34" y="43" width="22" height="15" rx="6" fill="#1b2a4a" />
        <rect x="64" y="43" width="22" height="15" rx="6" fill="#1b2a4a" />
        <rect x="54" y="47" width="12" height="4" fill="#1b2a4a" />
        <rect x="38" y="46" width="7" height="4" rx="2" fill="#7fd0ff" opacity=".85" />
        <rect x="68" y="46" width="7" height="4" rx="2" fill="#7fd0ff" opacity=".85" />
      </g>
    );
  } else {
    // happy / cheer / wow share the googly-eye base
    const up = mood === 'cheer';
    const wide = mood === 'wow';
    const r = wide ? 15 : 13;
    const py = up ? 46 : 51;
    const pr = wide ? 7 : 6;
    eyes = (
      <g>
        <circle cx="48" cy="50" r={r} fill="#fff" stroke="#1b2a4a" strokeWidth="3.5" />
        <circle cx="72" cy="50" r={r} fill="#fff" stroke="#1b2a4a" strokeWidth="3.5" />
        <circle cx={up ? 48 : 50} cy={py} r={pr} fill="#1b2a4a" style={eyeAnim} />
        <circle cx={up ? 72 : 74} cy={py} r={pr} fill="#1b2a4a" style={eyeAnim} />
      </g>
    );
  }

  /* ----- mouth (vary by mood) ----- */
  let mouth: React.ReactNode;
  if (mood === 'wow') {
    mouth = <ellipse cx="60" cy="83" rx="9" ry="11" fill="#ff5d5d" stroke="#1b2a4a" strokeWidth="3" />;
  } else if (mood === 'cheer' || mood === 'love') {
    mouth = (
      <g>
        <path d="M44 74 Q60 92 76 74" fill="#ff5d5d" stroke="#1b2a4a" strokeWidth="4" strokeLinecap="round" />
        <path d="M50 78 Q60 84 70 78" fill="#fff" opacity=".9" stroke="none" />
      </g>
    );
  } else if (mood === 'wink') {
    mouth = <path d="M46 78 Q60 89 76 77" fill="none" stroke="#1b2a4a" strokeWidth="4" strokeLinecap="round" />;
  } else if (mood === 'cool') {
    mouth = <path d="M48 79 Q60 86 72 79" fill="none" stroke="#1b2a4a" strokeWidth="4" strokeLinecap="round" />;
  } else {
    mouth = <path d="M46 76 Q60 88 74 76" fill="none" stroke="#1b2a4a" strokeWidth="4" strokeLinecap="round" />;
  }

  return (
    <svg className={className} width={size} height={size} viewBox="0 0 120 120"
      style={{ overflow: 'visible', ...style }}>
      {/* arms */}
      <g stroke="#1b2a4a" strokeWidth="5" strokeLinecap="round">
        <path d={armsUp ? 'M22 54 L6 34' : 'M22 60 L8 64'} />
        <path d={armsUp ? 'M98 54 L114 34' : 'M98 60 L112 64'} />
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
      {eyes}
      {mouth}
    </svg>
  );
}
