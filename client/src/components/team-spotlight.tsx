/* World Cup HQ — a small "spotlight" sticker card for a single team (with its
   owner), or a "?" hero when the team isn't decided yet. Reused for the
   Best-of-the-Worst and the Runner-up sections. Tapping opens the team popup. */

import type { ReactNode } from 'react';
import { useApp } from '../app/context';
import { useStore, selectTeams } from '../store/store';
import { backers } from '../data/tournament';
import { Flag } from './flag';
import { Avatar } from './avatar';

export function TeamSpotlight({
  title,
  accent = 'var(--sun)',
  code,
  subtitle,
}: {
  title: ReactNode;
  accent?: string;
  code: string | null;
  subtitle?: ReactNode;
}) {
  const app = useApp();
  const teams = useStore(selectTeams);
  const owners = code ? backers(code, app.people) : [];

  return (
    <div className="sticker" style={{ position: 'relative', padding: '13px 15px', overflow: 'hidden',
      background: 'radial-gradient(circle at 28% 18%, #2a3e72, #0c1838)', border: `4px solid ${accent}`,
      boxShadow: '0 0 20px rgba(255,210,63,.28), 4px 5px 0 rgba(0,0,0,.4)',
      display: 'flex', alignItems: 'center', gap: 14 }}>
      {code ? (
        <>
          <div className="tap" onClick={() => app.openTeam(code)} style={{ flex: '0 0 auto' }}>
            <Flag code={code} style={{ width: 54, height: 38, borderRadius: 7,
              boxShadow: '2px 2px 0 rgba(0,0,0,.4)' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="head" style={{ color: accent, fontSize: 11, letterSpacing: '1px' }}>{title}</div>
            <div className="tap head" onClick={() => app.openTeam(code)}
              style={{ color: '#fff', fontSize: 20, marginTop: 3, lineHeight: 1 }}>{teams[code]?.name ?? code}</div>
            {subtitle && <div style={{ color: '#9fb2d4', fontWeight: 700, fontSize: 12.5, marginTop: 4 }}>{subtitle}</div>}
            {owners.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7, flexWrap: 'wrap' }}>
                {owners.map((p) => (
                  <div key={p.id} className="tap" onClick={() => app.openPerson(p)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Avatar person={p} size={20} ring={false} />
                    <span style={{ color: '#cdd8ee', fontWeight: 700, fontSize: 12 }}>{p.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 42, lineHeight: 1, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.4))' }}>❓</div>
          <div style={{ flex: 1 }}>
            <div className="head" style={{ color: accent, fontSize: 11, letterSpacing: '1px' }}>{title}</div>
            <div className="head" style={{ color: '#fff', fontSize: 18, marginTop: 3 }}>To be decided!</div>
            <div style={{ color: '#9fb2d4', fontWeight: 700, fontSize: 12.5, marginTop: 3 }}>
              Decided once the games kick off. ⚽</div>
          </div>
        </>
      )}
    </div>
  );
}
