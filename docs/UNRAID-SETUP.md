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

## Step 3 — Clone the project onto the server (Git)
The container is **built from source**, so the repo needs to live on the server at
`/mnt/user/appdata/worldcup-hq`. The repo is **public**, so this is login-free.

1. Open the Unraid terminal — the **`>_`** icon at the top-right of the web UI.
2. Run:
   ```bash
   git clone https://github.com/chewitt86/worldcup-hq.git /mnt/user/appdata/worldcup-hq
   ```
That's the whole code on the server, and later `./manage.sh deploy` pulls updates with **no
token**. No secrets are in the repo — your passwords and API key live only in `.env` and
`server/data`, which are never committed.

> Prefer not to use Git? You can instead copy the folder to `\\<TOWER-IP>\appdata` over SMB
> from Windows — but then updates mean re-copying rather than one command.

## Step 4 — Create the password file (`.env`)
The repo ships a template called **`.env.example`** at the **top level** of the folder
(`/mnt/user/appdata/worldcup-hq/.env.example`). It's a **dotfile** — the name starts with a `.` —
so most file browsers **hide it by default** (that's why it can be hard to find). In a terminal
it always shows with `ls -a`.

Copy it to **`.env`** and set your passwords. In the Unraid terminal:
```bash
cd /mnt/user/appdata/worldcup-hq
cp .env.example .env
nano .env          # edit, then Ctrl+O Enter to save, Ctrl+X to exit
```
Set:
```ini
ADMIN_PASSWORD=pick-a-good-one      # the in-app admin login (the ⚙️ cog)
VIEW_PASSWORD=                       # optional: a shared password to gate the whole site
```
Leave `VIEW_PASSWORD` blank for an open site on your home LAN; **set it** once you put the app on
a public domain (see the domain guide).

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
In the Unraid terminal:
```bash
cd /mnt/user/appdata/worldcup-hq && ./manage.sh deploy
```
That pulls the latest code, rebuilds the image, and restarts — no token needed. (Or, in the
Compose Manager GUI: **Compose Down → Compose Up**.)

## Your data is safe
Everything lives in `appdata/worldcup-hq/server/data/` (the shared board + your API key). It
survives rebuilds and updates. Back up that folder (or use `./manage.sh backup`) before big changes.

## Optional — a public web address on your own domain
Want `https://leosworldcup.co.uk` instead of an IP:port? See **[`docs/DOMAIN-SETUP.md`](DOMAIN-SETUP.md)**
— a step-by-step Cloudflare Tunnel guide (free HTTPS, no router port-forwarding). Remember to set
`VIEW_PASSWORD` once the site is internet-facing.
