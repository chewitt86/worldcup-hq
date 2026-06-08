# 🖥️ Deploying Leo's World Cup on Unraid (GUI guide)

A step-by-step, mostly-GUI walkthrough. The app is one small Docker container that builds
from this repo. End result: the site on `http://<TOWER-IP>:3050`, with a shared family board.

> **Time:** ~15 minutes. **You'll need:** the Unraid web UI, and a way to get this repo's
> files onto the server (covered in Step 3).

---

## Step 1 — Install Community Applications (skip if you already have the **Apps** tab)
1. Unraid web UI → **Plugins** → **Install Plugin**.
2. Paste this URL and click **Install**:
   `https://raw.githubusercontent.com/Squidly271/community.applications/master/plugins/community.applications.plg`
3. An **Apps** tab appears in the top menu.

## Step 2 — Install the **Docker Compose Manager** plugin
1. Go to the **Apps** tab → search **`Docker Compose Manager`** (by *dcflachs*).
2. Click **Install**. When it finishes, a **Compose** section appears at the bottom of the
   **Docker** tab.

## Step 3 — Get the project folder onto the server
The container is **built from source**, so the repo needs to live on the server, ideally at
`/mnt/user/appdata/worldcup-hq`. Pick **one**:

**3a — Easiest (no Git): copy over the network (SMB).**
1. On Windows, open File Explorer → address bar → `\\<TOWER-IP>\appdata` (enter your Unraid
   login if asked).
2. Copy your whole `worldcup-hq` folder into `appdata`, so you end up with
   `appdata\worldcup-hq\` containing `Dockerfile`, `docker-compose.yml`, `client/`, `server/`, etc.
   *(Tip: delete `client\node_modules` before copying — it's huge and the build re-creates it.)*
   > Downside: future updates mean re-copying. With Git (3b) you update with one click/command.

**3b — Recommended (Git, enables one-click updates).** Open the Unraid terminal (the **`>_`**
icon, top-right of the web UI) and run:
```bash
mkdir -p /mnt/user/appdata/worldcup-hq && cd /mnt/user/appdata/worldcup-hq
git clone https://github.com/chewitt86/worldcup-hq.git .
```
The repo is **public**, so the clone (and all future `./manage.sh deploy` updates) need **no
login or token**. It contains no secrets — your passwords/API key live only in `.env` and
`server/data`, which are never committed.

## Step 4 — Create the password file (`.env`)
In `appdata\worldcup-hq` (over SMB or via the terminal), copy `.env.example` to **`.env`** and set:
```ini
ADMIN_PASSWORD=pick-a-good-one      # the in-app admin login
VIEW_PASSWORD=                       # optional: a shared password to gate the whole site
```
(Leave `VIEW_PASSWORD` blank for an open site on your home LAN.)

## Step 5 — Add the stack in the GUI
1. **Docker** tab → scroll to **Compose** → **Add New Stack** → name it **`worldcup-hq`**.
2. Click the **⚙️ (gear)** next to the new stack → **Edit Stack**:
   - **Directory / Compose file:** point it at `/mnt/user/appdata/worldcup-hq` (where the
     `docker-compose.yml` is). If it asks for compose *content*, paste the contents of
     `docker-compose.yml` from the repo.
3. Click **Compose Up**. The first run **builds the image** (compiles the app inside the
   container) — this takes a few minutes; watch the log window. When it finishes you'll see
   the `worldcup-hq` container running (green).

## Step 6 — Open it
Browse to **`http://<TOWER-IP>:3050`**. You should see the sticker-album home screen.
> Port 3050 already taken? Edit `docker-compose.yml` → change the **left** number in
> `"3050:3050"` (e.g. `"8090:3050"`), Compose Up again, and use that port.

## Step 7 — First-run setup (in the app)
1. Tap the **⚙️ cog** (top-right) → enter your `ADMIN_PASSWORD`.
2. **Match data & API keys:** paste your **API-Football** key (free at
   `dashboard.api-football.com`) → **🔌 Test** (should recognise the teams) → switch to **Live**
   → **🔄 Sync now**. Leave auto-sync on (it polls every ~15 min).
3. **Players:** rename the players to your real family and assign each their drawn teams.
4. **Danger zone → 🚀 Prepare for kickoff** to clear the demo scores and start fresh.

## Updating later
- **Git install (3b):** Unraid terminal →
  ```bash
  cd /mnt/user/appdata/worldcup-hq && ./manage.sh deploy
  ```
  (pulls the latest code, rebuilds, restarts) — or in the Compose Manager GUI use
  **Update Stack** / **Compose Down → Up**.
- **SMB copy (3a):** re-copy the changed files, then **Compose Up** again in the GUI.

## Your data is safe
Everything lives in `appdata/worldcup-hq/server/data/` (the shared board + your API key). It
survives rebuilds and updates. Back up that folder (or use `./manage.sh backup`) before big changes.

## Optional — a public web address (no port-forwarding)
`docker-compose.yml` has a commented **Cloudflare Tunnel** service. Uncomment it, paste a tunnel
token from Cloudflare Zero Trust, point the tunnel's public hostname at `worldcup-hq:3050`, and
Compose Up again for free HTTPS on your own domain.
