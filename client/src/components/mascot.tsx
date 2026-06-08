import React from 'react';

/* ---------- Wobbles: the wobbly football mascot ---------- */
// Props mirror the prototype: optional size, mood, className and inline style.
export function Wobbles({
  size = 120,
  mood = 'happy',
  className = '',
  style = {},
}: {
  size?: number;
  mood?: 'happy' | 'cheer';
  className?: string;
  style?: React.CSSProperties;
}) {
  // pupil offset by mood
  const cheer = mood === 'cheer';
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 120 120"
      style={{ overflow: 'visible', ...style }}>
      {/* arms */}
      <g stroke="#1b2a4a" strokeWidth="5" strokeLinecap="round">
        <path d={cheer ? 'M22 54 L6 34' : 'M22 60 L8 64'} />
        <path d={cheer ? 'M98 54 L114 34' : 'M98 60 L112 64'} />
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
          style={{ animation: 'wchq-eye 2.6s ease-in-out infinite' }} />
        <circle className="anim-eye" cx={cheer ? 72 : 74} cy={cheer ? 46 : 53} r="6" fill="#1b2a4a"
          style={{ animation: 'wchq-eye 2.6s ease-in-out infinite' }} />
      </g>
      {/* smile */}
      <path d={cheer ? 'M44 74 Q60 92 76 74' : 'M46 76 Q60 88 74 76'} fill={cheer ? '#ff5d5d' : 'none'}
        stroke="#1b2a4a" strokeWidth="4" strokeLinecap="round" />
      {cheer && <path d="M50 78 Q60 84 70 78" fill="#fff" opacity=".9" stroke="none" />}
    </svg>
  );
}
