/* World Cup HQ — shared page chrome: titles, tier badges, odds pills, backers */
import type { ReactNode } from 'react';
import type { Person } from '../data/teams';
import { backers } from '../data/tournament';
import { useStore, selectTeams } from '../store/store';
import { Avatar } from './avatar';

/* Big outlined page title used at the top of each section. */
export function PageTitle({
  children,
  sub,
  accent = 'var(--sun)',
}: {
  children: ReactNode;
  sub?: ReactNode;
  accent?: string;
}) {
  return (
    <div style={{ margin: '2px 0 2px' }}>
      <h1 className="head" style={{ color: 'var(--cream)', fontSize: 'clamp(30px,8vw,52px)',
        lineHeight: .92, letterSpacing: '1px',
        WebkitTextStroke: '4px var(--ink)', paintOrder: 'stroke fill',
        textShadow: '0 5px 0 var(--ink), 4px 8px 0 rgba(27,42,74,.3)' }}>
        {children}
      </h1>
      {sub && (
        <div className="head pill" style={{ marginTop: 10,
          background: accent, color: 'var(--ink)', fontSize: 14, letterSpacing: '.5px',
          padding: '6px 14px', borderRadius: 999, border: '3px solid var(--ink)',
          boxShadow: '2px 3px 0 rgba(27,42,74,.7)' }}>{sub}</div>
      )}
    </div>
  );
}

/* Tier badge (Favourite / Contender / Dark horse / Host / Outsider / Longshot) */
export const TIER_COLOUR: Record<string, string> = {
  'Favourite': 'var(--sun)',
  'Contender': 'var(--mint)',
  'Dark horse': 'var(--grape)',
  'Host': 'var(--blue)',
  'Outsider': 'var(--orange)',
  'Longshot': 'var(--pink)',
};

/* Sweepstake-pot marker: a gold ⭐ on "best" teams, an UNDERDOG badge on "worst". */
export function DrawTier({ code }: { code: string }) {
  const teams = useStore(selectTeams);
  const worst = teams[code]?.worst;
  return (
    <span className="head pill" title={worst ? 'A "worst-pot" underdog' : 'A "best-pot" team'}
      style={{ background: worst ? 'var(--tomato)' : 'var(--sun)', color: worst ? '#fff' : 'var(--ink)',
        fontSize: 10, letterSpacing: '.5px', padding: '5px 9px', borderRadius: 999,
        border: '2.5px solid var(--ink)', boxShadow: '1.5px 2px 0 rgba(27,42,74,.7)' }}>
      {worst ? '🐶 UNDERDOG' : '⭐ BEST'}</span>
  );
}

export function TierBadge({ tier, small }: { tier: string; small?: boolean }) {
  return (
    <span className="head" style={{ display: 'inline-flex', alignItems: 'center',
      lineHeight: 1, background: TIER_COLOUR[tier] || 'var(--cream2)',
      color: 'var(--ink)', fontSize: small ? 10 : 12, letterSpacing: '.5px',
      padding: small ? '5px 9px' : '6px 11px', borderRadius: 999,
      border: '2.5px solid var(--ink)', whiteSpace: 'nowrap',
      boxShadow: '1.5px 2px 0 rgba(27,42,74,.7)' }}>{tier}</span>
  );
}

/* Odds pill — playful, never betting-styled.
   Odds are read through the store's `selectTeams` selector so that any
   admin odds-edits show up live. */
export function OddsPill({ code, label = 'to win' }: { code: string; label?: string }) {
  const teams = useStore(selectTeams);
  const odds = teams[code]?.odds || '—';
  return (
    <span className="head" style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
      lineHeight: 1, background: 'var(--ink)', color: 'var(--sun)', fontSize: 13,
      padding: '5px 11px', borderRadius: 999, border: '2.5px solid var(--ink)' }}>
      <span style={{ fontSize: 14, lineHeight: 1 }}>{odds}</span>
      <span style={{ fontSize: 9, lineHeight: 1, color: 'var(--cream)', opacity: .75,
        letterSpacing: '.3px', paddingTop: 1 }}>{label}</span>
    </span>
  );
}

/* Mini stack of backer avatars */
export function Backers({
  code,
  people,
  max = 5,
  onPerson,
}: {
  code: string;
  people?: Person[];
  max?: number;
  onPerson?: (p: Person) => void;
}) {
  const list = backers(code, people);
  if (!list.length) return <span style={{ fontSize: 12, fontWeight: 700, opacity: .55 }}>Nobody yet</span>;
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {list.slice(0, max).map((p, i) => (
        <div key={p.id} className={onPerson ? 'tap' : ''} onClick={onPerson ? () => onPerson(p) : undefined}
          style={{ marginLeft: i ? -10 : 0, zIndex: max - i }}>
          <Avatar person={p} size={28} />
        </div>
      ))}
      {list.length > max && (
        <span style={{ marginLeft: 6, fontFamily: 'var(--head)', fontSize: 13 }}>+{list.length - max}</span>
      )}
    </div>
  );
}
