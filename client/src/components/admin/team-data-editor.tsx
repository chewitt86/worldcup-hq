/* World Cup HQ — ADMIN › Edit team data.
   Ported from home/page-admin.jsx (TeamDataEditor), keeping all inline styles,
   classNames, emoji, copy, layout and pixel values identical.

   ARCHITECTURE: team edits go through the STORE (store.editTeam(code, patch)),
   which writes `teamEdits` and (on an odds change) bumps `bracketNonce` so the
   projected bracket re-seeds live. The sync layer auto-pushes the board once the
   admin token is set, so this panel never POSTs the board itself. Team display
   data is read through `selectTeams` so edits show up everywhere immediately. */

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useApp } from '../../app/context';
import { useStore, store, selectTeams } from '../../store/store';
import type { TeamEdit } from '../../store/types';

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
function Field({ label, children, hint }: { label: ReactNode; children: ReactNode; hint?: ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 13 }}>
      <div className="head" style={{ fontSize: 12, letterSpacing: '.5px', marginBottom: 5, opacity: .85 }}>{label}</div>
      {children}
      {hint && <div style={{ fontSize: 11, fontWeight: 600, opacity: .55, marginTop: 4 }}>{hint}</div>}
    </label>
  );
}
const inputStyle: CSSProperties = {
  width: '100%', fontFamily: 'var(--body)', fontWeight: 700, fontSize: 15,
  padding: '9px 12px', borderRadius: 11, border: '3px solid var(--ink)',
  background: '#fff', color: 'var(--ink)', outline: 'none',
};

/* editable string fields the draft tracks (mirrors the prototype). */
type DraftKey = 'name' | 'odds' | 'titles' | 'fact' | 'squad';

/* ---------- TEAM DATA EDITOR ---------- */
export function TeamDataEditor({ token }: { token: string }) {
  void token; // team edits sync via the store + global admin token, not per-panel
  const { ping } = useApp();
  const teamsMap = useStore(selectTeams);
  const codes = useMemo(
    () => Object.keys(teamsMap).sort((a, b) => teamsMap[a].name.localeCompare(teamsMap[b].name)),
    [teamsMap],
  );
  const [code, setCode] = useState(codes[0]);
  const t = teamsMap[code] || teamsMap[codes[0]];
  const tiers = ['Favourite', 'Contender', 'Dark horse', 'Host', 'Outsider', 'Longshot'];
  const [draft, setDraft] = useState<Partial<Record<DraftKey, string>>>({});
  useEffect(() => {
    setDraft({ name: t.name, odds: t.odds, titles: t.titles || '', fact: t.fact || '', squad: t.squad || '' });
  }, [code]);
  const commit = (k: DraftKey) => {
    const v = draft[k];
    if (v !== undefined && v !== (t[k] as string | undefined)) {
      const patch: TeamEdit = {};
      patch[k] = v;
      store.getState().editTeam(code, patch);
      ping(`✏️ Updated ${t.name}`);
    }
  };
  const set = (k: DraftKey, v: string) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <AdminCard icon="✏️" title="Edit team data" desc="Fix any wrong details" accent="var(--pink)">
      <Field label="Team">
        <select value={code} onChange={(e) => setCode(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
          {codes.map((c) => <option key={c} value={c}>{teamsMap[c].name} ({c})</option>)}
        </select>
      </Field>
      <div style={{ display: 'flex', gap: 10 }}>
        <Field label="Name"><input value={draft.name || ''} onChange={(e) => set('name', e.target.value)}
          onBlur={() => commit('name')} style={inputStyle} /></Field>
        <div style={{ width: 110, flex: '0 0 auto' }}>
          <Field label="Odds" hint="e.g. 8/1"><input value={draft.odds || ''} onChange={(e) => set('odds', e.target.value)}
            onBlur={() => commit('odds')} style={{ ...inputStyle, textAlign: 'center' }} /></Field>
        </div>
      </div>
      <Field label="Tier">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {tiers.map((tr) => (
            <div key={tr} className={'navpill tap' + (t.tier === tr ? ' active' : '')}
              onClick={() => { store.getState().editTeam(code, { tier: tr }); ping(`✏️ Updated ${t.name}`); }}
              style={{ fontSize: 12, flex: '0 0 auto' }}>{tr}</div>
          ))}
        </div>
      </Field>
      <Field label="Titles / honours"><input value={draft.titles || ''} onChange={(e) => set('titles', e.target.value)}
        onBlur={() => commit('titles')} style={inputStyle} /></Field>
      <Field label="Fun fact"><textarea value={draft.fact || ''} onChange={(e) => set('fact', e.target.value)}
        onBlur={() => commit('fact')} rows={2} style={{ ...inputStyle, resize: 'vertical' }} /></Field>
      <Field label="FIFA squad URL" hint="Where the team's squad link points.">
        <input value={draft.squad || ''} onChange={(e) => set('squad', e.target.value)}
          onBlur={() => commit('squad')} style={{ ...inputStyle, fontSize: 12 }} /></Field>
      {draft.squad && (
        <a href={draft.squad} target="_blank" rel="noopener noreferrer"
          style={{ fontFamily: 'var(--head)', fontSize: 12, color: 'var(--blue)' }}>↗ test this link</a>
      )}
    </AdminCard>
  );
}
