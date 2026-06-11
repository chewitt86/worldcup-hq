/* World Cup HQ — latest-result card.
   A compact sticker for a FINISHED fixture, mirroring NextUpCard's look but
   showing the score (winner highlighted, loser dimmed) instead of a kick-off
   time and remind toggle. Reads a shared-board Fixture directly. */

import { Flag } from './flag';
import { dayLabel } from '../lib/fixtures';
import type { Fixture } from '../store/types';
import type { Team } from '../data/teams';

export function ResultCard({
  f,
  teams,
  compact = false,
}: {
  f: Fixture;
  teams: Record<string, Team>;
  compact?: boolean;
}) {
  const aWin = f.as != null && f.bs != null && f.as > f.bs;
  const bWin = f.as != null && f.bs != null && f.bs > f.as;
  const name = (c: string) => teams[c]?.name ?? c;

  return (
    <div className="sticker" style={{ padding: compact ? '12px 14px' : '16px 18px',
      background: 'var(--cream)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--head)',
        fontSize: 12, color: 'var(--ink-soft)' }}>
        <span style={{ background: 'var(--grass)', color: '#fff', padding: '2px 8px', borderRadius: 8,
          border: '2px solid var(--ink)' }}>FT</span>
        <span style={{ opacity: .7 }}>{f.label} · {dayLabel(f.ts)}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8, margin: '12px 0 8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1,
          opacity: bWin ? .55 : 1 }}>
          <Flag code={f.a} style={{ width: 46, height: 33, borderRadius: 6 }} />
          <span style={{ fontFamily: 'var(--head)', fontSize: 15 }}>{name(f.a)}</span>
        </div>
        <div className="head" style={{ fontSize: 22, color: 'var(--ink)', background: 'var(--cream2)',
          border: '2.5px solid var(--ink)', borderRadius: 9, padding: '2px 11px', flex: '0 0 auto' }}>
          {f.as}–{f.bs}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1,
          opacity: aWin ? .55 : 1 }}>
          <Flag code={f.b} style={{ width: 46, height: 33, borderRadius: 6 }} />
          <span style={{ fontFamily: 'var(--head)', fontSize: 15 }}>{name(f.b)}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, opacity: .6 }}>📍 {f.venue || 'Venue TBC'}</span>
      </div>
    </div>
  );
}
