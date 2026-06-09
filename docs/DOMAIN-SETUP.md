# 🌐 Putting the app on your domain (leosworldcup.co.uk)

Goal: `https://leosworldcup.co.uk` → your self-hosted app, with automatic HTTPS.

The easy, safe way for a home server is a **Cloudflare Tunnel** — it needs **no router
port-forwarding**, gives **free HTTPS**, hides your home IP, and works even on a dynamic IP or
behind CGNAT. Your app already has a `cloudflared` service stubbed in `docker-compose.yml`.

> ⚠️ Once the site is on the internet, **set `VIEW_PASSWORD`** in `.env` so only people you
> give the password to can see the family board, and make sure `ADMIN_PASSWORD` is strong.

## A — Cloudflare Tunnel (recommended)

### 1. Put the domain on Cloudflare (one-time, free)
1. Create a free account at **cloudflare.com**.
2. **Add a site** → enter `leosworldcup.co.uk` → choose the **Free** plan.
3. Cloudflare gives you **two nameservers**. Log in to wherever you bought the domain (your
   registrar) and change its nameservers to those two. Propagation takes anywhere from a few
   minutes to a few hours; Cloudflare emails you when it's **Active**.

### 2. Create the tunnel
> Cloudflare renamed these menus in 2026 — current paths below.
1. Cloudflare dashboard → **Zero Trust** (opens `one.dash.cloudflare.com`) →
   **Networks** → **Connectors** → **Cloudflare Tunnels** → **Create a tunnel**.
2. Connector type **Cloudflared** → **Next** → enter a name (e.g. `worldcup`) → **Save tunnel**.
3. On the **"Choose an environment"** install screen, click the **Docker** tab. You'll see a
   command containing `--token eyJ...`. **Copy only the token** (the long `eyJ...` string) —
   don't run the command; your compose file runs cloudflared for you. Then click **Next**
   (the connector goes green once you deploy in step 3).

### 3. Run the connector on Unraid
The `cloudflared` service is already in `docker-compose.yml` behind a `tunnel` profile, so you
**don't edit any tracked file** (the token lives in your git-ignored `.env`, safe from
`git pull`). In the Unraid terminal:
```bash
cd /mnt/user/appdata/worldcup-hq
nano .env          # add the two lines below, then Ctrl+O Enter, Ctrl+X
```
Add (paste your real token):
```ini
CLOUDFLARE_TUNNEL_TOKEN=eyJ...your-token...
COMPOSE_PROFILES=tunnel
```
Then bring it up (this also starts the cloudflared container):
```bash
./manage.sh deploy
```
The tunnel shows as **Healthy/Connected** back on the Cloudflare Tunnels page.

### 4. Point the hostname at the app
1. Open your tunnel (Zero Trust → Networks → Connectors → Cloudflare Tunnels → click it →
   **Edit**) and go to the **Published applications** tab (this is what used to be called
   "Public Hostname"). Select **Add a published application** (or **+ Add**):
   - **Subdomain:** leave blank (for the bare domain) — or `www`.
   - **Domain:** `leosworldcup.co.uk` (pick it from the dropdown).
   - **Service → Type:** `HTTP`. **URL:** `worldcup-hq:3050`
     (the container name + port — both containers share the compose network, so no IP needed).
2. **Save**. Optionally add a second hostname for `www.leosworldcup.co.uk` the same way.

### 5. Done
Visit **`https://leosworldcup.co.uk`** — Cloudflare serves it over HTTPS automatically. No
ports opened on your router, your home IP stays hidden.

> Tip: you can add Cloudflare Access in Zero Trust later if you ever want Google/email login in
> front of the whole site instead of (or as well as) the built-in `VIEW_PASSWORD`.

## B — Alternative: reverse proxy + port-forward (more involved)
If you'd rather not use Cloudflare: run **NGINX Proxy Manager** (from Community Apps), forward
ports **80 + 443** on your router to Unraid, add a **DNS A record** for `leosworldcup.co.uk`
pointing at your home's public IP (use **DDNS** if your IP changes), then in NPM add a Proxy
Host: domain `leosworldcup.co.uk` → forward to `worldcup-hq` (or the Unraid IP) port `3050`,
and request a **Let's Encrypt** certificate for free HTTPS. This exposes your IP and needs
router access, which is why the tunnel is the easier, safer default.
