/* World Cup HQ — Jumbotron (stadium big-screen).
   Ported byte-for-byte from the prototype's home/variantB.jsx (LEDDigits +
   Jumbotron). Only the LED stadium Jumbotron used on Home is ported here; the
   handoff's VariantB demo wrapper and its simplified LiveLeaders are not needed
   (Home uses HomeLeaders from the page module). */

import type { Countdown } from './countdown';

/* ---------- LED dot-matrix countdown digits ---------- */
function LEDDigits({ t, big }: { t: Countdown; big: boolean }) {
  const units = [
    { n: t.d, l: 'DAYS' }, { n: t.h, l: 'HOURS' },
    { n: t.m, l: 'MINS' }, { n: t.s, l: 'SECS' },
  ];
  const fs = big ? 76 : 46;
  const box = big ? 120 : 74;
  return (
    <div style={{ display: 'flex', gap: big ? 14 : 9, justifyContent: 'center' }}>
      {units.map((u) => (
        <div key={u.l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
          <div style={{ width: '100%', minWidth: box * 0.7, height: box, borderRadius: big ? 16 : 11,
            background: 'radial-gradient(circle at 50% 30%, #15224a 0%, #0a1230 100%)',
            border: '3px solid #2c3f66', position: 'relative', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'inset 0 2px 10px rgba(0,0,0,.7)' }}>
            {/* dot-matrix sheen */}
            <div style={{ position: 'absolute', inset: 0, opacity: .35,
              backgroundImage: 'radial-gradient(rgba(255,255,255,.14) 1px, transparent 1.3px)',
              backgroundSize: '7px 7px' }} />
            <span key={u.n} style={{ fontFamily: 'var(--head)', fontSize: fs, lineHeight: 1,
              color: '#ffd23f', textShadow: '0 0 12px rgba(255,210,63,.9), 0 0 26px rgba(255,159,28,.6)',
              animation: 'wchq-digitpop .35s ease-out' }}>
              {String(u.n).padStart(2, '0')}
            </span>
          </div>
          <span style={{ fontFamily: 'var(--head)', fontSize: big ? 13 : 10, letterSpacing: '2px',
            color: '#7fa8e6' }}>{u.l}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Jumbotron (stadium big-screen) ---------- */
export function Jumbotron({ t, big, title }: { t: Countdown; big: boolean; title?: string }) {
  const banner = title || 'WORLD CUP 2026';
  return (
    <div style={{ position: 'relative', borderRadius: big ? 30 : 22,
      background: 'linear-gradient(180deg,#1b2a4a,#13204200)',
      padding: big ? 16 : 11 }}>
      {/* housing */}
      <div style={{ position: 'relative', borderRadius: big ? 24 : 18,
        background: 'linear-gradient(180deg,#0c1838 0%,#0a1330 100%)',
        border: '5px solid #1b2a4a', boxShadow: '6px 7px 0 rgba(0,0,0,.45), inset 0 0 0 3px #243a6a',
        padding: big ? '26px 30px 30px' : '18px 16px 22px', overflow: 'hidden' }}>
        {/* corner bolts */}
        {[[10, 10], [null, 10], [10, null], [null, null]].map((p, i) => (
          <div key={i} style={{ position: 'absolute', width: 9, height: 9, borderRadius: '50%',
            background: '#3a558f', border: '2px solid #0a1330',
            top: p[1] === 10 ? 10 : undefined, bottom: p[1] === null ? 10 : undefined,
            left: p[0] === 10 ? 10 : undefined, right: p[0] === null ? 10 : undefined }} />
        ))}
        {/* scanlines */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: .25,
          background: 'repeating-linear-gradient(0deg, rgba(0,0,0,.5) 0 2px, transparent 2px 4px)' }} />
        {/* title banner */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: big ? 22 : 16, position: 'relative' }}>
          <div className="head" style={{ background: 'var(--sun)', color: 'var(--ink)',
            fontSize: big ? 30 : 19, letterSpacing: '1px', padding: big ? '8px 26px' : '6px 16px',
            borderRadius: 999, border: '3px solid var(--ink)', boxShadow: '3px 3px 0 rgba(0,0,0,.4)',
            whiteSpace: 'nowrap' }}>★ {banner} ★</div>
        </div>
        <div className="head" style={{ textAlign: 'center', color: '#ff5d5d', fontSize: big ? 18 : 13,
          letterSpacing: '3px', marginBottom: big ? 16 : 11,
          textShadow: '0 0 10px rgba(255,93,93,.7)', position: 'relative' }}>
          ● KICK-OFF IN
        </div>
        <div style={{ position: 'relative' }}><LEDDigits t={t} big={big} /></div>
      </div>
    </div>
  );
}
