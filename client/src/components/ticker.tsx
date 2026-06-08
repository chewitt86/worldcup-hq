/* World Cup HQ — LED score ticker (marquee).
   Ported byte-for-byte from the prototype's home/widgets.jsx (TickerItem + Ticker). */

import { Flag } from './flag';
import type { TickerItem as TickerItemData } from '../data/teams';

/* ---------- Single ticker entry ---------- */
export function TickerItem({ m, led }: { m: TickerItemData; led?: boolean }) {
  const stroke = led ? { color: '#ffd23f', textShadow: '0 0 8px rgba(255,210,63,.6)' } : {};
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 20px',
      borderRight: led ? '1px solid rgba(255,210,63,.25)' : '2px solid rgba(27,42,74,.12)',
      fontFamily: 'var(--head)', fontSize: 15, whiteSpace: 'nowrap',
      color: led ? '#ffd23f' : 'var(--ink)' }}>
      {!led && <Flag code={m.a} style={{ width: 20, height: 14 }} />}
      <span>{m.a}</span>
      {m.type === 'result'
        ? <span style={{ ...stroke, padding: '0 2px' }}>{m.as}–{m.bs}</span>
        : <span style={{ opacity: .6, fontSize: 12 }}>v</span>}
      <span>{m.b}</span>
      {!led && <Flag code={m.b} style={{ width: 20, height: 14 }} />}
      <span style={{ fontFamily: 'var(--body)', fontWeight: 700, fontSize: 11,
        opacity: led ? .8 : .55, marginLeft: 2 }}>
        {m.type === 'soon' ? m.when : m.tag}
      </span>
    </div>
  );
}

/* ---------- Marquee of ticker entries ---------- */
export function Ticker({ items, led = false, speed = 34 }: {
  items: TickerItemData[];
  led?: boolean;
  speed?: number;
}) {
  const row = [...items, ...items];
  return (
    <div style={{ overflow: 'hidden', width: '100%' }}>
      <div style={{ display: 'inline-flex', animation: `wchq-marquee ${speed}s linear infinite`,
        willChange: 'transform' }}>
        {row.map((m, i) => <TickerItem key={i} m={m} led={led} />)}
      </div>
    </div>
  );
}
