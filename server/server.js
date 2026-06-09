/* ============================================================================
 * server.js — Leo's World Cup (zero-dependency Node runtime server)
 *
 * Serves the built client (client/dist) + GET /api/health, enforces the VIEWER
 * GATE (when process.env.VIEW_PASSWORD is set, the whole site and the shared
 * board require a valid viewer cookie), and exposes the SHARED BOARD + ADMIN
 * API:
 *   GET  /api/state          viewer-authed → the {rev,updatedAt,state} envelope
 *   POST /api/state          admin-only (403 without a token) → bumps rev
 *   POST /api/admin/login    {password} → {token}
 *   GET  /api/admin/config   admin-only → masked settings + providers
 *   POST /api/admin/config   admin-only → persist settings + keys server-side
 *   POST /api/admin/test     admin-only → live "does the API work?" probe
 *   POST /api/admin/sync     admin-only → fetch live results into the board
 *
 * Provider API keys never reach the browser (config.js masks them). /api/health
 * is ALWAYS open (Docker healthcheck). Uses only built-in Node + global fetch.
 * ========================================================================== */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const state = require("./lib/state");
const auth = require("./lib/auth");
const config = require("./lib/config");
const fetcher = require("./lib/fetcher");

const PORT = parseInt(process.env.PORT || "3050", 10);
const CLIENT_DIR = process.env.CLIENT_DIR || path.join(__dirname, "..", "client", "dist");
const LOGIN_PAGE = path.join(__dirname, "public-login.html");

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2",
  ".map": "application/json",
};

/* ----------------------------------------------------------- viewer gate ---- */

const VIEWER_COOKIE = "wchq_view";
/* Opaque viewer tokens live in memory (cookie -> expiry ms). ~30-day lifetime. */
const VIEWER_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const viewerTokens = new Map();

/* Read VIEW_PASSWORD at request time so dev/test toggles take effect. */
function viewPassword() { return process.env.VIEW_PASSWORD || ""; }
function viewerGateEnabled() { return viewPassword().length > 0; }

function newViewerToken(ttlMs = VIEWER_TTL_MS) {
  const token = crypto.randomBytes(24).toString("hex");
  viewerTokens.set(token, Date.now() + ttlMs);
  return token;
}

function validViewerToken(token) {
  if (!token || typeof token !== "string") return false;
  const expiry = viewerTokens.get(token);
  if (!expiry) return false;
  if (Date.now() > expiry) { viewerTokens.delete(token); return false; }
  return true;
}

/* Parse the Cookie header into a plain object. */
function parseCookies(req) {
  const header = (req && req.headers && req.headers.cookie) || "";
  const out = {};
  header.split(";").forEach((part) => {
    const i = part.indexOf("=");
    if (i < 0) return;
    const k = part.slice(0, i).trim();
    if (!k) return;
    out[k] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

/* A request is viewer-authed when the gate is off, or it carries a valid cookie. */
function viewerAuthed(req) {
  if (!viewerGateEnabled()) return true;
  return validViewerToken(parseCookies(req)[VIEWER_COOKIE]);
}

/* ---------------------------------------------------------------- helpers ---- */

function sendJson(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(obj));
}

/* Serve the standalone sticker login page (used on a gated 401). */
function serveLoginPage(res, code) {
  fs.readFile(LOGIN_PAGE, (err, buf) => {
    if (err) {
      res.writeHead(code, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      return res.end("<!doctype html><meta charset=utf-8><title>Password required</title>" +
        "<form method=POST action=/api/viewer/login><input type=password name=password>" +
        "<button>Let me in</button></form>");
    }
    res.writeHead(code, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    res.end(buf);
  });
}

/* Collect a request body as a string. 8 MB cap comfortably fits the shared
   board even with several player photos (each resized to a few KB). */
const MAX_BODY = 8 * 1024 * 1024;
function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > MAX_BODY) req.destroy(); // guard against oversized bodies
    });
    req.on("end", () => resolve(data));
    req.on("error", () => resolve(data));
  });
}

/* Pull a `password` field from a JSON or urlencoded body. */
function extractPassword(raw, contentType) {
  if (!raw) return "";
  if (/json/i.test(contentType || "")) {
    try { return String(JSON.parse(raw).password || ""); } catch (e) { /* fall through */ }
  }
  try {
    const params = new URLSearchParams(raw);
    if (params.has("password")) return params.get("password") || "";
  } catch (e) { /* not urlencoded */ }
  try { return String(JSON.parse(raw).password || ""); } catch (e) { return ""; }
}

/* POST /api/viewer/login — exchange the viewer password for an httpOnly cookie. */
async function handleViewerLogin(req, res) {
  const raw = await readBody(req);
  const password = extractPassword(raw, req.headers["content-type"]);
  const ok = !viewerGateEnabled() || (password.length > 0 && password === viewPassword());
  if (!ok) return serveLoginPage(res, 401);

  const token = newViewerToken();
  const cookie = `${VIEWER_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=` +
    `${Math.floor(VIEWER_TTL_MS / 1000)}; SameSite=Lax`;
  res.writeHead(303, { Location: "/", "Set-Cookie": cookie, "Cache-Control": "no-store" });
  res.end();
}

/* Read a JSON request body. Returns the parsed object, `{}` for an empty body,
 * or `null` when the body is present but not valid JSON (callers map → 400). */
async function readJsonBody(req) {
  const raw = await readBody(req);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch (e) { return null; }
}

/* Resolve a provider config (WITH its server-side key) for the live-data proxy.
 * Defaults to the active provider; the admin panel may inline-override fields
 * (e.g. a freshly typed key not yet saved) via the request body. */
function resolveProvider(body) {
  const cfg = config.effectiveConfig();
  const b = (body && typeof body === "object") ? body : {};
  const id = b.provider || b.id || cfg.settings.activeProvider;
  const provider = { ...(cfg.providers[id] || {}) };
  ["baseUrl", "authHeader", "path", "name"].forEach((k) => {
    if (typeof b[k] === "string") provider[k] = b[k];
  });
  if (typeof b.key === "string" && b.key.length) provider.key = b.key;
  return provider;
}

/* ------------------------------------------------------- results poller ----- */

/* Merge a feed patch into the shared board (seeding an empty board if none):
 * merge group results, REPLACE board.koLive when the feed carries knockout ties
 * (a null koLive leaves any existing projection-driving value untouched),
 * REPLACE board.fixtures when the feed carries a non-empty full schedule (an
 * empty array leaves any existing schedule untouched), stamp settings.lastSync,
 * and persist via state.write (bumps rev). */
function mergeResultsIntoBoard(results, koLive, fixtures) {
  const board = state.read().state || {};
  board.results = { ...(board.results || {}), ...(results || {}) };
  if (koLive) board.koLive = koLive;
  if (Array.isArray(fixtures) && fixtures.length) board.fixtures = fixtures;
  // IMPORTANT: never write board.settings here. The board's settings
  // (title / kickoff / people) are owned by the client; stamping lastSync into a
  // freshly-empty board created a partial settings object that wiped the client's
  // title+kickoff on hydrate. Record the sync time in the admin config instead —
  // which is where the admin panel reads "Last synced" from.
  try { config.saveConfig({ settings: { lastSync: new Date().toISOString() } }); }
  catch (e) { /* best-effort timestamp */ }
  return state.write(board);
}

/* The active provider (WITH its server-side key) + the live/sync settings. */
function activeProviderConfig() {
  const cfg = config.effectiveConfig();
  const id = cfg.settings.activeProvider;
  return { settings: cfg.settings, provider: cfg.providers[id] || {} };
}

let pollTimer = null;

/* One poll: fetch live results and merge them into the board. Never throws. */
async function pollOnce() {
  try {
    const { provider } = activeProviderConfig();
    if (!provider || !provider.key) return;
    const out = await fetcher.fetchLive(provider);
    if (!out || !out.ok) { console.log("[sync] feed error:", out && out.reason); return; }
    mergeResultsIntoBoard(out.results, out.koLive, out.fixtures);
    const fx = out.fixtures ? out.fixtures.length : 0;
    const ap = out.applied ? out.applied.length : 0;
    const un = out.unmatched && out.unmatched.length ? " · unmatched: " + out.unmatched.join(", ") : "";
    console.log(`[sync] ok — ${fx} fixtures, ${ap} group results${un}`);
  } catch (e) {
    console.log("[sync] poll error:", e && e.message);
  }
}

/* Reconfigure the background poller from the current settings. Runs only when
 * dataSource is "live", the active provider has a key, and autoSync is on;
 * otherwise it is switched off. Polls once immediately, then every syncMins. */
function restartPoller() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  const { settings, provider } = activeProviderConfig();
  if (settings.dataSource !== "live" || !provider.key || !settings.autoSync) return;
  const mins = Math.max(1, parseInt(settings.syncMins, 10) || 15);
  pollOnce(); // fire immediately (fire-and-forget; never throws)
  pollTimer = setInterval(pollOnce, mins * 60000);
}

/* -------------------------------------------------------------- api router -- */

/* Handle the shared-board + admin API. Reached only after the viewer gate, so
 * every handler here may assume the caller is viewer-authed. */
async function handleApi(req, res, url, method) {
  /* GET /api/state — viewer-authed read of the whole envelope. */
  if (url === "/api/state" && method === "GET") {
    return sendJson(res, 200, state.read());
  }

  /* POST /api/state — admin-only write that bumps the revision. */
  if (url === "/api/state" && method === "POST") {
    if (!auth.isAdmin(req)) return sendJson(res, 403, { error: "admin only" });
    const body = await readJsonBody(req);
    if (body === null) return sendJson(res, 400, { error: "bad json" });
    const newState = body.state !== undefined ? body.state : body;
    const env = state.write(newState);
    return sendJson(res, 200, { rev: env.rev, updatedAt: env.updatedAt });
  }

  /* POST /api/admin/login — exchange the admin password for a bearer token. */
  if (url === "/api/admin/login" && method === "POST") {
    const body = await readJsonBody(req);
    const token = auth.login(body && body.password);
    if (!token) return sendJson(res, 401, { error: "wrong password" });
    return sendJson(res, 200, { token });
  }

  /* GET /api/admin/config — masked settings + providers (never a raw key). */
  if (url === "/api/admin/config" && method === "GET") {
    if (!auth.isAdmin(req)) return sendJson(res, 401, { error: "unauthorized" });
    return sendJson(res, 200, config.maskedConfig());
  }

  /* POST /api/admin/config — persist settings + provider keys server-side. */
  if (url === "/api/admin/config" && method === "POST") {
    if (!auth.isAdmin(req)) return sendJson(res, 401, { error: "unauthorized" });
    const body = await readJsonBody(req);
    if (body === null) return sendJson(res, 400, { error: "bad json" });
    const saved = config.saveConfig(body);
    restartPoller(); // settings may have toggled live/autoSync/interval
    return sendJson(res, 200, saved);
  }

  /* POST /api/admin/test — probe the chosen provider (reports a missing key
   * cleanly, never throwing into the server loop). */
  if (url === "/api/admin/test" && method === "POST") {
    if (!auth.isAdmin(req)) return sendJson(res, 401, { error: "unauthorized" });
    const body = await readJsonBody(req);
    const out = await fetcher.probe(resolveProvider(body));
    return sendJson(res, 200, out);
  }

  /* POST /api/admin/sync — fetch live results and merge them into the board. */
  if (url === "/api/admin/sync" && method === "POST") {
    if (!auth.isAdmin(req)) return sendJson(res, 401, { error: "unauthorized" });
    const body = await readJsonBody(req);
    const out = await fetcher.fetchLive(resolveProvider(body));
    if (!out.ok) return sendJson(res, 200, out);
    const env = mergeResultsIntoBoard(out.results, out.koLive, out.fixtures);
    return sendJson(res, 200, {
      ok: true, rev: env.rev, applied: (out.applied || Object.keys(out.results || {})).length,
      unmatched: out.unmatched || [],
    });
  }

  return sendJson(res, 404, { error: "not found" });
}

/* serve a static file from client/dist; SPA-fallback to index.html for unknown routes */
/* Cache policy: content-hashed bundles can be cached forever; index.html must
   NOT be cached so a redeploy is picked up immediately (it points at the new
   hashed bundle); other static files get a short cache. */
function cacheControl(rel) {
  if (rel.startsWith("/assets/")) return "public, max-age=31536000, immutable";
  if (rel.startsWith("/geo/")) return "public, max-age=604800"; // 1 week — static map data
  if (rel === "/index.html" || rel.endsWith(".html")) return "no-cache";
  return "public, max-age=3600";
}

function serveStatic(req, res) {
  let rel = decodeURIComponent((req.url || "/").split("?")[0]);
  if (rel === "/") rel = "/index.html";
  const fp = path.normalize(path.join(CLIENT_DIR, rel));
  if (!fp.startsWith(CLIENT_DIR)) { res.writeHead(403); return res.end("forbidden"); }
  fs.readFile(fp, (err, buf) => {
    if (err) {
      // SPA fallback: serve index.html (never cached) so client-side routing works
      return fs.readFile(path.join(CLIENT_DIR, "index.html"), (e2, idx) => {
        if (e2) { res.writeHead(404); return res.end("Not found"); }
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
        res.end(idx);
      });
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(fp)] || "application/octet-stream",
      "Cache-Control": cacheControl(rel) });
    res.end(buf);
  });
}

/* ------------------------------------------------------------- request handler */

function handler(req, res) {
  const url = (req.url || "/").split("?")[0];
  const method = req.method || "GET";

  // Health is ALWAYS open (Docker healthcheck must work behind the gate).
  if (url === "/api/health") return sendJson(res, 200, { status: "healthy" });

  // The login endpoint must be reachable so viewers can authenticate.
  if (url === "/api/viewer/login" && method === "POST") return handleViewerLogin(req, res);

  // Viewer gate: block the site + API until a valid cookie is presented.
  if (!viewerAuthed(req)) {
    if (url.startsWith("/api/")) return sendJson(res, 401, { error: "viewer password required" });
    return serveLoginPage(res, 401);
  }

  // Shared-board + admin API (viewer-authed past this point).
  if (url.startsWith("/api/")) return handleApi(req, res, url, method);

  return serveStatic(req, res);
}

function createServer() {
  return http.createServer(handler);
}

const server = createServer();

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`⚽ Leo's World Cup server on http://0.0.0.0:${PORT}  (client: ${CLIENT_DIR})`);
    restartPoller(); // start the live results poller if configured
  });
}

module.exports = { server, createServer, handler };
