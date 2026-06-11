/* World Cup HQ — Jumbotron (stadium big-screen).
   Ported from the prototype's home/variantB.jsx (Jumbotron). The pre-tournament
   LED countdown has been retired now the World Cup is live; the big-screen shows
   the title banner and a pulsing LIVE NOW indicator. Only the LED stadium
   Jumbotron used on Home is ported here (Home uses HomeLeaders from the page
   module). */

/* ---------- Jumbotron (stadium big-screen) ---------- */
export function Jumbotron({ big, title }: { big: boolean; title?: string }) {
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
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: big ? 18 : 13, position: 'relative' }}>
          <div className="head pill" style={{ background: 'var(--sun)', color: 'var(--ink)',
            fontSize: big ? 34 : 22, letterSpacing: '1px', padding: big ? '9px 28px' : '7px 18px',
            borderRadius: 999, border: '3px solid var(--ink)', boxShadow: '3px 3px 0 rgba(0,0,0,.4)',
            whiteSpace: 'nowrap' }}>★ {banner} ★</div>
        </div>
        <div className="head" style={{ textAlign: 'center', color: '#ff5d5d', fontSize: big ? 18 : 13,
          letterSpacing: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
          textShadow: '0 0 10px rgba(255,93,93,.7)', position: 'relative' }}>
          <span style={{ width: big ? 12 : 9, height: big ? 12 : 9, borderRadius: '50%', background: '#ff5d5d',
            boxShadow: '0 0 10px rgba(255,93,93,.9)', animation: 'wchq-ledpulse 1.1s infinite',
            display: 'inline-block' }} />
          LIVE NOW
        </div>
      </div>
    </div>
  );
}
