/* ============================================================================
 * server.test.js — viewer gate + static/health (node:test, ephemeral port)
 *
 * Verify: node --test server/server.test.js
 * ========================================================================== */
"use strict";

const { test } = require("node:test");
const assert = require("node:assert");
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

/* Point CLIENT_DIR at a throwaway dir with an index.html BEFORE requiring the
 * server, so the test never depends on a built client/dist. */
const clientDir = fs.mkdtempSync(path.join(os.tmpdir(), "wchq-client-"));
fs.writeFileSync(path.join(clientDir, "index.html"), "<!doctype html><title>App</title>HELLO");
process.env.CLIENT_DIR = clientDir;

/* Point the shared-board + admin files at throwaway temp files BEFORE requiring
 * the server (state.js binds its default store at module load), so tests never
 * touch server/data. A fixed admin password keeps the login tests deterministic. */
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wchq-data-"));
process.env.DATA_FILE = path.join(dataDir, "state.json");
process.env.ADMIN_FILE = path.join(dataDir, "admin.json");
process.env.ADMIN_PASSWORD = "admin-secret";

const { createServer } = require("./server");

/* Log in as admin and return the bearer token (helper for the API tests). */
async function adminToken(base) {
  const r = await request(base, {
    method: "POST",
    path: "/api/admin/login",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: "admin-secret" }),
  });
  return JSON.parse(r.body).token;
}

/* Start a fresh server on an ephemeral port; resolves with helpers. */
function startServer() {
  const srv = createServer();
  return new Promise((resolve) => {
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      resolve({
        base: `http://127.0.0.1:${port}`,
        close: () => new Promise((r) => srv.close(r)),
      });
    });
  });
}

/* Minimal promise-based HTTP client. */
function request(base, opts = {}) {
  const u = new URL(opts.path || "/", base);
  return new Promise((resolve, reject) => {
    const req = http.request(
      u,
      { method: opts.method || "GET", headers: opts.headers || {} },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body }));
      }
    );
    req.on("error", reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

/* -------------------------------------------------------- /api/health open -- */

test("GET /api/health is always open, even when the gate is on", async () => {
  process.env.VIEW_PASSWORD = "family";
  const s = await startServer();
  try {
    const r = await request(s.base, { path: "/api/health" });
    assert.strictEqual(r.status, 200);
    assert.deepStrictEqual(JSON.parse(r.body), { status: "healthy" });
  } finally {
    await s.close();
  }
});

/* ---------------------------------------------------------- gate when set --- */

test("with VIEW_PASSWORD set, GET / without a cookie returns the login page (401)", async () => {
  process.env.VIEW_PASSWORD = "family";
  const s = await startServer();
  try {
    const r = await request(s.base, { path: "/" });
    assert.strictEqual(r.status, 401);
    assert.match(r.headers["content-type"] || "", /text\/html/);
    assert.match(r.body, /password/i);
  } finally {
    await s.close();
  }
});

test("with VIEW_PASSWORD set, GET /api/state without a cookie returns 401", async () => {
  process.env.VIEW_PASSWORD = "family";
  const s = await startServer();
  try {
    const r = await request(s.base, { path: "/api/state" });
    assert.strictEqual(r.status, 401);
  } finally {
    await s.close();
  }
});

test("POST the correct password sets an httpOnly cookie that grants access", async () => {
  process.env.VIEW_PASSWORD = "family";
  const s = await startServer();
  try {
    const login = await request(s.base, {
      method: "POST",
      path: "/api/viewer/login",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "password=family",
    });
    const setCookie = login.headers["set-cookie"];
    assert.ok(setCookie && setCookie.length, "expected a Set-Cookie header");
    const cookie = setCookie[0];
    assert.match(cookie, /HttpOnly/i, "viewer cookie must be httpOnly");
    assert.match(cookie, new RegExp("^wchq_view="), "unexpected cookie name");

    // Re-use the cookie pair (name=value) on a subsequent request → granted.
    const pair = cookie.split(";")[0];
    const authed = await request(s.base, { path: "/", headers: { cookie: pair } });
    assert.strictEqual(authed.status, 200);
    assert.match(authed.body, /HELLO/);
  } finally {
    await s.close();
  }
});

test("POST a wrong password is rejected (401, no auth cookie)", async () => {
  process.env.VIEW_PASSWORD = "family";
  const s = await startServer();
  try {
    const r = await request(s.base, {
      method: "POST",
      path: "/api/viewer/login",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "password=wrong",
    });
    assert.strictEqual(r.status, 401);
    assert.ok(!r.headers["set-cookie"], "a wrong password must not set a cookie");
  } finally {
    await s.close();
  }
});

/* ------------------------------------------------------- open when unset ---- */

test("with VIEW_PASSWORD unset, the site and /api/state are open (dev)", async () => {
  delete process.env.VIEW_PASSWORD;
  const s = await startServer();
  try {
    const home = await request(s.base, { path: "/" });
    assert.strictEqual(home.status, 200);
    assert.match(home.body, /HELLO/);

    // /api/state isn't gated; it returns the shared-board envelope.
    const state = await request(s.base, { path: "/api/state" });
    assert.notStrictEqual(state.status, 401);
  } finally {
    await s.close();
  }
});

/* ===================== Task 3.4: /api/state + /api/admin routes ============ */

test("GET /api/state returns the {rev,state} envelope", async () => {
  delete process.env.VIEW_PASSWORD;
  const s = await startServer();
  try {
    const r = await request(s.base, { path: "/api/state" });
    assert.strictEqual(r.status, 200);
    const env = JSON.parse(r.body);
    assert.ok("rev" in env && "state" in env, "expected an envelope shape");
  } finally {
    await s.close();
  }
});

test("POST /api/state without an admin token is forbidden (403)", async () => {
  delete process.env.VIEW_PASSWORD;
  const s = await startServer();
  try {
    const r = await request(s.base, {
      method: "POST",
      path: "/api/state",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ state: { hello: "world" } }),
    });
    assert.strictEqual(r.status, 403);
  } finally {
    await s.close();
  }
});

test("admin login mints a token, and POST /api/state with it bumps rev", async () => {
  delete process.env.VIEW_PASSWORD;
  const s = await startServer();
  try {
    const token = await adminToken(s.base);
    assert.ok(token, "expected an admin token");

    const before = JSON.parse((await request(s.base, { path: "/api/state" })).body).rev;
    const save = await request(s.base, {
      method: "POST",
      path: "/api/state",
      headers: { "content-type": "application/json", authorization: "Bearer " + token },
      body: JSON.stringify({ state: { results: {} } }),
    });
    assert.strictEqual(save.status, 200);
    const after = JSON.parse((await request(s.base, { path: "/api/state" })).body).rev;
    assert.strictEqual(after, before + 1, "a successful write must bump the revision");
  } finally {
    await s.close();
  }
});

test("admin login with a wrong password is rejected (401)", async () => {
  delete process.env.VIEW_PASSWORD;
  const s = await startServer();
  try {
    const r = await request(s.base, {
      method: "POST",
      path: "/api/admin/login",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "nope" }),
    });
    assert.strictEqual(r.status, 401);
  } finally {
    await s.close();
  }
});

test("GET /api/admin/config needs a token and never echoes raw keys", async () => {
  delete process.env.VIEW_PASSWORD;
  const s = await startServer();
  try {
    const unauth = await request(s.base, { path: "/api/admin/config" });
    assert.strictEqual(unauth.status, 401);

    const token = await adminToken(s.base);
    const cfg = await request(s.base, {
      path: "/api/admin/config",
      headers: { authorization: "Bearer " + token },
    });
    assert.strictEqual(cfg.status, 200);
    const body = JSON.parse(cfg.body);
    assert.ok(body.settings && body.providers, "expected settings + providers");
    Object.values(body.providers).forEach((p) => {
      assert.ok(!("key" in p), "masked providers must not include a raw key");
    });
  } finally {
    await s.close();
  }
});

test("POST /api/admin/config saves a provider key server-side without echoing it", async () => {
  delete process.env.VIEW_PASSWORD;
  const s = await startServer();
  try {
    const token = await adminToken(s.base);
    const save = await request(s.base, {
      method: "POST",
      path: "/api/admin/config",
      headers: { "content-type": "application/json", authorization: "Bearer " + token },
      body: JSON.stringify({ providers: { "api-football": { key: "SECRET1234" } } }),
    });
    assert.strictEqual(save.status, 200);
    assert.ok(!save.body.includes("SECRET1234"), "the raw key must never be echoed back");
    const body = JSON.parse(save.body);
    assert.strictEqual(body.providers["api-football"].keySet, true);
    assert.match(body.providers["api-football"].keyHint, /1234$/);
  } finally {
    await s.close();
  }
});

test("POST /api/admin/test probes the provider and reports a missing key cleanly", async () => {
  delete process.env.VIEW_PASSWORD;
  const s = await startServer();
  try {
    const token = await adminToken(s.base);
    const probe = await request(s.base, {
      method: "POST",
      path: "/api/admin/test",
      headers: { "content-type": "application/json", authorization: "Bearer " + token },
      body: JSON.stringify({ provider: "football-data" }),
    });
    assert.strictEqual(probe.status, 200);
    const out = JSON.parse(probe.body);
    assert.strictEqual(out.ok, false);
    assert.match(out.reason, /key/i, "a missing key should be reported clearly");
  } finally {
    await s.close();
  }
});
