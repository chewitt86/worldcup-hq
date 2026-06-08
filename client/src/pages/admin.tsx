/* World Cup HQ — ADMIN page: login gate + manage people, settings & data source.
   Ported from the prototype's home/page-admin.jsx, keeping all inline styles,
   classNames, emoji, copy, layout and pixel/number values identical to the
   prototype and the screenshots (08-admin-login.png, 09-admin.png).

   KEY ARCHITECTURE CHANGE vs the prototype (which was localStorage-only):
   - LOGIN authenticates against the SERVER (POST /api/admin/login → { token })
     via adminLogin(); on success we store the bearer token (setAdminToken, so the
     sync layer can push the board) AND flip useApp().setAdminAuthed(true), keeping
     the token in component state to hand to the server-backed panels. A wrong
     password triggers the wobble-shake. The "GROWN-UPS ONLY" PIN UI is unchanged —
     it simply posts the typed value to the server.
   - People / tournament settings / match results / team edits all go through the
     STORE actions; the sync layer auto-pushes those to the shared board once the
     admin token is set, so this page never POSTs the board itself.
   - API keys stay SERVER-SIDE: the ApiConnections panel (passed the token) reads a
     masked config and never round-trips a raw key to the browser. */

import { Fragment, useState, useEffect, type CSSProperties, type ReactNode } from 'react';
import { useApp } from '../app/context';
import { useStore, store, selectTeams } from '../store/store';
import { setAdminToken } from '../store/sync';
import { adminLogin } from '../lib/admin-api';
import type { Person, Team } from '../data/teams';
import { Wobbles } from '../components/mascot';
import { Avatar } from '../components/avatar';
import { Flag } from '../components/flag';
import { PageTitle } from '../components/labels';
import { ApiConnections } from '../components/admin/api-connections';
import { GroupResults } from '../components/admin/group-results';
import { KnockoutResults } from '../components/admin/knockout-results';
import { TeamDataEditor } from '../components/admin/team-data-editor';

/* ---------- small form primitives ---------- */
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
function btn(bg: string, fg?: string): CSSProperties {
  return { fontFamily: 'var(--head)', fontSize: 14, background: bg, color: fg || 'var(--ink)',
    border: '3px solid var(--ink)', borderRadius: 12, padding: '9px 16px', cursor: 'pointer',
    boxShadow: '2px 3px 0 rgba(27,42,74,.7)', letterSpacing: '.5px' };
}

/* colour swatches for a player (mirrors the store's private palette). */
const PALETTE = ['#36a9ff', '#9b6cf0', '#ff8fd0', '#ff9f1c', '#2fe0c0', '#ff5d5d', '#ffd23f', '#46b94a'];

/* odds → number (lower = stronger), used to sort the team chips like the prototype. */
function oddsNum(code: string, teams: Record<string, Team>): number {
  const o = (teams[code] && teams[code].odds) || '999/1';
  return parseInt(o.split('/')[0], 10) || 999;
}

/* ---------- LOGIN ---------- */
function AdminLogin({ onSuccess }: { onSuccess: (token: string) => void }) {
  const [val, setVal] = useState('');
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (busy) return;
    setBusy(true);
    const r = await adminLogin(val);
    setBusy(false);
    if (r.ok && r.token) {
      onSuccess(r.token);
    } else {
      setErr(true); setVal(''); setTimeout(() => setErr(false), 600);
    }
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', gap: 18 }}>
      <div className="anim-bob"><Wobbles size={92} /></div>
      <div className="sticker" style={{ padding: 26, width: '100%', maxWidth: 320, textAlign: 'center',
        animation: err ? 'wchq-wobble .3s 2' : 'none' }}>
        <div className="head" style={{ fontSize: 24 }}>🔒 GROWN-UPS ONLY</div>
        <div style={{ fontWeight: 700, fontSize: 13, opacity: .65, margin: '6px 0 16px' }}>
          Enter the secret PIN to manage the sweepstake.</div>
        <input value={val} onChange={(e) => setVal(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          inputMode="numeric" placeholder="••••" autoFocus
          style={{ ...inputStyle, textAlign: 'center', fontFamily: 'var(--head)', fontSize: 30,
            letterSpacing: '10px', borderColor: err ? 'var(--tomato)' : 'var(--ink)' }} />
        <button onClick={submit} style={{ ...btn('var(--sun)'), width: '100%', marginTop: 14, fontSize: 16 }}>
          UNLOCK →</button>
        <div style={{ fontSize: 11, fontWeight: 600, opacity: .5, marginTop: 12 }}>
          {err ? '❌ Wrong PIN — try again!' : 'psst… the demo PIN is 1966'}</div>
      </div>
    </div>
  );
}

/* ---------- PERSON EDITOR ---------- */
/* Read an image file and shrink it to a small square-ish JPEG data URL, so a
   player photo stays tiny in the shared board (a few KB), not megabytes. */
function resizeImageToDataUrl(file: File, max = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read failed'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('decode failed'));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('no canvas'));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function PersonEditor({ p }: { p: Person }) {
  const app = useApp();
  const teams = useStore(selectTeams);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(p.name);
  useEffect(() => { setName(p.name); }, [p.name]);
  const allCodes = Object.keys(teams).sort((a, b) => oddsNum(a, teams) - oddsNum(b, teams));
  const stillIn = p.teams.length - p.out.length;

  const toggleTeam = (c: string) => {
    const has = p.teams.includes(c);
    const nextTeams = has ? p.teams.filter((x) => x !== c) : [...p.teams, c];
    const out = has ? p.out.filter((x) => x !== c) : p.out;
    const best = p.best === c && has ? (nextTeams[0] || '') : p.best;
    store.getState().updatePerson(p.id, { teams: nextTeams, out, best });
  };

  return (
    <div className="sticker-sm" style={{ background: 'var(--cream)', overflow: 'hidden', marginBottom: 10 }}>
      {/* row header */}
      <div className="tap" onClick={() => setOpen((o) => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 13px' }}>
        <Avatar person={p} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="head" style={{ fontSize: 16 }}>{p.name}</div>
          <div style={{ fontSize: 11, fontWeight: 700, opacity: .6 }}>✅ {stillIn} in · ❌ {p.out.length} out · {p.points} pts</div>
        </div>
        <span className="head" style={{ fontSize: 14, opacity: .5, transition: 'transform .2s',
          transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
      </div>

      {open && (
        <div style={{ padding: '4px 13px 14px', borderTop: '2px dashed rgba(27,42,74,.15)' }}>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)}
              onBlur={() => store.getState().updatePerson(p.id, { name })} style={inputStyle} /></Field>
            <div style={{ width: 92, flex: '0 0 auto' }}>
              <Field label="Points"><input type="number" value={p.points}
                onChange={(e) => store.getState().updatePerson(p.id, { points: parseInt(e.target.value) || 0 })}
                style={{ ...inputStyle, textAlign: 'center' }} /></Field>
            </div>
          </div>

          <Field label="Colour">
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {PALETTE.map((c) => (
                <div key={c} className="tap" onClick={() => store.getState().updatePerson(p.id, { colour: c })}
                  style={{ width: 30, height: 30, borderRadius: '50%', background: c,
                    border: p.colour === c ? '4px solid var(--ink)' : '3px solid rgba(27,42,74,.3)',
                    boxShadow: p.colour === c ? '0 0 0 2px var(--sun)' : 'none' }} />
              ))}
            </div>
          </Field>

          <Field label="Photo" hint="Shown on the big avatars (cards, podium); small avatars keep the initials.">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar person={p} size={62} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <label className="head tap" style={{ background: 'var(--blue)', color: '#fff', fontSize: 12,
                  padding: '7px 14px', borderRadius: 999, border: '2.5px solid var(--ink)',
                  boxShadow: '2px 2px 0 rgba(27,42,74,.8)', whiteSpace: 'nowrap' }}>
                  📷 {p.photo ? 'Change photo' : 'Upload photo'}
                  <input type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      try {
                        const photo = await resizeImageToDataUrl(file);
                        store.getState().updatePerson(p.id, { photo });
                        app.ping('📸 Photo updated');
                      } catch {
                        app.ping('⚠️ Could not read that image');
                      }
                    }} />
                </label>
                {p.photo && (
                  <button onClick={() => store.getState().updatePerson(p.id, { photo: null })}
                    style={{ ...btn('var(--cream2)', 'var(--ink)'), fontSize: 11.5 }}>Remove photo</button>
                )}
              </div>
            </div>
          </Field>

          <Field label={`Teams (${p.teams.length}) · tap a picked team to mark knocked out`}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {allCodes.map((c) => {
                const picked = p.teams.includes(c);
                const out = p.out.includes(c);
                return (
                  <span key={c} className="flagchip tap"
                    onClick={() => picked ? store.getState().toggleOut(p.id, c) : toggleTeam(c)}
                    style={{ opacity: picked ? 1 : .4,
                      background: picked ? (out ? '#f1d6d6' : 'var(--grass)') : 'var(--cream)',
                      textDecoration: out ? 'line-through' : 'none',
                      borderStyle: picked ? 'solid' : 'dashed' }}>
                    <Flag code={c} knocked={out} />{c}
                  </span>
                );
              })}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, opacity: .55, marginTop: 6 }}>
              Dashed = not picked (tap to add). Green = still in. Red strike = knocked out.</div>
          </Field>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <Field label="Best shot ⭐">
              <select value={p.best} onChange={(e) => store.getState().updatePerson(p.id, { best: e.target.value })}
                style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">—</option>
                {p.teams.map((c) => <option key={c} value={c}>{teams[c]?.name} ({teams[c]?.odds})</option>)}
              </select>
            </Field>
          </div>

          <button onClick={() => { if (confirm(`Remove ${p.name} from the sweepstake?`)) store.getState().removePerson(p.id); }}
            style={{ ...btn('var(--tomato)', '#fff'), marginTop: 4 }}>🗑 Remove player</button>
        </div>
      )}
    </div>
  );
}

/* ---------- ADMIN DASHBOARD ---------- */
function AdminDashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const app = useApp();
  const settings = useStore((s) => s.settings);
  const people = useStore((s) => s.people);
  const wide = app.wide;
  const [newName, setNewName] = useState('');

  const addPlayer = () => {
    const nm = newName.trim();
    if (!nm) return;
    store.getState().addPerson({ name: nm });
    setNewName('');
    app.ping(`✨ ${nm} joined the sweepstake!`);
  };

  return (
    <Fragment>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <PageTitle accent="var(--mint)">ADMIN</PageTitle>
        <button onClick={onLogout} style={{ ...btn('var(--cream)'), marginLeft: 'auto', marginTop: 8 }}>
          🔒 Lock</button>
      </div>

      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: wide ? '1fr 1fr' : '1fr', alignItems: 'start' }}>
        {/* PEOPLE */}
        <AdminCard icon="👥" title="Sweepstake players" desc={`${people.length} in the draw`} accent="var(--sun)">
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <input value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
              placeholder="Add a player…" style={inputStyle} />
            <button onClick={addPlayer} style={{ ...btn('var(--grass)'), flex: '0 0 auto' }}>+ Add</button>
          </div>
          {[...people].sort((a, b) => b.points - a.points).map((p) => <PersonEditor key={p.id} p={p} />)}
        </AdminCard>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* SETTINGS */}
          <AdminCard icon="⚙️" title="Tournament settings" accent="var(--mint)">
            <Field label="Title (shows on the jumbotron)">
              <input value={settings.title} onChange={(e) => store.getState().setSettings({ title: e.target.value })}
                style={inputStyle} /></Field>
            <Field label="Tagline">
              <input value={settings.tagline} onChange={(e) => store.getState().setSettings({ tagline: e.target.value })}
                style={inputStyle} /></Field>
            <Field label="Kick-off date & time" hint="Drives the countdown on the home screen.">
              <input type="datetime-local"
                value={new Date(settings.kickoff - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                onChange={(e) => store.getState().setSettings({ kickoff: new Date(e.target.value).getTime() })}
                style={inputStyle} /></Field>
          </AdminCard>

          {/* DATA / API */}
          <ApiConnections token={token} />

          {/* DANGER */}
          <AdminCard icon="⚠️" title="Danger zone" accent="var(--tomato)">
            <div style={{ fontSize: 12.5, fontWeight: 700, opacity: .7, marginBottom: 10 }}>
              <b>Prepare for kickoff</b> clears every score and resets each player to "all
              in, nil points" — keeping your players so you can rename them and assign their
              real drawn teams. <b>Reset everything</b> restores the demo defaults. Neither
              can be undone!</div>
            <button onClick={() => { if (confirm('Clear all scores and eliminations, ready for the real draw?')) { store.getState().prepareForKickoff(); app.ping('🚀 Cleared — ready for kickoff!'); } }}
              style={{ ...btn('var(--grass)', 'var(--ink)'), marginBottom: 10 }}>🚀 Prepare for kickoff</button>
            <button onClick={() => { if (confirm('Reset everything to defaults?')) { store.getState().reset(); app.ping('♻️ Reset to defaults'); } }}
              style={btn('var(--tomato)', '#fff')}>♻️ Reset everything</button>
          </AdminCard>
        </div>

        {/* EDIT TEAM DATA */}
        <TeamDataEditor token={token} />
        {/* RESULTS MANAGERS */}
        <GroupResults token={token} />
        <KnockoutResults token={token} />
      </div>
    </Fragment>
  );
}

/* ---------- PAGE GATE ---------- */
export function AdminPage() {
  const app = useApp();
  const [token, setToken] = useState('');
  if (!app.adminAuthed) {
    return (
      <AdminLogin onSuccess={(tok) => { setAdminToken(tok); setToken(tok); app.setAdminAuthed(true); }} />
    );
  }
  return (
    <AdminDashboard token={token}
      onLogout={() => { setAdminToken(null); setToken(''); app.setAdminAuthed(false); }} />
  );
}
