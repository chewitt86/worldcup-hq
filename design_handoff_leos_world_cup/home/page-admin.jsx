/* World Cup HQ — ADMIN page: login + manage people, settings & data source */

/* ---------- small form primitives ---------- */
function AdminCard({ icon, title, desc, children, accent = "var(--sun)" }) {
  return (
    <div className="sticker" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px",
        background: accent, borderBottom: "4px solid var(--ink)" }}>
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
function Field({ label, children, hint }) {
  return (
    <label style={{ display: "block", marginBottom: 13 }}>
      <div className="head" style={{ fontSize: 12, letterSpacing: ".5px", marginBottom: 5, opacity: .85 }}>{label}</div>
      {children}
      {hint && <div style={{ fontSize: 11, fontWeight: 600, opacity: .55, marginTop: 4 }}>{hint}</div>}
    </label>
  );
}
const inputStyle = {
  width: "100%", fontFamily: "var(--body)", fontWeight: 700, fontSize: 15,
  padding: "9px 12px", borderRadius: 11, border: "3px solid var(--ink)",
  background: "#fff", color: "var(--ink)", outline: "none",
};
function btn(bg, fg) {
  return { fontFamily: "var(--head)", fontSize: 14, background: bg, color: fg || "var(--ink)",
    border: "3px solid var(--ink)", borderRadius: 12, padding: "9px 16px", cursor: "pointer",
    boxShadow: "2px 3px 0 rgba(27,42,74,.7)", letterSpacing: ".5px" };
}

/* ---------- toggle switch ---------- */
function Toggle({ on, onChange }) {
  return (
    <div className="tap" onClick={() => onChange(!on)}
      style={{ width: 56, height: 30, borderRadius: 999, border: "3px solid var(--ink)",
        background: on ? "var(--grass)" : "#d9d2c2", position: "relative", transition: "background .15s",
        flex: "0 0 auto" }}>
      <div style={{ position: "absolute", top: 1, left: on ? 27 : 1, width: 22, height: 22,
        borderRadius: "50%", background: "#fff", border: "2px solid var(--ink)", transition: "left .15s" }} />
    </div>
  );
}

/* ---------- LOGIN ---------- */
function AdminLogin({ onSuccess, pin }) {
  const [val, setVal] = React.useState("");
  const [err, setErr] = React.useState(false);
  const submit = () => {
    if (val === String(pin)) onSuccess();
    else { setErr(true); setVal(""); setTimeout(() => setErr(false), 600); }
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: "60vh", gap: 18 }}>
      <div className="anim-bob"><Wobbles size={92} /></div>
      <div className="sticker" style={{ padding: 26, width: "100%", maxWidth: 320, textAlign: "center",
        animation: err ? "wchq-wobble .3s 2" : "none" }}>
        <div className="head" style={{ fontSize: 24 }}>🔒 GROWN-UPS ONLY</div>
        <div style={{ fontWeight: 700, fontSize: 13, opacity: .65, margin: "6px 0 16px" }}>
          Enter the secret PIN to manage the sweepstake.</div>
        <input value={val} onChange={(e) => setVal(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          inputMode="numeric" placeholder="••••" autoFocus
          style={{ ...inputStyle, textAlign: "center", fontFamily: "var(--head)", fontSize: 30,
            letterSpacing: "10px", borderColor: err ? "var(--tomato)" : "var(--ink)" }} />
        <button onClick={submit} style={{ ...btn("var(--sun)"), width: "100%", marginTop: 14, fontSize: 16 }}>
          UNLOCK →</button>
        <div style={{ fontSize: 11, fontWeight: 600, opacity: .5, marginTop: 12 }}>
          {err ? "❌ Wrong PIN — try again!" : "psst… the demo PIN is 1966"}</div>
      </div>
    </div>
  );
}

/* ---------- PERSON EDITOR ---------- */
function PersonEditor({ p }) {
  const S = window.WCHQStore;
  const W = window.WCHQ;
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(p.name);
  React.useEffect(() => setName(p.name), [p.name]);
  const allCodes = Object.keys(W.TEAMS).sort((a, b) => W.oddsNum(a) - W.oddsNum(b));
  const stillIn = p.teams.length - p.out.length;

  const toggleTeam = (c) => {
    const has = p.teams.includes(c);
    const teams = has ? p.teams.filter((x) => x !== c) : [...p.teams, c];
    const out = has ? p.out.filter((x) => x !== c) : p.out;
    const best = p.best === c && has ? (teams[0] || "") : p.best;
    S.updatePerson(p.id, { teams, out, best });
  };

  return (
    <div className="sticker-sm" style={{ background: "var(--cream)", overflow: "hidden", marginBottom: 10 }}>
      {/* row header */}
      <div className="tap" onClick={() => setOpen((o) => !o)}
        style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 13px" }}>
        <Avatar person={p} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="head" style={{ fontSize: 16 }}>{p.name}</div>
          <div style={{ fontSize: 11, fontWeight: 700, opacity: .6 }}>✅ {stillIn} in · ❌ {p.out.length} out · {p.points} pts</div>
        </div>
        <span className="head" style={{ fontSize: 14, opacity: .5, transition: "transform .2s",
          transform: open ? "rotate(180deg)" : "none" }}>▾</span>
      </div>

      {open && (
        <div style={{ padding: "4px 13px 14px", borderTop: "2px dashed rgba(27,42,74,.15)" }}>
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)}
              onBlur={() => S.updatePerson(p.id, { name })} style={inputStyle} /></Field>
            <div style={{ width: 92, flex: "0 0 auto" }}>
              <Field label="Points"><input type="number" value={p.points}
                onChange={(e) => S.updatePerson(p.id, { points: parseInt(e.target.value) || 0 })}
                style={{ ...inputStyle, textAlign: "center" }} /></Field>
            </div>
          </div>

          <Field label="Colour">
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {S._palette.map((c) => (
                <div key={c} className="tap" onClick={() => S.updatePerson(p.id, { colour: c })}
                  style={{ width: 30, height: 30, borderRadius: "50%", background: c,
                    border: p.colour === c ? "4px solid var(--ink)" : "3px solid rgba(27,42,74,.3)",
                    boxShadow: p.colour === c ? "0 0 0 2px var(--sun)" : "none" }} />
              ))}
            </div>
          </Field>

          <Field label={`Teams (${p.teams.length}) · tap a picked team to mark knocked out`}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {allCodes.map((c) => {
                const picked = p.teams.includes(c);
                const out = p.out.includes(c);
                return (
                  <span key={c} className="flagchip tap"
                    onClick={() => picked ? S.toggleOut(p.id, c) : toggleTeam(c)}
                    style={{ opacity: picked ? 1 : .4,
                      background: picked ? (out ? "#f1d6d6" : "var(--grass)") : "var(--cream)",
                      textDecoration: out ? "line-through" : "none",
                      borderStyle: picked ? "solid" : "dashed" }}>
                    <Flag code={c} knocked={out} />{c}
                  </span>
                );
              })}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, opacity: .55, marginTop: 6 }}>
              Dashed = not picked (tap to add). Green = still in. Red strike = knocked out.</div>
          </Field>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <Field label="Best shot ⭐">
              <select value={p.best} onChange={(e) => S.updatePerson(p.id, { best: e.target.value })}
                style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="">—</option>
                {p.teams.map((c) => <option key={c} value={c}>{W.TEAMS[c]?.name} ({W.TEAMS[c]?.odds})</option>)}
              </select>
            </Field>
          </div>

          <button onClick={() => { if (confirm(`Remove ${p.name} from the sweepstake?`)) S.removePerson(p.id); }}
            style={{ ...btn("var(--tomato)", "#fff"), marginTop: 4 }}>🗑 Remove player</button>
        </div>
      )}
    </div>
  );
}

/* ---------- ADMIN DASHBOARD ---------- */
function AdminDashboard({ onLogout }) {
  const app = useApp();
  const { settings, people } = useStoreState();
  const S = window.WCHQStore;
  const wide = app.wide;
  const [newName, setNewName] = React.useState("");

  const addPlayer = () => {
    const nm = newName.trim();
    if (!nm) return;
    S.addPerson({ name: nm });
    setNewName("");
    app.ping(`✨ ${nm} joined the sweepstake!`);
  };
  const syncNow = () => {
    S.sync();
    app.ping("🔄 Synced! (demo data)");
  };
  const fmtSync = settings.lastSync ? new Date(settings.lastSync).toLocaleString() : "never";

  return (
    <React.Fragment>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <PageTitle accent="var(--mint)">ADMIN</PageTitle>
        <button onClick={onLogout} style={{ ...btn("var(--cream)"), marginLeft: "auto", marginTop: 8 }}>
          🔒 Lock</button>
      </div>

      <div style={{ display: "grid", gap: 14, gridTemplateColumns: wide ? "1fr 1fr" : "1fr", alignItems: "start" }}>
        {/* PEOPLE */}
        <AdminCard icon="👥" title="Sweepstake players" desc={`${people.length} in the draw`} accent="var(--sun)">
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPlayer()}
              placeholder="Add a player…" style={inputStyle} />
            <button onClick={addPlayer} style={{ ...btn("var(--grass)"), flex: "0 0 auto" }}>+ Add</button>
          </div>
          {[...people].sort((a, b) => b.points - a.points).map((p) => <PersonEditor key={p.id} p={p} />)}
        </AdminCard>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* SETTINGS */}
          <AdminCard icon="⚙️" title="Tournament settings" accent="var(--mint)">
            <Field label="Title (shows on the jumbotron)">
              <input value={settings.title} onChange={(e) => S.setSettings({ title: e.target.value })}
                style={inputStyle} /></Field>
            <Field label="Tagline">
              <input value={settings.tagline} onChange={(e) => S.setSettings({ tagline: e.target.value })}
                style={inputStyle} /></Field>
            <Field label="Kick-off date & time" hint="Drives the countdown on the home screen.">
              <input type="datetime-local"
                value={new Date(settings.kickoff - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                onChange={(e) => S.setSettings({ kickoff: new Date(e.target.value).getTime() })}
                style={inputStyle} /></Field>
            <Field label="Admin PIN" hint="Change the secret unlock code.">
              <input value={settings.pin} onChange={(e) => S.setSettings({ pin: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                inputMode="numeric" style={inputStyle} /></Field>
          </AdminCard>

          {/* DATA / API */}
          <ApiConnections ping={app.ping} syncNow={syncNow} fmtSync={fmtSync} />

          {/* DANGER */}
          <AdminCard icon="⚠️" title="Danger zone" accent="var(--tomato)">
            <div style={{ fontSize: 12.5, fontWeight: 700, opacity: .7, marginBottom: 10 }}>
              Reset all players & settings back to the demo defaults. Can't be undone!</div>
            <button onClick={() => { if (confirm("Reset everything to defaults?")) { S.reset(); app.ping("♻️ Reset to defaults"); } }}
              style={btn("var(--tomato)", "#fff")}>♻️ Reset everything</button>
          </AdminCard>
        </div>

        {/* EDIT TEAM DATA */}
        <TeamDataEditor ping={app.ping} />
        {/* RESULTS MANAGER */}
        <KnockoutResults ping={app.ping} />
      </div>
    </React.Fragment>
  );
}

/* ---------- TEAM DATA EDITOR ---------- */
function TeamDataEditor({ ping }) {
  useStoreState(); // re-render when team edits land
  const S = window.WCHQStore;
  const W = window.WCHQ;
  const codes = Object.keys(W.TEAMS).sort((a, b) => W.TEAMS[a].name.localeCompare(W.TEAMS[b].name));
  const [code, setCode] = React.useState(codes[0]);
  const t = W.TEAMS[code];
  const tiers = ["Favourite", "Contender", "Dark horse", "Host", "Outsider", "Longshot"];
  const [draft, setDraft] = React.useState({});
  React.useEffect(() => { setDraft({ name: t.name, odds: t.odds, titles: t.titles || "", fact: t.fact || "", squad: t.squad || "" }); }, [code]);
  const commit = (k) => { if (draft[k] !== undefined && draft[k] !== t[k]) { S.editTeam(code, { [k]: draft[k] }); ping && ping(`✏️ Updated ${t.name}`); } };
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <AdminCard icon="✏️" title="Edit team data" desc="Fix any wrong details" accent="var(--pink)">
      <Field label="Team">
        <select value={code} onChange={(e) => setCode(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
          {codes.map((c) => <option key={c} value={c}>{W.TEAMS[c].name} ({c})</option>)}
        </select>
      </Field>
      <div style={{ display: "flex", gap: 10 }}>
        <Field label="Name"><input value={draft.name || ""} onChange={(e) => set("name", e.target.value)}
          onBlur={() => commit("name")} style={inputStyle} /></Field>
        <div style={{ width: 110, flex: "0 0 auto" }}>
          <Field label="Odds" hint="e.g. 8/1"><input value={draft.odds || ""} onChange={(e) => set("odds", e.target.value)}
            onBlur={() => commit("odds")} style={{ ...inputStyle, textAlign: "center" }} /></Field>
        </div>
      </div>
      <Field label="Tier">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {tiers.map((tr) => (
            <div key={tr} className={"navpill tap" + (t.tier === tr ? " active" : "")}
              onClick={() => { S.editTeam(code, { tier: tr }); ping && ping(`✏️ Updated ${t.name}`); }}
              style={{ fontSize: 12, flex: "0 0 auto" }}>{tr}</div>
          ))}
        </div>
      </Field>
      <Field label="Titles / honours"><input value={draft.titles || ""} onChange={(e) => set("titles", e.target.value)}
        onBlur={() => commit("titles")} style={inputStyle} /></Field>
      <Field label="Fun fact"><textarea value={draft.fact || ""} onChange={(e) => set("fact", e.target.value)}
        onBlur={() => commit("fact")} rows={2} style={{ ...inputStyle, resize: "vertical" }} /></Field>
      <Field label="FIFA squad URL" hint="Where the team's squad link points.">
        <input value={draft.squad || ""} onChange={(e) => set("squad", e.target.value)}
          onBlur={() => commit("squad")} style={{ ...inputStyle, fontSize: 12 }} /></Field>
      {draft.squad && (
        <a href={draft.squad} target="_blank" rel="noopener noreferrer"
          style={{ fontFamily: "var(--head)", fontSize: 12, color: "var(--blue)" }}>↗ test this link</a>
      )}
    </AdminCard>
  );
}

/* ---------- API CONNECTIONS (multi-provider keys) ---------- */
const STATUS_META = {
  idle:    { dot: "#c4ccd9", label: "Not set up" },
  nokey:   { dot: "var(--orange)", label: "No key yet" },
  testing: { dot: "var(--blue)", label: "Testing…" },
  ok:      { dot: "var(--grass)", label: "Connected" },
  saved:   { dot: "var(--sun)", label: "Key saved (needs proxy)" },
};

function ProviderRow({ id, p, active, onActivate, onTest, onRemove }) {
  const S = window.WCHQStore;
  const [show, setShow] = React.useState(false);
  const [open, setOpen] = React.useState(active);
  const st = STATUS_META[p.status] || STATUS_META.idle;
  return (
    <div className="sticker-sm" style={{ background: active ? "var(--cream2)" : "var(--cream)",
      border: active ? "3px solid var(--blue)" : "3px solid var(--ink)", overflow: "hidden", marginBottom: 10 }}>
      {/* header row */}
      <div className="tap" onClick={() => setOpen((o) => !o)}
        style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 12px" }}>
        <span style={{ width: 11, height: 11, borderRadius: "50%", background: st.dot, flex: "0 0 auto",
          boxShadow: "0 0 0 2px rgba(27,42,74,.12)" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="head" style={{ fontSize: 15, display: "flex", alignItems: "center", gap: 7 }}>
            {p.name}
            {active && <span style={{ fontFamily: "var(--head)", fontSize: 9, color: "#fff", background: "var(--blue)",
              padding: "1px 7px", borderRadius: 999, border: "2px solid var(--ink)" }}>ACTIVE</span>}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, opacity: .6 }}>{st.label}{p.key ? " · key ••••" + p.key.slice(-4) : ""}</div>
        </div>
        <span className="head" style={{ fontSize: 13, opacity: .5, transition: "transform .2s",
          transform: open ? "rotate(180deg)" : "none" }}>▾</span>
      </div>

      {open && (
        <div style={{ padding: "2px 12px 13px", borderTop: "2px dashed rgba(27,42,74,.15)" }}>
          <Field label="API key" hint={p.hint}>
            <div style={{ display: "flex", gap: 7 }}>
              <input type={show ? "text" : "password"} value={p.key}
                onChange={(e) => S.updateProvider(id, { key: e.target.value, status: e.target.value ? "saved" : "nokey" })}
                placeholder="paste key…" style={{ ...inputStyle, fontFamily: "monospace", fontSize: 13 }} />
              <button onClick={() => setShow((s) => !s)} style={{ ...btn("var(--cream)"), padding: "0 12px", flex: "0 0 auto" }}>
                {show ? "🙈" : "👁"}</button>
            </div>
          </Field>
          <Field label="Base URL">
            <input value={p.baseUrl} onChange={(e) => S.updateProvider(id, { baseUrl: e.target.value })}
              placeholder="https://…" style={{ ...inputStyle, fontSize: 12 }} /></Field>
          <Field label="Auth header" hint="How the key is sent with each request.">
            <input value={p.authHeader} onChange={(e) => S.updateProvider(id, { authHeader: e.target.value })}
              style={{ ...inputStyle, fontFamily: "monospace", fontSize: 12 }} /></Field>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center" }}>
            <button onClick={() => onTest(id)} style={btn("var(--sun)")}>🔌 Test</button>
            {!active && <button onClick={() => onActivate(id)} style={btn("var(--grass)")}>★ Use this</button>}
            {p.docs && <a href={p.docs} target="_blank" rel="noopener noreferrer"
              style={{ fontFamily: "var(--head)", fontSize: 12, color: "var(--blue)" }}>↗ Get a key</a>}
            {!p.builtin && <button onClick={() => onRemove(id)}
              style={{ ...btn("var(--tomato)", "#fff"), marginLeft: "auto", padding: "8px 11px" }}>🗑</button>}
          </div>
        </div>
      )}
    </div>
  );
}

function ApiConnections({ ping, syncNow, fmtSync }) {
  const { settings } = useStoreState();
  const S = window.WCHQStore;
  const providers = settings.providers || {};
  const [newName, setNewName] = React.useState("");

  const onTest = async (id) => {
    ping && ping("🔌 Testing connection…");
    const r = await S.testProvider(id);
    ping && ping(r.ok ? "✅ " + r.msg : "⚠️ " + r.msg);
  };
  const addCustom = () => {
    const nm = newName.trim(); if (!nm) return;
    const id = S.addCustomProvider(nm); setNewName("");
    ping && ping(`➕ Added ${nm}`);
  };

  return (
    <AdminCard icon="🛰" title="Match data & API keys" desc="Where scores & fixtures come from" accent="var(--blue)">
      {/* demo vs live */}
      <Field label="Data source">
        <div style={{ display: "flex", gap: 8 }}>
          {[["demo", "🎮 Demo data"], ["live", "🛰 Live API"]].map(([v, l]) => (
            <div key={v} className={"navpill tap" + (settings.dataSource === v ? " active" : "")}
              onClick={() => S.setSettings({ dataSource: v })}
              style={{ flex: 1, textAlign: "center", fontSize: 13 }}>{l}</div>
          ))}
        </div>
      </Field>

      {settings.dataSource === "live" && (
        <React.Fragment>
          <div className="head" style={{ fontSize: 12, letterSpacing: ".5px", opacity: .85, margin: "4px 0 8px" }}>
            PROVIDERS</div>
          {Object.keys(providers).map((id) => (
            <ProviderRow key={id} id={id} p={providers[id]}
              active={settings.activeProvider === id}
              onActivate={(i) => { S.setActiveProvider(i); ping && ping(`★ ${providers[i].name} is now active`); }}
              onTest={onTest} onRemove={(i) => S.removeProvider(i)} />
          ))}

          {/* add custom */}
          <div style={{ display: "flex", gap: 8, margin: "4px 0 14px" }}>
            <input value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustom()}
              placeholder="Add another provider…" style={inputStyle} />
            <button onClick={addCustom} style={{ ...btn("var(--grape)", "#fff"), flex: "0 0 auto" }}>+ Add</button>
          </div>

          {/* auto-sync */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 13 }}>
            <Toggle on={settings.autoSync} onChange={(v) => S.setSettings({ autoSync: v })} />
            <div>
              <div className="head" style={{ fontSize: 13 }}>Auto-sync</div>
              <div style={{ fontSize: 11, fontWeight: 600, opacity: .6 }}>pull new scores every {settings.syncMins} min</div>
            </div>
            <input type="number" value={settings.syncMins} min={1}
              onChange={(e) => S.setSettings({ syncMins: parseInt(e.target.value) || 1 })}
              style={{ ...inputStyle, width: 70, marginLeft: "auto", textAlign: "center" }} />
          </div>
        </React.Fragment>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={syncNow} style={btn("var(--sun)")}>🔄 Sync now</button>
        <div style={{ fontSize: 11.5, fontWeight: 700, opacity: .6 }}>
          Last synced:<br /><span style={{ opacity: .9 }}>{fmtSync}</span></div>
      </div>

      {/* status banner */}
      {(() => {
        const ap = S.getActiveProvider();
        const live = settings.dataSource === "live";
        const ok = live && ap && ap.key;
        return (
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8,
            background: "var(--cream2)", border: "3px solid var(--ink)", borderRadius: 12, padding: "8px 11px" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", flex: "0 0 auto",
              background: !live ? "var(--orange)" : ok ? "var(--grass)" : "var(--orange)" }} />
            <span style={{ fontSize: 12, fontWeight: 700 }}>
              {!live ? "Running on built-in demo data"
                : ok ? `Live via ${ap.name}` : "Live selected — add & activate a key"}</span>
          </div>
        );
      })()}
      <div style={{ fontSize: 11, fontWeight: 600, opacity: .55, marginTop: 8 }}>
        🔒 Keys are stored only on this device. Live fetches usually need a tiny server/proxy (browsers block direct calls).</div>
    </AdminCard>
  );
}

/* ---------- KNOCKOUT RESULTS MANAGER ---------- */
function KnockoutResults({ ping }) {
  useStoreState();
  const S = window.WCHQStore;
  const W = window.WCHQ;
  const b = React.useMemo(() => W.bracketFull(), [S.get().bracketNonce]);
  const ROUNDS = [
    { id: "R32", label: "Round of 32", ties: b.r32 },
    { id: "R16", label: "Last 16", ties: b.r16 },
    { id: "QF", label: "Quarters", ties: b.qf },
    { id: "SF", label: "Semis", ties: b.sf },
    { id: "F", label: "Final", ties: [b.final] },
  ];
  const [round, setRound] = React.useState("R32");
  const cur = ROUNDS.find((r) => r.id === round);
  const results = S.getResults();

  const ScoreBox = ({ stage, i, tie }) => {
    const key = stage + ":" + i;
    const r = results[key];
    const [a, setA] = React.useState(r ? r.score[0] : "");
    const [bs, setB] = React.useState(r ? r.score[1] : "");
    React.useEffect(() => { const rr = S.getResults()[key]; setA(rr ? rr.score[0] : ""); setB(rr ? rr.score[1] : ""); }, [key, !!r]);
    const save = () => {
      if (a === "" || bs === "") return;
      S.setResult(stage, i, [a, bs]); ping && ping(`✅ ${tie.a} ${a}–${bs} ${tie.b}`);
    };
    const box = { width: 42, textAlign: "center", fontFamily: "var(--head)", fontSize: 17, padding: "5px 0",
      borderRadius: 9, border: "3px solid var(--ink)", background: "#fff" };
    return (
      <div className="sticker-sm" style={{ background: "var(--cream)", padding: "8px 10px", display: "flex",
        alignItems: "center", gap: 7, marginBottom: 7 }}>
        <Flag code={tie.a} style={{ width: 22, height: 15 }} />
        <span className="head" style={{ fontSize: 13, width: 34 }}>{tie.a}</span>
        <input value={a} onChange={(e) => setA(e.target.value.replace(/\D/g, "").slice(0, 2))} style={box} />
        <span className="head" style={{ opacity: .5 }}>–</span>
        <input value={bs} onChange={(e) => setB(e.target.value.replace(/\D/g, "").slice(0, 2))} style={box} />
        <span className="head" style={{ fontSize: 13, width: 34, textAlign: "right" }}>{tie.b}</span>
        <Flag code={tie.b} style={{ width: 22, height: 15 }} />
        <div style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
          <button onClick={save} style={{ ...btn("var(--grass)"), padding: "5px 9px", fontSize: 12 }}>Save</button>
          {r && <button onClick={() => { S.clearResult(stage, i); ping && ping("↩ Cleared"); }}
            style={{ ...btn("var(--cream2)"), padding: "5px 9px", fontSize: 12 }}>✕</button>}
        </div>
      </div>
    );
  };

  return (
    <AdminCard icon="🏆" title="Match results" desc="Enter scores as games finish" accent="var(--orange)">
      <div className="noscroll" style={{ display: "flex", gap: 7, overflowX: "auto", marginBottom: 12 }}>
        {ROUNDS.map((r) => (
          <div key={r.id} className={"navpill tap" + (round === r.id ? " active" : "")}
            style={{ fontSize: 12.5, flex: "0 0 auto" }} onClick={() => setRound(r.id)}>{r.label}</div>
        ))}
      </div>
      {cur.ties.map((tie, i) => <ScoreBox key={i} stage={round} i={i} tie={tie} />)}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, opacity: .6 }}>
          {Object.keys(results).length} result{Object.keys(results).length === 1 ? "" : "s"} saved
        </span>
        {Object.keys(results).length > 0 && (
          <button onClick={() => { if (confirm("Clear all entered scores?")) { S.clearAllResults(); ping && ping("↩ All cleared"); } }}
            style={{ ...btn("var(--tomato)", "#fff"), marginLeft: "auto", padding: "6px 11px", fontSize: 12 }}>Clear all</button>
        )}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, opacity: .55, marginTop: 8 }}>
        Saved scores show on the Knockout bracket, Map ties & game popups, and decide who advances.</div>
    </AdminCard>
  );
}

function AdminPage() {
  const app = useApp();
  const { settings } = useStoreState();
  if (!app.adminAuthed) return <AdminLogin pin={settings.pin} onSuccess={() => app.setAdminAuthed(true)} />;
  return <AdminDashboard onLogout={() => app.setAdminAuthed(false)} />;
}

Object.assign(window, { AdminPage, AdminLogin, AdminDashboard, PersonEditor, TeamDataEditor, KnockoutResults, ApiConnections, ProviderRow });
