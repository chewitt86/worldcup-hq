/* ============================================================================
 * auth.test.js — admin auth + masked provider keys (node:test)
 *
 * Verify: node --test server/lib/auth.test.js
 * ========================================================================== */
"use strict";

const { test } = require("node:test");
const assert = require("node:assert");
const os = require("os");
const fs = require("fs");
const path = require("path");

/* Pin the admin password + redirect admin.json to a throwaway file BEFORE the
 * modules are required (config resolves paths lazily, so this is plenty). */
process.env.ADMIN_PASSWORD = "let-me-in";
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wchq-auth-"));
process.env.ADMIN_FILE = path.join(tmpDir, "admin.json");

const auth = require("./auth");
const config = require("./config");

/* ---------------------------------------------------------------- auth ---- */

test("login with the correct password returns a token validToken accepts", () => {
  const token = auth.login("let-me-in");
  assert.ok(token, "expected a token string");
  assert.strictEqual(typeof token, "string");
  assert.strictEqual(auth.validToken(token), true);
});

test("login with a wrong password returns no token", () => {
  assert.strictEqual(auth.login("nope"), null);
  assert.strictEqual(auth.login(""), null);
  assert.strictEqual(auth.login(undefined), null);
});

test("validToken rejects unknown and empty tokens", () => {
  assert.strictEqual(auth.validToken("deadbeef"), false);
  assert.strictEqual(auth.validToken(""), false);
  assert.strictEqual(auth.validToken(undefined), false);
});

test("tokens expire after their ttl", async () => {
  const token = auth.login("let-me-in", 30); // 30ms lifetime
  assert.strictEqual(auth.validToken(token), true);
  await new Promise((r) => setTimeout(r, 60));
  assert.strictEqual(auth.validToken(token), false);
});

test("isAdmin accepts Bearer and x-admin-token headers", () => {
  const token = auth.login("let-me-in");
  assert.strictEqual(auth.isAdmin({ headers: { authorization: "Bearer " + token } }), true);
  assert.strictEqual(auth.isAdmin({ headers: { "x-admin-token": token } }), true);
  assert.strictEqual(auth.isAdmin({ headers: {} }), false);
  assert.strictEqual(auth.isAdmin({ headers: { authorization: "Bearer nope" } }), false);
});

/* ----------------------------------------------------- masked provider keys */

test("maskedProviders never leaks a raw key and gives a keyHint", () => {
  config.saveConfig({ providers: { "api-football": { key: "SECRETKEY12345678" } } });
  const masked = config.maskedProviders();

  Object.values(masked).forEach((p) => {
    assert.strictEqual("key" in p, false, "masked provider must not contain a raw key");
    assert.strictEqual(typeof p.keySet, "boolean");
    assert.strictEqual(typeof p.keyHint, "string");
  });

  assert.strictEqual(masked["api-football"].keySet, true);
  assert.strictEqual(masked["api-football"].keyHint, "•••• 5678");

  // A provider with no key set reports keySet:false / empty hint.
  assert.strictEqual(masked["sportmonks"].keySet, false);
  assert.strictEqual(masked["sportmonks"].keyHint, "");
});

test("effectiveConfig keeps the raw key server-side", () => {
  const cfg = config.effectiveConfig();
  assert.strictEqual(cfg.providers["api-football"].key, "SECRETKEY12345678");
});

test("the masked config, once serialised, never contains a raw key", () => {
  config.saveConfig({ providers: { "football-data": { key: "TOPSECRETTOKEN" } } });
  const json = JSON.stringify(config.maskedConfig());
  assert.ok(!json.includes("TOPSECRETTOKEN"), "serialised masked config leaked a raw key");
  assert.ok(!json.includes("SECRETKEY12345678"), "serialised masked config leaked a raw key");
});

test("a blank key keeps the existing one; clearKey wipes it", () => {
  config.saveConfig({ providers: { "api-football": { key: "" } } }); // keep
  assert.strictEqual(config.effectiveConfig().providers["api-football"].key, "SECRETKEY12345678");
  config.saveConfig({ providers: { "api-football": { clearKey: true } } }); // wipe
  assert.strictEqual(config.effectiveConfig().providers["api-football"].key, "");
  assert.strictEqual(config.maskedProviders()["api-football"].keySet, false);
});
