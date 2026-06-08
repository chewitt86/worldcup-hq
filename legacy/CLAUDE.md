# Project: World Cup HQ (self-hosted Unraid app)

A single small Node app (no npm dependencies) that shows a cartoon World Cup 2026
tracker + family sweepstake. The public page is read-only; an admin panel (password)
controls everything. Results come from API-Football automatically; manual entry is the
fallback.

## Files
- `public/index.html` — the ENTIRE front-end (HTML + CSS + JS in one file).
- `server.js` — zero-dependency HTTP server: serves the site, `/api/state`,
  `/api/admin/*`, and runs the results poller. Uses only built-in Node + global `fetch`.
- `fetcher.js` — feed adapters (apifootball / jsonurl / wc2026), team-name matching,
  and the knockout (`koLive`) builder.
- `docker-compose.yml` — runs the app (and optionally `cloudflared`). It bind-mounts
  `public/`, `server.js`, `fetcher.js` for live editing.
- `manage.sh` — helper commands (see below).
- `data/` — runtime data. **Never edit or delete it.** `data/state.json` is the board;
  `data/admin.json` holds settings incl. the API key.

## Applying a change — pick the LIGHTEST option
- Changed only `public/index.html` → no action; just refresh the browser.
- Changed `server.js` or `fetcher.js` → `./manage.sh restart` (bind-mounted; no rebuild).
- Changed `Dockerfile` / base image / added a dependency → `./manage.sh rebuild`.
- Want newer base images (node, cloudflared) → `./manage.sh update`.
- Before anything risky → `./manage.sh backup`.
- After editing JS → `./manage.sh check` (runs `node --check`).

## Guardrails (please follow)
- NEVER put secrets (API key, admin password) into `public/index.html` or anything sent
  to the browser. The key stays server-side (`data/admin.json` / env) and is only ever
  shown masked.
- Keep `server.js` dependency-free so no `npm install` is ever required.
- Don't change the shared state shape (`results`, `people`, `ko`, `koLive`, `mode`) —
  client and server both rely on it.
- Don't touch `data/`. To test the feed, use the admin panel's "🔌 Test connection",
  not hardcoded keys.
- Prefer a restart over a rebuild; prefer a refresh over a restart.

## Verify it's healthy
- `./manage.sh status` and `./manage.sh logs`.
- `GET /api/health` returns `{status:"healthy", ...}`.
