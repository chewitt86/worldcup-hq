/* ============================================================================
 * auth.js — admin authentication (Leo's World Cup server)
 *
 * Ported from legacy/server.js: an in-memory token map gates writes to the
 * shared board. `login(password)` checks the password against
 * process.env.ADMIN_PASSWORD and, on success, mints a bearer token that
 * `validToken()` accepts until it expires. Wrong passwords mint nothing.
 *
 * Zero dependencies (Node built-ins only).
 * ========================================================================== */
"use strict";

const crypto = require("crypto");

/* Default token lifetime — 7 days (legacy used 7 * 864e5 ms). */
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/* In-memory token map: token -> expiry timestamp (ms since epoch). */
const tokens = new Map();

/* Read the admin password at call time so tests/env changes take effect.
 * Falls back to "changeme" (matches legacy) when unset. */
function adminPassword() {
  return process.env.ADMIN_PASSWORD || "changeme";
}

/* Mint a fresh opaque token valid for `ttlMs` milliseconds. */
function newToken(ttlMs = DEFAULT_TTL_MS) {
  const token = crypto.randomBytes(24).toString("hex");
  tokens.set(token, Date.now() + ttlMs);
  return token;
}

/* Exchange a password for a token. Returns the token on success, or null when
 * the password is missing/empty or does not match ADMIN_PASSWORD. */
function login(password, ttlMs = DEFAULT_TTL_MS) {
  if (typeof password !== "string" || password.length === 0) return null;
  if (password !== adminPassword()) return null;
  return newToken(ttlMs);
}

/* True when `token` is known and not yet expired. Expired tokens are evicted. */
function validToken(token) {
  if (!token || typeof token !== "string") return false;
  const expiry = tokens.get(token);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    tokens.delete(token);
    return false;
  }
  return true;
}

/* Forget a token (logout). Returns true if it existed. */
function logout(token) {
  return tokens.delete(token);
}

/* Inspect a request for a valid admin token (Bearer header or x-admin-token). */
function isAdmin(req) {
  const headers = (req && req.headers) || {};
  const auth = headers["authorization"] || "";
  const token = auth.replace(/^Bearer\s+/i, "") || headers["x-admin-token"] || "";
  return !!token && validToken(token);
}

/* Test helper — drop every token (keeps tests independent). */
function _clearTokens() {
  tokens.clear();
}

module.exports = {
  login,
  validToken,
  isAdmin,
  logout,
  newToken,
  DEFAULT_TTL_MS,
  _clearTokens,
};
