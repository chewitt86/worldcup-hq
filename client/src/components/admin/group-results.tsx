/* World Cup HQ — ADMIN › Group results (group-stage score entry).
   Mirrors KnockoutResults but for the 12 groups A–L. Each group lists its six
   round-robin fixtures (from GROUP_FIXTURES); a saved score feeds computeStandings,
   so the live tables, qualifiers and the projected bracket all update. Results go
   through the SAME store (setResult / clearResult) keyed "<GROUP>:<i>", exactly
   like knockout ties — the sync layer pushes them to the shared board. */

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useApp } from '../../app/context';
import { useStore, store, selectTeams } from '../../store/store';
import { GROUPS, GROUP_FIXTURES } from '../../data/tournament';
import { Flag } from '../flag';

/* ---------- small form primitives (shared look with the other admin cards) ---------- */
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

/* ---------- GROUP RESULTS MANAGER ---------- */
export function GroupResults({ token }: { token: string }) {
  void token; // results sync via the store + global admin token, not per-panel
  const { ping } = useApp();
  const teams = useStore(selectTeams);
  const results = useStore((s) => s.results);
  const groups = Object.keys(GROUPS);
  const [group, setGroup] = useState(groups[0]);
  const fixtures = GROUP_FIXTURES[group] || [];
  const savedGroupCount = Object.keys(results).filter((k) => /^[A-L]:/.test(k)).length;

  const ScoreBox = ({ i, fx }: { i: number; fx: { id: string; a: string; b: string } }) => {
    const key = fx.id;
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
      store.getState().setResult(group, i, [a, bs]);
      ping(`✅ ${fx.a} ${a}–${bs} ${fx.b}`);
    };
    const box: CSSProperties = { width: 42, textAlign: 'center', fontFamily: 'var(--head)', fontSize: 17, padding: '5px 0',
      borderRadius: 9, border: '3px solid var(--ink)', background: '#fff' };
    const name: CSSProperties = { fontFamily: 'var(--head)', fontSize: 13, flex: 1, minWidth: 0,
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
    return (
      <div className="sticker-sm" style={{ background: 'var(--cream)', padding: '8px 10px', display: 'flex',
        alignItems: 'center', gap: 7, marginBottom: 7 }}>
        <Flag code={fx.a} style={{ width: 22, height: 15 }} />
        <span style={name}>{teams[fx.a]?.name ?? fx.a}</span>
        <input value={a} onChange={(e) => setA(e.target.value.replace(/\D/g, '').slice(0, 2))} style={box} />
        <span className="head" style={{ opacity: .5 }}>–</span>
        <input value={bs} onChange={(e) => setB(e.target.value.replace(/\D/g, '').slice(0, 2))} style={box} />
        <span style={{ ...name, textAlign: 'right' }}>{teams[fx.b]?.name ?? fx.b}</span>
        <Flag code={fx.b} style={{ width: 22, height: 15 }} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
          <button onClick={save} style={{ ...btn('var(--grass)'), padding: '5px 9px', fontSize: 12 }}>Save</button>
          {r && <button onClick={() => { store.getState().clearResult(group, i); ping('↩ Cleared'); }}
            style={{ ...btn('var(--cream2)'), padding: '5px 9px', fontSize: 12 }}>✕</button>}
        </div>
      </div>
    );
  };

  return (
    <AdminCard icon="📊" title="Group results" desc="Enter group-stage scores as games finish" accent="var(--mint)">
      <div className="noscroll" style={{ display: 'flex', gap: 7, overflowX: 'auto', marginBottom: 12 }}>
        {groups.map((g) => (
          <div key={g} className={'navpill tap' + (group === g ? ' active' : '')}
            style={{ fontSize: 12.5, flex: '0 0 auto' }} onClick={() => setGroup(g)}>{g}</div>
        ))}
      </div>
      {fixtures.map((fx, i) => <ScoreBox key={fx.id} i={i} fx={fx} />)}
      <div style={{ fontSize: 11.5, fontWeight: 700, opacity: .6, marginTop: 6 }}>
        {savedGroupCount} group score{savedGroupCount === 1 ? '' : 's'} saved
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, opacity: .55, marginTop: 8 }}>
        Saved group scores update the Group tables, who qualifies, and the projected Knockout bracket.</div>
    </AdminCard>
  );
}
