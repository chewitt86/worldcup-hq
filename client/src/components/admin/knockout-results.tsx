/* World Cup HQ — ADMIN › Match results (knockout score entry).
   Ported from home/page-admin.jsx (KnockoutResults), keeping all inline styles,
   classNames, emoji, copy, layout and pixel values identical.

   ARCHITECTURE: results go through the STORE (store.setResult / clearResult /
   clearAllResults). The sync layer auto-pushes them to the shared board once the
   admin token is set, so this panel never POSTs the board itself. Ties are derived
   from buildBracket({ results, teams: selectTeams }) so saved scores flip games to
   "played" and advance winners everywhere (bracket, map, popups). */

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useApp } from '../../app/context';
import { useStore, store, selectTeams } from '../../store/store';
import { buildBracket, type Tie } from '../../lib/bracket';
import { Flag } from '../flag';

/* ---------- small form primitives (ported from page-admin.jsx) ---------- */
function AdminCard({
  icon,
  title,
  desc,
  children,
  accent = 'var(--sun)',
}: {
  icon: ReactNode;
  title: ReactNode;
  desc?: ReactNode;
  children: ReactNode;
  accent?: string;
}) {
  return (
    <div className="sticker" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px',
        background: accent, borderBottom: '4px solid var(--ink)' }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <div>
          <div className="head" style={{ fontSize: 17, lineHeight: 1 }}>{title}</div>
          {desc && <div style={{ fontSize: 11.5, fontWeight: 700, opacity: .7, marginTop: 2 }}>{desc}</div>}
        </div>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}
function btn(bg: string, fg?: string): CSSProperties {
  return { fontFamily: 'var(--head)', fontSize: 14, background: bg, color: fg || 'var(--ink)',
    border: '3px solid var(--ink)', borderRadius: 12, padding: '9px 16px', cursor: 'pointer',
    boxShadow: '2px 3px 0 rgba(27,42,74,.7)', letterSpacing: '.5px' };
}

/* ---------- KNOCKOUT RESULTS MANAGER ---------- */
export function KnockoutResults({ token }: { token: string }) {
  void token; // results sync via the store + global admin token, not per-panel
  const { ping } = useApp();
  const teams = useStore(selectTeams);
  const results = useStore((s) => s.results);
  const b = useMemo(() => buildBracket({ results, teams }), [results, teams]);
  const ROUNDS = [
    { id: 'R32', label: 'Round of 32', ties: b.r32 },
    { id: 'R16', label: 'Last 16', ties: b.r16 },
    { id: 'QF', label: 'Quarters', ties: b.qf },
    { id: 'SF', label: 'Semis', ties: b.sf },
    { id: 'Final', label: 'Final', ties: [b.final] },
  ];
  const [round, setRound] = useState('R32');
  const cur = ROUNDS.find((r) => r.id === round) || ROUNDS[0];

  const ScoreBox = ({ stage, i, tie }: { stage: string; i: number; tie: Tie }) => {
    const key = stage + ':' + i;
    const r = results[key];
    const [a, setA] = useState<string>(r ? String(r.score[0]) : '');
    const [bs, setB] = useState<string>(r ? String(r.score[1]) : '');
    useEffect(() => {
      const rr = store.getState().results[key];
      setA(rr ? String(rr.score[0]) : '');
      setB(rr ? String(rr.score[1]) : '');
    }, [key, !!r]);
    const save = () => {
      if (a === '' || bs === '') return;
      store.getState().setResult(stage, i, [a, bs]);
      ping(`✅ ${tie.a} ${a}–${bs} ${tie.b}`);
    };
    const box: CSSProperties = { width: 42, textAlign: 'center', fontFamily: 'var(--head)', fontSize: 17, padding: '5px 0',
      borderRadius: 9, border: '3px solid var(--ink)', background: '#fff' };
    return (
      <div className="sticker-sm" style={{ background: 'var(--cream)', padding: '8px 10px', display: 'flex',
        alignItems: 'center', gap: 7, marginBottom: 7 }}>
        <Flag code={tie.a} style={{ width: 22, height: 15 }} />
        <span className="head" style={{ fontSize: 13, width: 34 }}>{tie.a}</span>
        <input value={a} onChange={(e) => setA(e.target.value.replace(/\D/g, '').slice(0, 2))} style={box} />
        <span className="head" style={{ opacity: .5 }}>–</span>
        <input value={bs} onChange={(e) => setB(e.target.value.replace(/\D/g, '').slice(0, 2))} style={box} />
        <span className="head" style={{ fontSize: 13, width: 34, textAlign: 'right' }}>{tie.b}</span>
        <Flag code={tie.b} style={{ width: 22, height: 15 }} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
          <button onClick={save} style={{ ...btn('var(--grass)'), padding: '5px 9px', fontSize: 12 }}>Save</button>
          {r && <button onClick={() => { store.getState().clearResult(stage, i); ping('↩ Cleared'); }}
            style={{ ...btn('var(--cream2)'), padding: '5px 9px', fontSize: 12 }}>✕</button>}
        </div>
      </div>
    );
  };

  return (
    <AdminCard icon="🏆" title="Match results" desc="Enter scores as games finish" accent="var(--orange)">
      <div className="noscroll" style={{ display: 'flex', gap: 7, overflowX: 'auto', marginBottom: 12 }}>
        {ROUNDS.map((r) => (
          <div key={r.id} className={'navpill tap' + (round === r.id ? ' active' : '')}
            style={{ fontSize: 12.5, flex: '0 0 auto' }} onClick={() => setRound(r.id)}>{r.label}</div>
        ))}
      </div>
      {cur.ties.map((tie, i) => <ScoreBox key={i} stage={round} i={i} tie={tie} />)}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, opacity: .6 }}>
          {Object.keys(results).length} result{Object.keys(results).length === 1 ? '' : 's'} saved
        </span>
        {Object.keys(results).length > 0 && (
          <button onClick={() => { if (confirm('Clear all entered scores?')) { store.getState().clearAllResults(); ping('↩ All cleared'); } }}
            style={{ ...btn('var(--tomato)', '#fff'), marginLeft: 'auto', padding: '6px 11px', fontSize: 12 }}>Clear all</button>
        )}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, opacity: .55, marginTop: 8 }}>
        Saved scores show on the Knockout bracket, Map ties & game popups, and decide who advances.</div>
    </AdminCard>
  );
}
