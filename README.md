# ⚽ Leo's World Cup — Family Sweepstake HQ (self-hosted)

A bright, kid-friendly "sticker-album" tracker for the 2026 World Cup and a family
sweepstake. React + TypeScript (Vite) front-end backed by a tiny zero-dependency Node
server that keeps **one shared board** so the whole family sees the same scores. Runs as
a single Docker container on **Unraid** (or anything with Docker).

- Six sections — **Home · Sweepstake · Teams · Groups · Knockout · Map** — plus a
  PIN-gated **Admin** console.
- **Shared state:** the board (people, results, team edits) lives in `server/data/state.json`.
- **Live sync:** every browser polls the server and updates automatically.
- **Two passwords:** an admin login for editing, and an optional viewer password to gate
  the whole site. API keys are stored **server-side** and only ever shown masked.

## Quick start (any machine with Docker)
```bash
cp .env.example .env          # set ADMIN_PASSWORD (and VIEW_PASSWORD if you want a gate)
docker compose up -d --build
```
Open `http://<server-ip>:3050`. Back up `server/data/` and you've backed up everything.

## Running it on Unraid
**📖 Full step-by-step GUI walkthrough: [`docs/UNRAID-SETUP.md`](docs/UNRAID-SETUP.md).**

Short version: install the **Docker Compose Manager** plugin from Community Apps, get this
folder onto the server at `/mnt/user/appdata/worldcup-hq` (Git clone or SMB copy), create a
`.env` (`ADMIN_PASSWORD`), add a Compose stack pointing at the folder, and **Compose Up**.
Browse to `http://<TOWER-IP>:3050`. The only folder that must persist is `server/data`.

## Develop here, deploy there (Git workflow)
The repo is the source of truth (`github.com/chewitt86/worldcup-hq`, private).
1. Develop locally (two terminals — Vite proxies `/api` to the server):
   ```bash
   PORT=3050 ADMIN_PASSWORD=1966 node server/server.js
   npm --prefix client run dev        # http://localhost:5173
   ```
2. Commit + push.
3. On Unraid, make the app folder a clone of the repo and deploy with one command:
   ```bash
   ./manage.sh deploy                 # git pull --ff-only + rebuild + prune
   ```
You get version history and instant rollback (`git checkout <old>` then `deploy`).

## Admin & live data
Tap the ⚙️ cog → "GROWN-UPS ONLY" → log in with `ADMIN_PASSWORD` (demo PIN `1966`).
From there: manage players, tournament settings, enter knockout results, edit team data,
and configure the **Match data & API keys** (API-Football and others). Keys are saved
server-side and shown masked. *Note: the live fetch+normalise is currently a stub — see
the go-live notes in `CLAUDE.md`.*

## How it works
- `client/` — the Vite React+TS SPA (see `CLAUDE.md` for the source map).
- `server/server.js` + `server/lib/*` — zero-dep server: static client, `/api/state`
  (shared board), viewer gate, `/api/admin/*`, live-data proxy.
- `legacy/` — the previous single-file app, kept for reference (not built).

No database, no external services required to run. Built with help from Claude Code.
