/* ============================================================================
 * config.js — effective server config + masked provider keys
 *
 * The shared board is read by every device, so provider API keys must NEVER
 * reach the browser. Real keys persist server-side in server/data/admin.json;
 * the client only ever sees `keySet` (boolean) + `keyHint` ("•••• 1234").
 *
 * Provider presets are ported verbatim from the prototype store.js DEFAULTS
 * (design_handoff_leos_world_cup/home/store.js) but with empty keys — admins
 * supply keys at runtime, which we merge over the presets.
 *
 * Zero dependencies (Node built-ins only).
 * ========================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");

/* Built-in provider presets (ported from the prototype, keys blanked). */
const DEFAULT_PROVIDERS = {
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
};

/* Default tournament/sync settings (ported from prototype DEFAULTS.settings). */
const DEFAULT_SETTINGS = {
  dataSource: "demo",
  activeProvider: "api-football",
  autoSync: true,
  syncMins: 15,
  lastSync: null,
};

/* Resolve the admin.json path at call time so tests can redirect it. */
function adminFile() {
  if (process.env.ADMIN_FILE) return process.env.ADMIN_FILE;
  const dataDir = process.env.DATA_DIR || path.join(__dirname, "..", "data");
  return path.join(dataDir, "admin.json");
}

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (e) { return fallback; }
}

function writeJson(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, file);
}

/* Effective config = preset defaults <- admin.json overrides (keys persist).
 * Returns the RAW config (keys included) — server-side use only. */
function effectiveConfig() {
  const stored = readJson(adminFile(), {}) || {};
  const providers = {};
  Object.keys(DEFAULT_PROVIDERS).forEach((id) => {
    providers[id] = { ...DEFAULT_PROVIDERS[id] };
  });
  Object.keys(stored.providers || {}).forEach((id) => {
    providers[id] = { ...(providers[id] || {}), ...stored.providers[id] };
  });
  const settings = { ...DEFAULT_SETTINGS, ...(stored.settings || {}) };
  return { settings, providers };
}

/* Format a key as a safe hint, e.g. "•••• 1234". Empty key -> "". */
function keyHint(key) {
  return key ? ("•••• " + String(key).slice(-4)) : "";
}

/* Strip the raw key from one provider, adding keySet + keyHint instead. */
function maskProvider(provider) {
  const { key, ...rest } = provider;
  return { ...rest, keySet: !!key, keyHint: keyHint(key) };
}

/* The provider list with every raw key removed — safe to send to the browser. */
function maskedProviders() {
  const { providers } = effectiveConfig();
  const masked = {};
  Object.keys(providers).forEach((id) => {
    masked[id] = maskProvider(providers[id]);
  });
  return masked;
}

/* Full config for the admin panel, with all keys masked. */
function maskedConfig() {
  return { settings: effectiveConfig().settings, providers: maskedProviders() };
}

/* Persist a settings/provider patch to admin.json.
 * - Provider keys: a non-empty `key` is saved; a blank/absent `key` keeps the
 *   existing one; `clearKey:true` wipes it (legacy semantics).
 * Returns the freshly masked config. */
function saveConfig(patch = {}) {
  const file = adminFile();
  const stored = readJson(file, {}) || {};
  stored.settings = { ...(stored.settings || {}), ...(patch.settings || {}) };
  stored.providers = stored.providers || {};

  Object.keys(patch.providers || {}).forEach((id) => {
    const incoming = patch.providers[id] || {};
    const merged = { ...(stored.providers[id] || {}) };
    Object.keys(incoming).forEach((field) => {
      if (field === "key" || field === "clearKey") return; // handled below
      merged[field] = incoming[field];
    });
    if (typeof incoming.key === "string" && incoming.key.length) merged.key = incoming.key;
    if (incoming.clearKey === true) merged.key = "";
    stored.providers[id] = merged;
  });

  writeJson(file, stored);
  return maskedConfig();
}

module.exports = {
  DEFAULT_PROVIDERS,
  DEFAULT_SETTINGS,
  effectiveConfig,
  maskedProviders,
  maskedConfig,
  saveConfig,
  keyHint,
  adminFile,
};
