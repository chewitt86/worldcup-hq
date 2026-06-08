import { useMemo } from 'react';

/* ---------- Confetti ---------- */
interface ConfettiProps {
  show: boolean;
  count?: number;
}

export function Confetti({ show, count = 26 }: ConfettiProps) {
  const colours = ['#ffd23f', '#ff5d5d', '#ff8fd0', '#36a9ff', '#2fe0c0', '#9b6cf0', '#ff9f1c'];
  const pieces = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        dur: 1.6 + Math.random() * 1.4,
        col: colours[i % colours.length],
        w: 7 + Math.random() * 7,
        rot: Math.random() * 360,
        round: Math.random() > 0.6,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count, show],
  );
  if (!show) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 40 }}>
      {pieces.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: -16,
            left: p.left + '%',
            width: p.w,
            height: p.w * (p.round ? 1 : 1.5),
            background: p.col,
            borderRadius: p.round ? '50%' : 2,
            border: '1.5px solid rgba(27,42,74,.5)',
            transform: `rotate(${p.rot}deg)`,
            animation: `wchq-conffall ${p.dur}s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}
