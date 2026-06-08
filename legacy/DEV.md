# 🛠️ Tweaking it live — and using Claude Code

The container is set up so you can change the source **on the server** and see it
without rebuilding the image:

- Edit **`public/index.html`** → just **refresh the browser**. The server reads the
  file fresh on every request, so front-end changes are instant.
- Edit **`server.js`** or **`fetcher.js`** → `docker restart worldcup-hq`.

The source of truth is the `worldcup-hq` folder on your server
(e.g. `/mnt/user/appdata/worldcup-hq`). Point any editor — or Claude Code — at it.

---

## Should I put Claude Code *inside* the container?

Short answer: **no, and you don't need to.** Baking the Claude Code agent into the
app image would bloat a tiny container, tie it to a Node runtime it doesn't otherwise
need, and tempt you into storing an API key in the image. The cleaner pattern is to
keep the **production container lean** and run Claude Code **against the project
folder**. Because the folder is bind-mounted into the running container, anything
Claude Code changes goes live on a browser refresh (or a quick restart for the server
files). Here are three ways, best first.

### Option 1 — Run Claude Code from your own computer (simplest)
1. Get the project folder onto your machine — either mount the Unraid share
   (the `worldcup-hq` folder) over SMB, or keep the folder in a Git repo you clone.
2. Install Claude Code:
   - **macOS / Linux / WSL (recommended, no Node needed):**
     `curl -fsSL https://claude.ai/install.sh | bash`
   - **Windows (PowerShell):** `irm https://claude.ai/install.ps1 | iex` (or use WSL)
   - **npm (any OS, needs Node 18+):** `npm install -g @anthropic-ai/claude-code`
3. `cd` into the folder and run `claude`. The first run does a one-time login with
   your **Claude Pro/Max** subscription, or an **Anthropic API key**.
4. Ask it for changes (“make the countdown bigger”, “add a goal-difference column”).
   Save → refresh the browser. If it edited `server.js`, `docker restart worldcup-hq`.

Docs: https://docs.claude.com/en/docs/claude-code/overview

### Option 2 — A throwaway dev container on Unraid (keeps everything on the box)
Use the included **`Dockerfile.dev`** (Node + Claude Code). Build once, then run it
interactively against the same folder, passing your key at runtime:

```bash
cd /mnt/user/appdata/worldcup-hq
docker build -f Dockerfile.dev -t wc-dev .
docker run -it --rm \
  -v /mnt/user/appdata/worldcup-hq:/app \
  -e ANTHROPIC_API_KEY=sk-ant-your-key \
  wc-dev claude
```

Edit with Claude Code inside that shell; your **production** `worldcup-hq` container
serves the result (refresh; restart for `server.js`). The dev container is disposable
(`--rm`) so nothing lingers and no key is stored.

### Option 3 — Claude Code on the Unraid host itself
Not recommended. The Unraid OS runs from RAM and resets on reboot, so host-installed
CLI tools don't persist cleanly. Use Option 1 or 2 instead.

---

## A note on keys and billing
Claude Code needs either a paid **Claude Pro/Max** login or an **Anthropic API key**
with credit. Whichever you use, **pass it at runtime** (as above) — don't commit it to
the folder or bake it into an image. If you ever shared this project publicly, add a
`.env` with the key and keep `.env` out of version control.

---

## Handy commands
```bash
docker compose up -d --build     # start / rebuild
docker restart worldcup-hq       # apply server.js / fetcher.js changes
docker logs -f worldcup-hq       # watch logs (incl. the auto-fetch poller)
```

---

## Updating the container with Claude Code

The repo ships with a `CLAUDE.md` (so Claude Code understands the project) and a
`manage.sh` helper. Tell Claude Code what you want changed, let it edit the files, then
have it apply the change with the lightest action:

```
./manage.sh refresh   # front-end only (public/index.html) -> just reload the browser
./manage.sh restart   # after editing server.js / fetcher.js
./manage.sh rebuild   # after Dockerfile / dependency / base-image changes
./manage.sh update    # pull newest base images (node, cloudflared), rebuild, prune
./manage.sh backup    # timestamped copy of data/ before anything risky
./manage.sh check     # node --check server.js && fetcher.js
./manage.sh logs | status
```

For Claude Code to run those `docker` commands it needs Docker access. Three ways:

1. **From your computer, targeting Unraid over SSH (no agent on the server):**
   mount the project folder (SMB or a Git clone), then
   `export DOCKER_HOST=ssh://root@<UNRAID-IP>` and run `claude` in the folder. Docker
   commands execute against the Unraid daemon; file edits land in the mounted folder.

2. **A dev container on Unraid (everything stays on the box):** build `Dockerfile.dev`
   (now includes the docker CLI) and run it with the project folder **and** the Docker
   socket mounted (command in the file header). Claude Code can then edit files and run
   `./manage.sh` directly.

3. **On the Unraid host via SSH:** install Claude Code with the native installer and run
   it in `/mnt/user/appdata/worldcup-hq`. Works, but host-installed tools don't persist
   across reboots cleanly — options 1 and 2 are tidier.

### Safety
- Mounting `/var/run/docker.sock` gives that container (and the agent in it) **full
  control of Docker** — it can stop/replace any container. Only do it if you're happy
  with that, run Claude Code **interactively** (review its diffs), and `./manage.sh backup`
  first.
- Pass `ANTHROPIC_API_KEY` at runtime; never bake it into an image or commit it.
- `cloudflared` auto-updates aren't needed; `./manage.sh update` refreshes it when you choose.

---

## Local + GitHub workflow (recommended middle path)

You don't need a full image-registry pipeline for this. The sweet spot:

**Use Git/GitHub for the code, keep building the tiny image on Unraid.**

- Put the project in a **private GitHub repo** (the included `.gitignore` already keeps
  `data/` — your board *and* API key — and `.env` out of the repo).
- Keep secrets in a git-ignored **`.env`** (copy from `.env.example`): `ADMIN_PASSWORD`
  and optionally `APIFOOTBALL_KEY`. `docker compose` reads `.env` automatically.
- Develop wherever you like (laptop or the server, with or without Claude Code), commit,
  push.
- On Unraid, make the app folder a clone of the repo and deploy with one command:
  ```
  ./manage.sh deploy     # git pull --ff-only + rebuild + prune
  ```
  (or just `./manage.sh restart` for server-only edits — bind mounts mean no rebuild.)

You get version history, instant rollback (`git checkout <old>` then `deploy`), and an
off-box backup of the code — without a registry, image tags, or a build/push/pull cycle.

### When the full image pipeline IS worth it
If you want CI builds + auto-deploy, or you outgrow one server: add a GitHub Actions
workflow that builds and pushes to **GHCR** on every push, switch compose from `build: .`
to `image: ghcr.io/you/worldcup-hq:latest`, and let **Watchtower** auto-pull. That's the
"proper" setup, but it's heavier than a 6-week family project needs. Ask Claude to wire
it up if you decide you want it.
