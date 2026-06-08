# Leo's World Cup — Architecture & Decisions

**Status:** Approved (decisions taken 2026-06-07).
**Design spec:** the full UI/UX spec is `design_handoff_leos_world_cup/README.md` (tokens, every
screen, interactions, state model, derived logic). This document records only the architectural
decisions that the handoff does **not** settle, plus how the new app reconciles with the existing
codebase.

## What we're building
A faithful production rebuild of the **Leo's World Cup** family-sweepstake tracker (the
`design_handoff_leos_world_cup` prototype) as a real React + TypeScript + Vite app, backed by a
small shared-state server so the whole family sees one board when self-hosted on Unraid.

## Decisions

### 1. Persistence — server-shared board (not localStorage-only)
The prototype persists to `localStorage` (per-device). We instead back the app with a **small Node
server holding one shared board** (`data/state.json`, revision/envelope model) exposed at
`GET/POST /api/state` — the same model the existing `legacy/server.js` already implements. Every
client hydrates from the server and polls for updates; admin writes propagate to all devices.
- The Zustand store keeps the prototype's **shape** (`settings`, `people`, `teamEdits`, `results`,
  `bracketNonce`) but its persistence is a **sync layer to the server**, not raw localStorage.
  localStorage is retained only as an offline read cache (mirrors the legacy client behaviour).

### 2. Replace the old app (kept as `legacy/`)
The old zero-dependency app (`server.js`, `fetcher.js`, `public/index.html`, its Docker/compose,
`manage.sh`, README/SETUP/DEV) moves to **`legacy/`** — not built, kept for reference. Its backend
concepts are **ported, not discarded**: shared-state envelope, admin login→token, server-side
masked API keys, and the team-name matching in `fetcher.js` all feed the new server. The root
`CLAUDE.md` and Docker setup are rewritten for the new app.

### 3. Two auth layers, both server-enforced
- **Viewer gate** (`VIEW_PASSWORD` env): gates the served app **and** `/api/state` (read).
  `/api/health` stays open for Docker's healthcheck. If `VIEW_PASSWORD` is unset → open (dev).
  Unauthenticated requests get a small standalone server-served login page; success sets an
  httpOnly cookie (opaque token, ~30-day expiry).
- **Admin** (`ADMIN_PASSWORD` env): gates **writes** to the shared board (`POST /api/state`,
  `/api/admin/*`). Login returns a bearer token (legacy pattern). The in-app "GROWN-UPS ONLY"
  console is the UI for this; the prototype's client-only PIN (`1966`) is replaced by a real
  server check so viewers can't write to the shared board.

### 4. API keys live server-side only
The prototype stores provider keys in localStorage. With a shared server, keys move **server-side**
(`data/admin.json`), are **never sent to the browser**, and are shown only masked (`•••• 1234`) —
the legacy guardrail. The admin "Match data & API keys" UI stays as designed; only where the key
lives changes. Real provider fetching happens **server-side** (browsers can't call providers due to
CORS) — the prototype's `testProvider`/sync becomes a thin call to a server proxy endpoint.

### 5. Styling — global CSS tokens + CSS Modules + inline (not Tailwind)
The design is pixel-exact with heavy dynamic inline styling and an already-complete
CSS-custom-property token system (`styles.css`). We port that token file verbatim as global CSS,
use CSS Modules for component structure, and keep inline styles where the prototype computes them.
Tailwind would add a lossy translation layer for no benefit.

### 6. Map libraries self-hosted
`d3-geo` + `topojson-client` come from npm; `world-atlas` `countries-110m.json` is self-hosted in
the client `public/`. No CDN `<script>` tags in the final app.

### 7. Runtime shape — built client served by a zero-dep server
Multi-stage Docker: a **build stage** (Node + npm + Vite) produces `client/dist`; the **runtime
stage** is a **zero-dependency Node server** that serves `client/dist` statically and provides
`/api/*` (shared state, auth, live-data proxy). Preserves the legacy "no npm install at runtime"
property; one container, Unraid-friendly. Dev keeps Vite's dev server proxying `/api` to the
running Node server.

### 8. Improvement required by the prompt
Saved knockout results must **drive actual advancement** through every later round (the prototype
only overrode the tapped tie's winner). The bracket recomputes winners from saved results, falling
back to the odds-seeded projection for unplayed ties.

## Repo layout (after migration)
```
/ (git: chewitt86/worldcup-hq, private, currently empty)
  legacy/            old app, kept for reference (not built)
  client/            React + TS + Vite SPA  (the design)
  server/            zero-dep Node server: static + /api (shared state, auth, proxy)
  Dockerfile         multi-stage (build client → run server)
  docker-compose.yml · manage.sh · .env.example · CLAUDE.md (rewritten)
  docs/superpowers/  specs + plans
```

## Out of scope (for now)
Real provider fetch+normalise is stubbed with a clear TODO (demo data drives the app until wired);
licensed flags/photos (kept as CSS bands / initials); push notifications for reminders (stay
local).
