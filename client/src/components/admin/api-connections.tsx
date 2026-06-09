/* World Cup HQ — ADMIN › Match data & API keys.
   Ported from home/page-admin.jsx (ApiConnections + ProviderRow), keeping all
   inline styles, classNames, emoji, copy, layout and pixel values identical.

   ARCHITECTURE CHANGE vs the prototype: provider API keys are SERVER-SIDE ONLY.
   This panel reads the MASKED config from GET /api/admin/config (keySet + keyHint,
   never a raw key) and persists edits via POST /api/admin/config, 🔌 Test via
   POST /api/admin/test and 🔄 Sync now via POST /api/admin/sync — all Bearer-authed
   with the admin token passed in as a prop. A typed key only ever travels TO the
   server (on blur); it is never read back into the browser and the 👁 toggle only
   reveals the characters the user is currently typing. */

import { Fragment, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useApp } from '../../app/context';
import {
  getAdminConfig,
  saveAdminConfig,
  testProvider,
  syncNow as syncNowApi,
  type AdminConfig,
  type MaskedProvider,
} from '../../lib/admin-api';

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
function btn(bg: string, fg?: string): CSSProperties {
  return { fontFamily: 'var(--head)', fontSize: 14, background: bg, color: fg || 'var(--ink)',
    border: '3px solid var(--ink)', borderRadius: 12, padding: '9px 16px', cursor: 'pointer',
    boxShadow: '2px 3px 0 rgba(27,42,74,.7)', letterSpacing: '.5px' };
}

/* ---------- toggle switch ---------- */
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="tap" onClick={() => onChange(!on)}
      style={{ width: 56, height: 30, borderRadius: 999, border: '3px solid var(--ink)',
        background: on ? 'var(--grass)' : '#d9d2c2', position: 'relative', transition: 'background .15s',
        flex: '0 0 auto' }}>
      <div style={{ position: 'absolute', top: 1, left: on ? 27 : 1, width: 22, height: 22,
        borderRadius: '50%', background: '#fff', border: '2px solid var(--ink)', transition: 'left .15s' }} />
    </div>
  );
}

/* ---------- status dots ---------- */
const STATUS_META: Record<string, { dot: string; label: string }> = {
  idle:    { dot: '#c4ccd9', label: 'Not set up' },
  nokey:   { dot: 'var(--orange)', label: 'No key yet' },
  testing: { dot: 'var(--blue)', label: 'Testing…' },
  ok:      { dot: 'var(--grass)', label: 'Connected' },
  saved:   { dot: 'var(--sun)', label: 'Key saved (needs proxy)' },
};

/* ---------- one provider row ---------- */
function ProviderRow({
  id,
  p,
  active,
  testing,
  onActivate,
  onTest,
  onRemove,
  onField,
  onSaveKey,
}: {
  id: string;
  p: MaskedProvider;
  active: boolean;
  testing: boolean;
  onActivate: (id: string) => void;
  onTest: (id: string) => void;
  onRemove: (id: string) => void;
  onField: (id: string, patch: Record<string, unknown>) => void;
  onSaveKey: (id: string, key: string) => void;
}) {
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(active);
  /* a freshly typed key — held locally only, never round-tripped back from the
     server, and persisted (TO the server) on blur. */
  const [keyDraft, setKeyDraft] = useState('');
  const [base, setBase] = useState(p.baseUrl);
  const [hdr, setHdr] = useState(p.authHeader);
  useEffect(() => { setBase(p.baseUrl); }, [p.baseUrl]);
  useEffect(() => { setHdr(p.authHeader); }, [p.authHeader]);

  const status = testing ? 'testing' : p.status;
  const st = STATUS_META[status] || STATUS_META.idle;

  return (
    <div className="sticker-sm" style={{ background: active ? 'var(--cream2)' : 'var(--cream)',
      border: active ? '3px solid var(--blue)' : '3px solid var(--ink)', overflow: 'hidden', marginBottom: 10 }}>
      {/* header row */}
      <div className="tap" onClick={() => setOpen((o) => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px' }}>
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: st.dot, flex: '0 0 auto',
          boxShadow: '0 0 0 2px rgba(27,42,74,.12)' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="head" style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 7 }}>
            {p.name}
            {active && <span className="pill" style={{ fontFamily: 'var(--head)', fontSize: 9, color: '#fff', background: 'var(--blue)',
              padding: '3px 8px', borderRadius: 999, border: '2px solid var(--ink)' }}>ACTIVE</span>}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, opacity: .6 }}>{st.label}{p.keySet ? ' · key ' + p.keyHint : ''}</div>
        </div>
        <span className="head" style={{ fontSize: 13, opacity: .5, transition: 'transform .2s',
          transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
      </div>

      {open && (
        <div style={{ padding: '2px 12px 13px', borderTop: '2px dashed rgba(27,42,74,.15)' }}>
          <Field label="API key" hint={p.hint}>
            <div style={{ display: 'flex', gap: 7 }}>
              <input type={show ? 'text' : 'password'} value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
                onBlur={() => { if (keyDraft) { onSaveKey(id, keyDraft); setKeyDraft(''); } }}
                placeholder="paste key…" style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 13 }} />
              <button onClick={() => setShow((s) => !s)} style={{ ...btn('var(--cream)'), padding: '0 12px', flex: '0 0 auto' }}>
                {show ? '🙈' : '👁'}</button>
            </div>
          </Field>
          <Field label="Base URL">
            <input value={base} onChange={(e) => setBase(e.target.value)}
              onBlur={() => { if (base !== p.baseUrl) onField(id, { baseUrl: base }); }}
              placeholder="https://…" style={{ ...inputStyle, fontSize: 12 }} /></Field>
          <Field label="Auth header" hint="How the key is sent with each request.">
            <input value={hdr} onChange={(e) => setHdr(e.target.value)}
              onBlur={() => { if (hdr !== p.authHeader) onField(id, { authHeader: hdr }); }}
              style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12 }} /></Field>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center' }}>
            <button onClick={() => onTest(id)} style={btn('var(--sun)')}>🔌 Test</button>
            {!active && <button onClick={() => onActivate(id)} style={btn('var(--grass)')}>★ Use this</button>}
            {p.docs && <a href={p.docs as string} target="_blank" rel="noopener noreferrer"
              style={{ fontFamily: 'var(--head)', fontSize: 12, color: 'var(--blue)' }}>↗ Get a key</a>}
            {!p.builtin && <button onClick={() => onRemove(id)}
              style={{ ...btn('var(--tomato)', '#fff'), marginLeft: 'auto', padding: '8px 11px' }}>🗑</button>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- the panel ---------- */
export function ApiConnections({ token }: { token: string }) {
  const { ping, setAdminAuthed } = useApp();
  const [cfg, setCfg] = useState<AdminConfig | null>(null);
  const [newName, setNewName] = useState('');
  const [testingId, setTestingId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getAdminConfig(token).then((res) => {
      if (!alive) return;
      if (res && res.settings && res.providers) setCfg(res as AdminConfig);
      // a bad/expired token (e.g. the server restarted on a deploy, clearing
      // in-memory tokens) → drop back to the login screen instead of hanging.
      else setAdminAuthed(false);
    });
    return () => { alive = false; };
  }, [token, setAdminAuthed]);

  /* adopt an authoritative masked-config response from the server. */
  const adopt = (res: unknown) => {
    const c = res as AdminConfig;
    if (c && c.settings && c.providers) setCfg(c);
  };

  /* persist a settings patch (optimistic local merge, then adopt server truth). */
  const saveSettings = async (patch: Record<string, unknown>) => {
    setCfg((prev) => (prev ? { ...prev, settings: { ...prev.settings, ...patch } } : prev));
    adopt(await saveAdminConfig(token, { settings: patch }));
  };

  /* persist a provider patch. The raw `key` is sent to the server but never kept
     in local state (we strip it from the optimistic merge). */
  const saveProvider = async (id: string, patch: Record<string, unknown>) => {
    const { key: _key, clearKey: _clearKey, ...meta } = patch;
    void _key; void _clearKey;
    setCfg((prev) => (prev
      ? { ...prev, providers: { ...prev.providers, [id]: { ...prev.providers[id], ...meta } as MaskedProvider } }
      : prev));
    adopt(await saveAdminConfig(token, { providers: { [id]: patch } }));
  };

  if (!cfg) {
    return (
      <AdminCard icon="🛰" title="Match data & API keys" desc="Where scores & fixtures come from" accent="var(--blue)">
        <div style={{ fontSize: 12.5, fontWeight: 700, opacity: .6 }}>Loading…</div>
      </AdminCard>
    );
  }

  const settings = cfg.settings;
  const providers = cfg.providers || {};

  const onTest = async (id: string) => {
    ping('🔌 Testing connection…');
    setTestingId(id);
    const r = await testProvider(token, { provider: id });
    setTestingId(null);
    ping(r.ok ? '✅ ' + (r.reason || 'Connected.') : '⚠️ ' + (r.reason || r.error || 'Test failed'));
    void saveProvider(id, { status: r.ok ? 'ok' : 'nokey' });
  };
  const onActivate = (id: string) => {
    void saveSettings({ activeProvider: id, dataSource: 'live' });
    ping(`★ ${providers[id].name} is now active`);
  };
  const onRemove = (id: string) => {
    /* the server config has no provider-delete; remove locally (built-ins stay). */
    if (providers[id] && providers[id].builtin) return;
    setCfg((prev) => {
      if (!prev) return prev;
      const provs = { ...prev.providers };
      delete provs[id];
      const next = { ...prev.settings };
      if (next.activeProvider === id) next.activeProvider = 'api-football';
      return { ...prev, providers: provs, settings: next };
    });
  };
  const addCustom = async () => {
    const nm = newName.trim();
    if (!nm) return;
    const id = 'custom-' + Math.random().toString(36).slice(2, 6);
    setNewName('');
    adopt(await saveAdminConfig(token, { providers: { [id]: {
      name: nm, status: 'idle', baseUrl: '', authHeader: 'Authorization',
      docs: '', hint: 'Custom REST endpoint.', builtin: false,
    } } }));
    ping(`➕ Added ${nm}`);
  };
  const doSync = async () => {
    ping('🔄 Syncing…');
    const r = await syncNowApi(token);
    if (r.ok) {
      await saveSettings({ lastSync: new Date().toISOString() });
      ping(`🔄 Synced! ${r.applied ?? 0} result${r.applied === 1 ? '' : 's'}`);
    } else {
      ping('⚠️ ' + (r.reason || r.error || 'Sync failed'));
    }
  };
  const fmtSync = settings.lastSync ? new Date(settings.lastSync as string).toLocaleString() : 'never';

  return (
    <AdminCard icon="🛰" title="Match data & API keys" desc="Where scores & fixtures come from" accent="var(--blue)">
      {/* demo vs live */}
      <Field label="Data source">
        <div style={{ display: 'flex', gap: 8 }}>
          {([['demo', '🎮 Demo data'], ['live', '🛰 Live API']] as const).map(([v, l]) => (
            <div key={v} className={'navpill tap' + (settings.dataSource === v ? ' active' : '')}
              onClick={() => saveSettings({ dataSource: v })}
              style={{ flex: 1, textAlign: 'center', fontSize: 13 }}>{l}</div>
          ))}
        </div>
      </Field>

      {settings.dataSource === 'live' && (
        <Fragment>
          <div className="head" style={{ fontSize: 12, letterSpacing: '.5px', opacity: .85, margin: '4px 0 8px' }}>
            PROVIDERS</div>
          {Object.keys(providers).map((id) => (
            <ProviderRow key={id} id={id} p={providers[id]}
              active={settings.activeProvider === id}
              testing={testingId === id}
              onActivate={onActivate}
              onTest={onTest}
              onRemove={onRemove}
              onField={(i, patch) => void saveProvider(i, patch)}
              onSaveKey={(i, key) => void saveProvider(i, { key, status: 'saved' })} />
          ))}

          {/* add custom */}
          <div style={{ display: 'flex', gap: 8, margin: '4px 0 14px' }}>
            <input value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustom()}
              placeholder="Add another provider…" style={inputStyle} />
            <button onClick={addCustom} style={{ ...btn('var(--grape)', '#fff'), flex: '0 0 auto' }}>+ Add</button>
          </div>

          {/* auto-sync */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 13 }}>
            <Toggle on={!!settings.autoSync} onChange={(v) => saveSettings({ autoSync: v })} />
            <div>
              <div className="head" style={{ fontSize: 13 }}>Auto-sync</div>
              <div style={{ fontSize: 11, fontWeight: 600, opacity: .6 }}>pull new scores every {settings.syncMins as number} min</div>
            </div>
            <input type="number" value={settings.syncMins as number} min={1}
              onChange={(e) => saveSettings({ syncMins: parseInt(e.target.value) || 1 })}
              style={{ ...inputStyle, width: 70, marginLeft: 'auto', textAlign: 'center' }} />
          </div>
        </Fragment>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={doSync} style={btn('var(--sun)')}>🔄 Sync now</button>
        <div style={{ fontSize: 11.5, fontWeight: 700, opacity: .6 }}>
          Last synced:<br /><span style={{ opacity: .9 }}>{fmtSync}</span></div>
      </div>

      {/* status banner */}
      {(() => {
        const ap = providers[settings.activeProvider as string];
        const live = settings.dataSource === 'live';
        const ok = live && ap && ap.keySet;
        return (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--cream2)', border: '3px solid var(--ink)', borderRadius: 12, padding: '8px 11px' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', flex: '0 0 auto',
              background: !live ? 'var(--orange)' : ok ? 'var(--grass)' : 'var(--orange)' }} />
            <span style={{ fontSize: 12, fontWeight: 700 }}>
              {!live ? 'Running on built-in demo data'
                : ok ? `Live via ${ap.name}` : 'Live selected — add & activate a key'}</span>
          </div>
        );
      })()}
      <div style={{ fontSize: 11, fontWeight: 600, opacity: .55, marginTop: 8 }}>
        🔒 Keys are stored only on the server (never in the browser). Live fetches run through the server proxy, so the browser never makes a direct call.</div>
    </AdminCard>
  );
}
