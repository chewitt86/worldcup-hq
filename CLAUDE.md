# Project: Leo's World Cup (self-hosted Unraid app)

A cartoon "sticker-album" World Cup 2026 tracker + family sweepstake. Mobile-first
React app with a shared family board so everyone sees the same scores. A PIN-gated
admin console controls everything; an optional viewer password gates the whole site.

It's a React + TypeScript + Vite rebuild of an earlier zero-dependency single-file app,
recreated from a design handoff (sticker-album look; shared state; live API-Football feed).

## Layout
- `client/` — the React + TypeScript + Vite SPA (the whole UI). Pixel-faithful port of
  the prototype: tokens in `src/styles/tokens.css`; typed data/logic in `src/data` +
  `src/lib`; Zustand store in `src/store` (+ `sync.ts`, the shared-board client); shared
  components in `src/components`; the six pages + admin in `src/pages`; app shell in
  `src/App.tsx`. Self-hosted map data at `public/geo/countries-110m.json`.
- `server/` — a **zero-dependency** Node server (built-in modules + global `fetch` only).
  Serves the built client and `/api`: the shared board (`/api/state`, revision envelope),
  the viewer gate, admin auth + masked provider keys (`/api/admin/*`), and the live-data
  proxy. Logic split into `server/lib/{state,auth,config,fetcher}.js`.
- `docs/` — deployment guides (`UNRAID-SETUP.md`, `DOMAIN-SETUP.md`).
- `Dockerfile` — multi-stage: build the client, then run the zero-dep server serving
  `client/dist` + `/api`. `docker-compose.yml`, `manage.sh`, `.env.example` at the root.
- `server/data/` — runtime data (shared board `state.json`, API keys `admin.json`).
  **Never edit or delete it.** Git-ignored.

## Local development
Two processes (Vite proxies `/api` to the server):
```
PORT=3050 ADMIN_PASSWORD=1966 node server/server.js   # API on :3050
npm --prefix client run dev                           # app on :5173
```
`./manage.sh dev` prints these. Admin login uses `ADMIN_PASSWORD` (demo: `1966`).

## Applying a change — pick the LIGHTEST option
- Changed only `client/src/**` → Vite HMR; just look at the browser (`npm --prefix client run dev`).
- Changed `server/**` → restart the node process (or `./manage.sh restart` for the container).
- Changed `Dockerfile` / deps → `./manage.sh rebuild`.
- Newer base images → `./manage.sh update`. Before anything risky → `./manage.sh backup`.
- After any change → `./manage.sh check` (server syntax + client typecheck + tests).

## Guardrails (please follow)
- **Secrets stay server-side.** API keys and `ADMIN_PASSWORD`/`VIEW_PASSWORD` never go into
  the client bundle. Keys live in `server/data/admin.json`, are shown only masked
  (`•••• 1234`), and are never returned to the browser.
- **Keep `server/` dependency-free** (built-in Node + global `fetch`) so the runtime image
  needs no `npm install`.
- **Don't change the shared board shape** (`settings`, `people`, `teamEdits`, `results`,
  `bracketNonce`) — client store, sync layer, and server all rely on it.
- **`selectTeams` must stay memoised** — `useStore(selectTeams)` loops infinitely if the
  selector returns a fresh object each call (see `store.ts`).
- **Don't touch `server/data/`.** To test a feed, use the Admin panel's 🔌 Test, not
  hardcoded keys.
- British English; kebab-case filenames; functional components; prefer the lightest change.

## Verify it's healthy
- `./manage.sh status` / `logs`. `GET /api/health` returns `{status:"healthy"}`.
- `npm --prefix client test` and `node --test server/**/*.test.js`.

## Known follow-ups (pre go-live)
- Reset the demo data to a clean slate for the real draw; wire the real live API
  (`server/lib/fetcher.js` mapping is a stub). The design is **32 teams / 8 groups** while
  the real 2026 WC is **48 / 12** — a decision is pending. See the go-live notes.
