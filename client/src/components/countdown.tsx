import { useState, useEffect } from 'react';

/* ---------- Countdown hook + boxes ---------- */

/* Shape returned by useCountdown — days/hours/mins/secs remaining + done flag. */
export type Countdown = {
  d: number;
  h: number;
  m: number;
  s: number;
  done: boolean;
};

export function useCountdown(target: number): Countdown {
  const calc = (): Countdown => {
    const diff = Math.max(0, target - Date.now());
    return {
      d: Math.floor(diff / 86400000),
      h: Math.floor((diff / 3600000) % 24),
      m: Math.floor((diff / 60000) % 60),
      s: Math.floor((diff / 1000) % 60),
      done: diff <= 0,
    };
  };
  const [t, setT] = useState<Countdown>(calc);
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, [target]);
  return t;
}

export function CountdownBoxes({
  t,
  size = 'md',
  boxBg = 'var(--cream)',
  digitColour = 'var(--ink)',
}: {
  t: Countdown;
  size?: 'sm' | 'md' | 'lg';
  boxBg?: string;
  digitColour?: string;
}) {
  const units = [
    { n: t.d, l: 'DAYS' }, { n: t.h, l: 'HRS' },
    { n: t.m, l: 'MIN' }, { n: t.s, l: 'SEC' },
  ];
  const dims = {
    sm: { box: 52, font: 30, lab: 10, gap: 8 },
    md: { box: 70, font: 42, lab: 12, gap: 11 },
    lg: { box: 94, font: 58, lab: 14, gap: 14 },
  }[size];
  return (
    <div style={{ display: 'flex', gap: dims.gap }}>
      {units.map((u) => (
        <div key={u.l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flex: 1 }}>
          <div className="sticker-sm" style={{
            background: boxBg, border: 'var(--bw) solid var(--ink)',
            minWidth: dims.box, width: '100%', height: dims.box * 1.06,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--head)', fontSize: dims.font, color: digitColour,
            lineHeight: 1, position: 'relative', overflow: 'hidden',
          }}>
            <span key={u.n} style={{ display: 'inline-block', animation: 'wchq-digitpop .35s ease-out' }}>
              {String(u.n).padStart(2, '0')}
            </span>
          </div>
          <span style={{ fontFamily: 'var(--head)', fontSize: dims.lab, letterSpacing: '1.5px',
            color: digitColour === 'var(--ink)' ? 'var(--ink)' : 'var(--cream)' }}>{u.l}</span>
        </div>
      ))}
    </div>
  );
}
