/* World Cup HQ — mutable app store (localStorage + pub/sub)
   Holds editable PEOPLE + SETTINGS so the Admin page can manage them
   and every page updates live. Base data comes from window.WCHQ. */
(function () {
  const KEY = "wchq.store.v2";
  const base = window.WCHQ;

  const DEFAULTS = {
    settings: {
      title: "LEO'S WORLD CUP",
      tagline: "The family sweepstake HQ",
      kickoff: base.KICKOFF,
      // data source: 'demo' (built-in) or 'live' (a configured provider)
      dataSource: "demo",
      activeProvider: "api-football",
      autoSync: true,
      syncMins: 15,
      lastSync: null,
      pin: "1966",
      // API providers — keys live only on this device
      providers: {
        "api-football": {
          name: "API-Football", key: "", status: "idle",
          baseUrl: "https://v3.football.api-sports.io",
          authHeader: "x-apisports-key",
          docs: "https://www.api-football.com/documentation-v3",
          hint: "api-sports.io key (or RapidAPI key).", builtin: true,
        },
        "football-data": {
          name: "football-data.org", key: "", status: "idle",
          baseUrl: "https://api.football-data.org/v4",
          authHeader: "X-Auth-Token",
          docs: "https://www.football-data.org/documentation/quickstart",
          hint: "Free tier API token.", builtin: true,
        },
        "sportmonks": {
          name: "SportMonks", key: "", status: "idle",
          baseUrl: "https://api.sportmonks.com/v3/football",
          authHeader: "Authorization",
          docs: "https://docs.sportmonks.com/football",
          hint: "API token.", builtin: true,
        },
        "custom": {
          name: "Custom provider", key: "", status: "idle",
          baseUrl: "", authHeader: "Authorization",
          docs: "", hint: "Any REST endpoint that returns match data.", builtin: false,
        },
      },
    },
    people: base.PEOPLE.map((p) => ({ ...p, teams: [...p.teams], out: [...p.out] })),
    teamEdits: {},   // { CODE: { name?, odds?, tier?, titles?, fact?, squad? } }
    results: {},     // { "stage:index": { score:[a,b], played:true } }
    bracketNonce: 0, // bumps when odds change so the bracket re-seeds
  };

  // editable team fields exposed to Admin
  const TEAM_FIELDS = ["name", "odds", "tier", "titles", "fact", "squad"];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (!raw) return clone(DEFAULTS);
      const settings = { ...DEFAULTS.settings, ...(raw.settings || {}) };
      // deep-merge providers so new presets appear, user keys persist
      settings.providers = { ...clone(DEFAULTS.settings.providers) };
      Object.keys((raw.settings && raw.settings.providers) || {}).forEach((id) => {
        settings.providers[id] = { ...(settings.providers[id] || {}), ...raw.settings.providers[id] };
      });
      // migrate a legacy single apiKey onto football-data
      if (raw.settings && raw.settings.apiKey && !settings.providers["football-data"].key) {
        settings.providers["football-data"].key = raw.settings.apiKey;
      }
      return {
        settings,
        people: Array.isArray(raw.people) ? raw.people : clone(DEFAULTS.people),
        teamEdits: raw.teamEdits || {},
        results: raw.results || {},
        bracketNonce: raw.bracketNonce || 0,
      };
    } catch (e) { return clone(DEFAULTS); }
  }

  let state = load();
  // pristine snapshot of editable team fields, so reset() can restore them
  const PRISTINE = {};
  Object.keys(base.TEAMS).forEach((c) => {
    PRISTINE[c] = {}; TEAM_FIELDS.forEach((k) => { PRISTINE[c][k] = base.TEAMS[c][k]; });
  });
  // apply any saved team edits onto the live team data
  function applyTeamEdits() {
    Object.keys(state.teamEdits || {}).forEach((code) => {
      if (base.TEAMS[code]) Object.assign(base.TEAMS[code], state.teamEdits[code]);
    });
    if (base.invalidateBracket) base.invalidateBracket();
  }
  applyTeamEdits();
  const subs = new Set();
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  function emit() { subs.forEach((f) => f(state)); }
  function commit() { persist(); emit(); }

  const PALETTE = ["#36a9ff", "#9b6cf0", "#ff8fd0", "#ff9f1c", "#2fe0c0", "#ff5d5d", "#ffd23f", "#46b94a"];
  function uid() { return "p" + Math.random().toString(36).slice(2, 7); }
  function initials(name) {
    const parts = name.trim().split(/\s+/);
    const s = (parts[0]?.[0] || "") + (parts[1]?.[0] || parts[0]?.[1] || "");
    return s.toUpperCase() || "??";
  }

  const Store = {
    get: () => state,
    getSettings: () => state.settings,
    getPeople: () => state.people,

    setSettings(patch) { state.settings = { ...state.settings, ...patch }; commit(); },

    setPeople(people) { state.people = people; commit(); },

    addPerson(partial) {
      const colour = partial.colour || PALETTE[state.people.length % PALETTE.length];
      const person = {
        id: uid(),
        name: partial.name || "New Player",
        initials: partial.initials || initials(partial.name || "New Player"),
        colour,
        points: partial.points || 0,
        teams: partial.teams || [],
        out: partial.out || [],
        best: partial.best || (partial.teams && partial.teams[0]) || "",
      };
      state.people = [...state.people, person];
      commit();
      return person;
    },

    updatePerson(id, patch) {
      state.people = state.people.map((p) => {
        if (p.id !== id) return p;
        const next = { ...p, ...patch };
        if (patch.name && !patch.initials) next.initials = initials(patch.name);
        return next;
      });
      commit();
    },

    removePerson(id) {
      state.people = state.people.filter((p) => p.id !== id);
      commit();
    },

    // toggle a team in/out for a person
    toggleOut(id, code) {
      state.people = state.people.map((p) => {
        if (p.id !== id) return p;
        const out = p.out.includes(code) ? p.out.filter((c) => c !== code) : [...p.out, code];
        return { ...p, out };
      });
      commit();
    },

    getTeamEdits: () => state.teamEdits || {},
    // patch a team's editable fields (persists + mutates the live team object)
    editTeam(code, patch) {
      const clean = {};
      TEAM_FIELDS.forEach((k) => { if (k in patch) clean[k] = patch[k]; });
      state.teamEdits = { ...state.teamEdits, [code]: { ...(state.teamEdits[code] || {}), ...clean } };
      if (base.TEAMS[code]) Object.assign(base.TEAMS[code], clean);
      // odds change -> re-seed the projected bracket on next render
      if ("odds" in clean && base.invalidateBracket) {
        base.invalidateBracket();
        state.bracketNonce = (state.bracketNonce || 0) + 1;
      }
      commit();
    },

    // ---- match results overlay (played vs upcoming) ----
    getResults: () => state.results || {},
    resultKey: (stage, i) => stage + ":" + i,
    setResult(stage, i, score) {
      const key = stage + ":" + i;
      state.results = { ...state.results, [key]: { score: [Number(score[0]) || 0, Number(score[1]) || 0], played: true } };
      commit();
    },
    clearResult(stage, i) {
      const key = stage + ":" + i;
      const next = { ...state.results }; delete next[key];
      state.results = next; commit();
    },
    clearAllResults() { state.results = {}; commit(); },

    // ---- API providers ----
    getProviders: () => state.settings.providers || {},
    getActiveProvider() {
      const id = state.settings.activeProvider;
      const p = (state.settings.providers || {})[id];
      return p ? { id, ...p } : null;
    },
    setActiveProvider(id) {
      state.settings = { ...state.settings, activeProvider: id, dataSource: "live" };
      commit();
    },
    updateProvider(id, patch) {
      const provs = { ...(state.settings.providers || {}) };
      provs[id] = { ...(provs[id] || {}), ...patch };
      state.settings = { ...state.settings, providers: provs };
      commit();
    },
    addCustomProvider(name) {
      const id = "custom-" + Math.random().toString(36).slice(2, 6);
      const provs = { ...(state.settings.providers || {}) };
      provs[id] = { name: name || "New provider", key: "", status: "idle", baseUrl: "",
        authHeader: "Authorization", docs: "", hint: "Custom REST endpoint.", builtin: false };
      state.settings = { ...state.settings, providers: provs };
      commit();
      return id;
    },
    removeProvider(id) {
      const provs = { ...(state.settings.providers || {}) };
      if (provs[id] && provs[id].builtin) return;
      delete provs[id];
      const patch = { providers: provs };
      if (state.settings.activeProvider === id) patch.activeProvider = "api-football";
      state.settings = { ...state.settings, ...patch };
      commit();
    },
    // attempt a real connection; falls back gracefully (browser CORS will often block)
    async testProvider(id) {
      const p = (state.settings.providers || {})[id];
      if (!p) return { ok: false, msg: "Unknown provider" };
      if (!p.key) { this.updateProvider(id, { status: "nokey" }); return { ok: false, msg: "Add a key first" }; }
      this.updateProvider(id, { status: "testing" });
      try {
        const ctrl = new AbortController();
        const to = setTimeout(() => ctrl.abort(), 6000);
        await fetch(p.baseUrl || "", { headers: { [p.authHeader]: p.key }, signal: ctrl.signal, mode: "cors" });
        clearTimeout(to);
        this.updateProvider(id, { status: "ok", lastTest: new Date().toISOString() });
        return { ok: true, msg: "Reached the provider 🎉" };
      } catch (e) {
        // saved & ready, but the browser can't call it directly (needs a proxy)
        this.updateProvider(id, { status: "saved", lastTest: new Date().toISOString() });
        return { ok: false, msg: "Key saved. Direct browser calls are blocked — needs a proxy/server to fetch." };
      }
    },

    sync() {
      const now = new Date().toISOString();
      state.settings = { ...state.settings, lastSync: now };
      commit();
      return now;
    },

    reset() {
      // restore pristine team data + bracket, then reset state
      Object.keys(PRISTINE).forEach((c) => { if (base.TEAMS[c]) Object.assign(base.TEAMS[c], PRISTINE[c]); });
      if (base.invalidateBracket) base.invalidateBracket();
      state = clone(DEFAULTS);
      commit();
    },

    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },

    _initials: initials,
    _palette: PALETTE,
  };

  window.WCHQStore = Store;
})();
