"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { createStateStore } = require("./state");

/* Each test gets a fresh temp file so nothing touches server/data. */
function tempStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wchq-state-"));
  const file = path.join(dir, "nested", "state.json"); // nested → exercises mkdir
  return { store: createStateStore(file), file, dir };
}

test("read() returns { rev:0, state:null } when no file exists", () => {
  const { store } = tempStore();
  const env = store.read();
  assert.strictEqual(env.rev, 0);
  assert.strictEqual(env.state, null);
});

test("write(state) bumps rev on each call", () => {
  const { store } = tempStore();
  const a = store.write({ hello: "world" });
  assert.strictEqual(a.rev, 1);
  const b = store.write({ hello: "again" });
  assert.strictEqual(b.rev, 2);
  assert.strictEqual(store.read().rev, 2);
});

test("write(state) stamps an ISO updatedAt timestamp", () => {
  const { store } = tempStore();
  const env = store.write({ ok: true });
  assert.strictEqual(typeof env.updatedAt, "string");
  // Round-trips through Date and matches the canonical ISO string.
  assert.strictEqual(new Date(env.updatedAt).toISOString(), env.updatedAt);
});

test("write persists atomically (tmp removed, file readable back)", () => {
  const { store, file } = tempStore();
  const state = { results: { "R32:0": { played: true } }, n: 7 };
  store.write(state);
  assert.ok(fs.existsSync(file), "state file should exist after write");
  assert.ok(!fs.existsSync(file + ".tmp"), "tmp file should not linger");
  const env = store.read();
  assert.deepStrictEqual(env.state, state);
  assert.strictEqual(env.rev, 1);
});

test("rev survives a fresh store instance over the same file", () => {
  const { file } = tempStore();
  createStateStore(file).write({ a: 1 });
  createStateStore(file).write({ a: 2 });
  assert.strictEqual(createStateStore(file).read().rev, 2);
});
