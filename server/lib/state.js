/* ============================================================================
 * state.js — shared-board envelope store (zero dependencies)
 *
 * Ports the revision/envelope + atomic-write persistence from legacy/server.js.
 * The board is wrapped in an envelope: { rev, updatedAt, state }.
 *   - read()        → the current envelope; { rev:0, updatedAt:null, state:null }
 *                     when no file exists yet (or it is unreadable).
 *   - write(state)  → bumps rev, stamps updatedAt (ISO), and persists the
 *                     envelope atomically (write to a .tmp file, then rename).
 *
 * `createStateStore(file)` is a factory so tests can point at a temp file; the
 * module also exposes a default store bound to server/data/state.json.
 * Uses only built-in Node modules.
 * ========================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");

const DEFAULT_FILE =
  process.env.DATA_FILE || path.join(__dirname, "..", "data", "state.json");

/* Build a store bound to a specific file on disk. */
function createStateStore(file = DEFAULT_FILE) {
  /* Read the envelope; fall back to an empty board when missing/unreadable. */
  function read() {
    try {
      const env = JSON.parse(fs.readFileSync(file, "utf8"));
      return {
        rev: env.rev || 0,
        updatedAt: env.updatedAt || null,
        state: env.state == null ? null : env.state,
      };
    } catch (e) {
      return { rev: 0, updatedAt: null, state: null };
    }
  }

  /* Persist a new board: bump rev, stamp updatedAt, atomic tmp+rename. */
  function write(state) {
    const prev = read();
    const envelope = {
      rev: (prev.rev || 0) + 1,
      updatedAt: new Date().toISOString(),
      state: state == null ? null : state,
    };
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = file + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(envelope));
    fs.renameSync(tmp, file);
    return envelope;
  }

  return { read, write, file };
}

/* Default store bound to the runtime data file. */
const store = createStateStore();

module.exports = {
  createStateStore,
  DEFAULT_FILE,
  read: store.read,
  write: store.write,
};
