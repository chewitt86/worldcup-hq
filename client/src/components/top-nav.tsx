/* World Cup HQ — top navigation chrome.
   Ported byte-for-byte from the prototype's home/widgets.jsx (TopNav). */

import { Wobbles } from './mascot';

/* ---------- Top nav ---------- */
export function TopNav({
  active = 'Home',
  device = 'mobile',
  dark = false,
  onNav,
  onLogo,
  onAdmin,
}: {
  active?: string;
  device?: string;
  dark?: boolean;
  onNav?: (it: string) => void;
  onLogo?: () => void;
  onAdmin?: () => void;
}) {
  const items = ['Home', 'Schedule', 'Sweepstake', 'Teams', 'Groups', 'Knockout', 'Map'];
  const mobile = device === 'mobile';

  const logo = (
    <div className="tap" onClick={() => onLogo && onLogo()}
      style={{ display: 'flex', alignItems: 'center', gap: 9, flex: '0 0 auto' }}>
      <div className="anim-bob"><Wobbles size={mobile ? 38 : 46} /></div>
      <div style={{ fontFamily: 'var(--head)', lineHeight: .82,
        color: dark ? 'var(--cream)' : 'var(--ink)', fontSize: mobile ? 15 : 19,
        textShadow: dark ? '0 2px 0 rgba(0,0,0,.3)' : 'none' }}>
        LEO'S<br />WORLD&nbsp;CUP
      </div>
    </div>
  );

  /* pills never shrink, so the row scrolls horizontally instead of cramping. */
  const pills = (
    <div className="noscroll" style={{ display: 'flex', gap: 8, overflowX: 'auto',
      flex: mobile ? undefined : 1, width: mobile ? '100%' : undefined,
      justifyContent: mobile ? 'flex-start' : 'flex-end', padding: '4px 2px' }}>
      {items.map((it) => (
        <div key={it} className={'navpill tap' + (it === active ? ' active' : '')}
          onClick={() => onNav && onNav(it)} style={{ flex: '0 0 auto' }}>{it}</div>
      ))}
    </div>
  );

  const cog = onAdmin && (
    <div className={'navpill tap' + (active === 'Admin' ? ' active' : '')} onClick={onAdmin}
      title="Admin" style={{ flex: '0 0 auto', padding: mobile ? '9px 12px' : '9px 14px' }}>⚙️</div>
  );

  /* Mobile: logo + cog on top, the pill strip on its own full-width row below
     (so the 7 sections have room and scroll smoothly instead of cramping). */
  if (mobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, width: '100%' }}>
          {logo}
          {cog}
        </div>
        {pills}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
      {logo}
      {pills}
      {cog}
    </div>
  );
}
