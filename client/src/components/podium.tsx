/* World Cup HQ — Sweepstake podium. Ranks the top 3 TEAMS by points (each shown
   with its owner, so a player can appear twice). Before the competition starts,
   each place is just a "?". */

import { useApp } from '../app/context';
import { backers } from '../data/tournament';
import { rankTeams, teamPoints, type ScoreCtx } from '../lib/scoring';
import { Flag } from './flag';
import { Avatar } from './avatar';

const META = [
  { h: 70, medal: '🥈', col: '#d7dde6' },    // left   = 2nd
  { h: 100, medal: '🥇', col: 'var(--sun)' }, // centre = 1st
  { h: 50, medal: '🥉', col: '#f0b173' },     // right  = 3rd
];

export function Podium({ ctx, started }: { ctx: ScoreCtx; started: boolean }) {
  const app = useApp();
  const top = started ? rankTeams(Object.keys(ctx.teams), ctx).slice(0, 3) : [];
  const slots = [top[1] ?? null, top[0] ?? null, top[2] ?? null]; // visual order 2nd,1st,3rd

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 12 }}>
      {slots.map((code, i) => {
        const m = META[i];
        const owner = code ? backers(code, app.people)[0] : null;
        const big = i === 1;
        return (
          <div key={i} className={code ? 'tap' : ''} onClick={code ? () => app.openTeam(code) : undefined}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1, maxWidth: 104 }}>
            <div style={{ fontSize: big ? 26 : 20 }}>{m.medal}</div>
            {code ? (
              <>
                <div className={big ? 'anim-bob' : ''}>
                  <Flag code={code} style={{ width: big ? 50 : 42, height: big ? 35 : 30,
                    borderRadius: 6, boxShadow: '2px 2px 0 rgba(0,0,0,.4)' }} />
                </div>
                <div className="head" style={{ fontSize: 13, lineHeight: 1, textAlign: 'center' }}>
                  {ctx.teams[code]?.name ?? code}</div>
                {owner && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Avatar person={owner} size={18} ring={false} />
                    <span style={{ fontSize: 11, fontWeight: 700, opacity: .8 }}>{owner.name}</span>
                  </div>
                )}
              </>
            ) : (
              <div style={{ width: big ? 48 : 40, height: big ? 48 : 40, borderRadius: '50%',
                border: '3px solid var(--ink)', background: '#cfd8e6', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--head)',
                fontSize: big ? 26 : 22, color: 'var(--ink)' }}>?</div>
            )}
            <div className="sticker-sm" style={{ width: '100%', height: m.h, background: m.col,
              borderTopLeftRadius: 10, borderTopRightRadius: 10, borderBottom: 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
              paddingTop: 8 }}>
              <span style={{ fontFamily: 'var(--head)', fontSize: 22, color: 'var(--ink)' }}>
                {code ? teamPoints(code, ctx) : '?'}</span>
              <span style={{ fontFamily: 'var(--head)', fontSize: 10, opacity: .65 }}>PTS</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
