# ⚽ World Cup 2026 — Cartoon Sweepstake HQ (self-hosted)

A fun, cartoony World Cup 2026 tracker + family sweepstake, packaged to run on your
**Unraid** server in Docker. Scores are saved **on the server**, so everyone in the
family sees the same board — not just whoever's browser typed them.

- All 48 teams in the real 12 groups, live group tables, qualification + "8 best
  third-placed teams" logic, auto-advancing knockout bracket, and a per-person
  sweepstake leaderboard with photos.
- **Shared state:** scores, people and photos are stored in `data/state.json`.
- **Live sync:** every browser refreshes from the server every ~20 seconds.
- **Optional auto-fetch:** a background poller can pull group results from a feed
  (off by default — see below).

---

## Quick start (any machine with Docker)

```bash
cd worldcup-hq
docker compose up -d --build
```

Open `http://<server-ip>:3050`. That's it.

The board persists in `./data/state.json`. Back that file up and you've backed up
everything (there's also a "Save backup" button inside the app, under ⚙️).

---

## Running it on Unraid

You have two easy routes.

### Route A — Docker Compose Manager plugin (recommended)
1. In **Community Apps**, install **Docker Compose Manager**.
2. Copy this whole `worldcup-hq` folder onto the server, e.g. to
   `/mnt/user/appdata/worldcup-hq` (use the *Krusader* app, an SMB share, or `scp`).
3. In **Docker → Compose**, click **Add New Stack**, name it `worldcup-hq`, point it
   at that folder (or paste the contents of `docker-compose.yml`), then **Compose Up**.
4. Browse to `http://<TOWER-IP>:3050`.

### Route B — SSH build + run
```bash
# copy the folder to the server first, then:
cd /mnt/user/appdata/worldcup-hq
docker build -t worldcup-hq .
docker run -d --name worldcup-hq -p 3050:3050 \
  -v /mnt/user/appdata/worldcup-hq/data:/app/data \
  --restart unless-stopped worldcup-hq
```

If port 3050 clashes with something, change the **left** number (e.g. `-p 8090:3050`
or the compose `ports:` line) and use that port in the URL.

> **Container path to map:** `/app/data` → `/mnt/user/appdata/worldcup-hq/data`
> (this is the only folder that needs to persist).

---

## Using it

- Tap **⚙️ → Manage People** to replace the placeholder names with the real family,
  upload photos, and assign each person their teams. (Photos are resized and stored
  in the shared board, so everyone sees them.)
- Tap **Matches** and type scores — group tables, who's knocked out, the knockout
  bracket and the sweepstake leaderboard all update instantly, for everyone.
- Tap **Teams** for facts, World Cup titles, indicative winner odds and who's
  backing each nation; each card shows live ✅ Through / ❌ Out status.
- Every person card shows a clear **Still in vs Knocked out** split and a ⭐ best-shot
  team; when all of someone's teams are out they're flagged **OUT OF THE SWEEPSTAKE**.
- The **Knockout** bracket unlocks once all 12 groups finish; pick the real
  Round-of-32 matchups from the dropdowns and winners advance automatically.

To swap in the other (neon stadium) theme later, just replace `public/index.html`
and refresh.

**Tweaking it live / using Claude Code:** the compose file bind-mounts the source, so
edits to `public/index.html` show on a browser refresh (server files need a
`docker restart worldcup-hq`). See **DEV.md** for the recommended Claude Code setup —
run it against the project folder rather than baking it into the container.

---

## The Admin panel (log in to manage everything)

The public page is **read-only** — ideal to hand to your godson. Everything is run from
a password-protected admin panel so the board can't be messed up.

- Set the password in `docker-compose.yml` -> `ADMIN_PASSWORD=` (please change it from
  `changeme`). Lightweight auth, fine for a home network.
- On the site, tap **🔒** (top-right) and log in; the icon becomes **🛠**.
- In the panel you can:
  - **Paste/change the API key** and choose the data source — stored on the server,
    survives restarts, so you never have to touch the compose file again.
  - **🔌 Test connection** — makes a live call and reports how many matches it sees and
    whether every team name was recognised. Your "is the API working?" button.
  - Toggle **Automatic updates** on/off, and **Manage People & Photos**.
  - With automatic updates **off**, you (as admin) get editable score boxes in
    **Matches** and a manual **Knockout** bracket — the fallback if the API ever stops.
    Viewers still only ever see the read-only result.

> The API key is stored server-side and only shown masked (`•••• 1234`). The admin
> password gates all editing. For internet exposure put HTTPS in front; on a home LAN
> it's fine.

## Fully automatic results (API-Football)

This build is set up to **run itself** — once a data key is in place, your godson
just opens the page and watches. Group scores, group tables, who's qualified, the
**entire knockout bracket**, who's been knocked out, and the sweepstake leaderboard
all update on their own. There's nothing to tap; the score-entry screens become a
read-only **🔴 LIVE** view.

**Getting it running:**

1. Get a **free** API key — sign up at **https://dashboard.api-football.com**
   (free plan = 100 requests/day, plenty for the 20-minute poll this uses).
2. Open `docker-compose.yml` and paste it into `APIFOOTBALL_KEY=`.
3. `docker compose up -d`. Done — it's now automatic.

That's it. The container polls API-Football every 20 minutes (well under the free
limit), maps every match onto the board, and flips the site into live mode on the
first successful sync. If the key is missing or the feed hiccups, it logs the issue
and the board simply waits — it never crashes.

> Got your key through **RapidAPI** instead of api-football.com? Set
> `APIFOOTBALL_RAPIDAPI=true` and paste that key — same result.

**Check it's working:** `docker logs -f worldcup-hq` should show lines like
`[autofetch] synced rev N — groups+X, knockout:yes`. The site shows a red
“LIVE — results update automatically” bar when it's connected.

**Polling faster:** during match days you can lower `AUTOFETCH_INTERVAL_MIN`, but the
free tier is 100 calls/day, so 20 minutes (~72/day) is the safe default. A paid plan
lets you poll every minute if you ever want near-live scores.

### Other sources (optional)
- `AUTOFETCH_PROVIDER=jsonurl` + `AUTOFETCH_URL=` — poll any URL returning a JSON
  array of games: `[{ "home":"Mexico","away":"South Africa","hs":2,"as":0,"finished":true,
  "round":"group" }]`. Add `"round":"Round of 16"` and `"pen_winner":"France"` for knockout.
- `AUTOFETCH_PROVIDER=wc2026` — the open-source worldcup26 API (group games only).

> **Honest note:** the full pipeline (fetch → match teams → groups + knockout →
> who's in) is built and tested against API-Football's documented response shape and a
> mock feed. I couldn't hit the live API from my build environment (no key there), so
> if the very first sync looks off, check the key and `docker logs`. Everything is
> mapped by team name with aliases handled (USA, Korea Republic, Türkiye, Côte d'Ivoire,
> etc.). If a name ever fails to match, tell me and I'll add the alias.

## How it works (for the curious)

- `server.js` — tiny zero-dependency Node server: serves `public/`, exposes
  `GET/POST /api/state` (shared board) and `GET /api/health`, and runs the optional poller.
- `fetcher.js` — feed adapters + robust team-name matching onto the 72 group fixtures.
- `public/index.html` — the whole cartoon site (loads/saves via the API, with a
  localStorage fallback if the server is ever unreachable).
- `data/state.json` — your data. Created on first run. Last-write-wins (fine for a family).

No database, no build step, no external services required.
