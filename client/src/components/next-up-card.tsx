/* World Cup HQ — next-up match card.
   Ported byte-for-byte from the prototype's home/widgets.jsx (NextUpCard).
   Reminder state comes from useApp (reminders / toggleReminder / ping); callers
   may still pass explicit `reminded` / `onReminder` to override, matching the
   prototype's HomePage wiring. */

import { Flag } from './flag';
import { TEAMS, type NextUpItem } from '../data/teams';
import { useApp } from '../app/context';

/* ---------- Next-up match card ---------- */
export function NextUpCard({
  m,
  onReminder,
  reminded,
  compact = false,
}: {
  m: NextUpItem;
  onReminder?: (m: NextUpItem) => void;
  reminded?: boolean;
  compact?: boolean;
}) {
  const app = useApp();
  const T = TEAMS;
  const id = `${m.a}-${m.b}`;
  const isReminded = reminded !== undefined ? reminded : app.reminders.has(id);
  const handleReminder = () => {
    if (onReminder) { onReminder(m); return; }
    const has = app.reminders.has(id);
    app.toggleReminder(id);
    app.ping(has ? `🔕 Reminder off for ${m.a} v ${m.b}` : `🔔 Reminder set for ${m.a} v ${m.b}!`);
  };
  return (
    <div className="sticker" style={{ padding: compact ? '12px 14px' : '16px 18px',
      background: m.featured ? 'var(--cream2)' : 'var(--cream)', position: 'relative', overflow: 'hidden' }}>
      {m.featured && (
        <div style={{ position: 'absolute', top: 10, right: -34, transform: 'rotate(34deg)',
          background: 'var(--tomato)', color: '#fff', fontFamily: 'var(--head)', fontSize: 11,
          padding: '3px 38px', letterSpacing: '1px', border: '2px solid var(--ink)' }}>OPENER</div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--head)',
        fontSize: 12, color: 'var(--ink-soft)' }}>
        <span style={{ background: 'var(--blue)', color: '#fff', padding: '2px 8px', borderRadius: 8,
          border: '2px solid var(--ink)' }}>{m.group}</span>
        <span style={{ opacity: .7 }}>{m.date} · {m.time}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8, margin: '12px 0 8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
          <Flag code={m.a} style={{ width: 46, height: 33, borderRadius: 6 }} />
          <span style={{ fontFamily: 'var(--head)', fontSize: 15 }}>{T[m.a]?.name}</span>
        </div>
        <div style={{ fontFamily: 'var(--head)', fontSize: 24, color: 'var(--tomato)' }}>VS</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
          <Flag code={m.b} style={{ width: 46, height: 33, borderRadius: 6 }} />
          <span style={{ fontFamily: 'var(--head)', fontSize: 15 }}>{T[m.b]?.name}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, opacity: .6 }}>📍 {m.venue}</span>
        <div className="tap" onClick={handleReminder}
          style={{ fontFamily: 'var(--head)', fontSize: 12,
            background: isReminded ? 'var(--grass)' : 'var(--sun)',
            border: '2.5px solid var(--ink)', borderRadius: 999, padding: '5px 12px',
            boxShadow: isReminded ? '2px 2px 0 rgba(27,42,74,.8)' : '2px 2px 0 rgba(27,42,74,.8)',
            whiteSpace: 'nowrap', transition: 'background .15s' }}>
          {isReminded ? '✅ Reminded' : '🔔 Remind me'}</div>
      </div>
    </div>
  );
}
