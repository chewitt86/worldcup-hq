# 🏗️ Setup guide — World Cup HQ on Unraid + Cloudflare

End result: the site running on your Unraid server, data saved, admin-protected, and
reachable at `https://worldcup.yourdomain.com` over HTTPS — **without** opening any
ports on your router.

---

## Part 0 — Before you start
- Unraid 6.12+ (7.x ideal), **array started**, Docker enabled
  (*Settings → Docker → Enable Docker: Yes*).
- **Community Applications** plugin installed (it's the Unraid "app store" — *Apps* tab).
- A domain already added to your **Cloudflare** account (free plan is fine), i.e. your
  domain's nameservers point at Cloudflare.

---

## Part 1 — Put the app on the server
Goal: the `worldcup-hq` folder living at `/mnt/user/appdata/worldcup-hq`.

Pick whichever is easiest:
- **SSH/scp from your computer:**
  `scp -r worldcup-hq root@<UNRAID-IP>:/mnt/user/appdata/`
- **Unzip on the server:** copy `worldcup-hq.zip` into `/mnt/user/appdata/` (via an SMB
  share or the *Dynamix File Manager*), then SSH in and run
  `cd /mnt/user/appdata && unzip worldcup-hq.zip`.

Then edit `worldcup-hq/docker-compose.yml` and set a strong **`ADMIN_PASSWORD=`**.
Leave `APIFOOTBALL_KEY=` blank — you'll paste it inside the app later.

---

## Part 2 — Install the Compose plugin
1. *Apps* tab → search **Compose Manager Plus** → **Install**.
   (The older "Docker Compose Manager" is deprecated; Compose Manager Plus replaces it.)
2. Go to the *Docker* tab — there's now a **Compose** section at the bottom.

> Prefer a GUI? **Portainer** (also in Community Apps) can deploy the stack instead.
> Or just use SSH + `docker compose` (Part 3 alternative).

---

## Part 3 — Run the app
1. *Docker* tab → **Compose** → **Add New Stack** → name it `worldcup-hq`.
2. Point the stack at the folder's compose file
   (`/mnt/user/appdata/worldcup-hq/docker-compose.yml`) — Compose Manager Plus has an
   "edit stack / use existing path" option for this.
3. Click **Compose Up**. First run builds the image (1–2 minutes).
4. Test it: open `http://<UNRAID-IP>:3050` in a browser — you should see the site.

**SSH alternative (same result):**
```bash
cd /mnt/user/appdata/worldcup-hq
docker compose up -d --build
```

---

## Part 4 — Create a Cloudflare Tunnel
1. Cloudflare dashboard → **Zero Trust** → **Networks → Tunnels**
   (on some accounts it's **Access → Tunnels**) → **Create a tunnel**.
2. Choose **Cloudflared**, give it a name (e.g. `unraid`), **Save**.
3. On the "Install connector" screen, pick **Docker** and **copy the token** — it's the
   long string right after `--token`. Keep it handy (don't include the leading space).

---

## Part 5 — Run the tunnel connector on Unraid
Easiest: add it to the **same stack**. Open `docker-compose.yml`, un-comment the
`cloudflared:` block at the bottom, paste your token, and **Compose Up** again:
```yaml
  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: cloudflared
    restart: unless-stopped
    command: tunnel --no-autoupdate run --token PASTE_YOUR_TUNNEL_TOKEN
```
(Because both run in one stack, the tunnel can reach the app by name: `worldcup-hq:3050`.)

> GUI alternative: *Apps* tab → search **cloudflared** → install a template and paste the
> token into its arguments. If you do this, the tunnel reaches the app at
> `http://<UNRAID-IP>:3050` instead.

Back in the dashboard the tunnel should flip to **Healthy** within a few seconds.

---

## Part 6 — Point your domain at the app
1. Open your tunnel → **Public Hostname** tab → **Add a public hostname**.
2. **Subdomain:** `worldcup`  **Domain:** `yourdomain.com`.
3. **Service:** Type **HTTP**, URL:
   - `worldcup-hq:3050` if cloudflared is in the same stack (recommended), **or**
   - `<UNRAID-IP>:3050` if you installed cloudflared separately.
4. **Save**. Cloudflare creates the DNS record automatically and serves HTTPS for you.
5. Visit **`https://worldcup.yourdomain.com`** — that's the live site. 🎉

---

## Part 7 — Make it fully automatic
1. On the site tap **🔒** (top-right) → log in with your `ADMIN_PASSWORD`.
2. In the Admin panel: choose **API-Football**, paste your key, hit **🔌 Test connection**
   (you want ~104 matches recognised), then **💾 Save**. Automatic updates are now ON.
3. **Manage People & Photos** → add the family and assign teams.

Your godson just opens the link from then on — scores, the bracket, who's knocked out and
the sweepstake all update on their own.

---

## Part 8 (optional, recommended) — Keep it private to your family
Cloudflare **Access** can require a quick e-mail verification before anyone sees the site:
1. Zero Trust → **Access → Applications → Add an application → Self-hosted**.
2. Application domain: `worldcup.yourdomain.com`.
3. Add a policy: **Allow** → *Emails* → list your family's addresses (they get a one-time
   PIN by email). Save.

Skip this if you're happy for the (read-only) page to be public.

---

## Other Unraid containers worth having
- **Compose Manager Plus** *(used above)* — run/manage the stack. (Or **Portainer**.)
- **cloudflared** *(used above)* — the tunnel connector for your domain.
- **Uptime Kuma** *(optional)* — pings `https://worldcup.yourdomain.com` and alerts you if
  it ever goes down.
- **Nginx Proxy Manager** or **SWAG** *(optional)* — only needed if you'd rather
  port-forward 80/443 yourself instead of using the tunnel. With Cloudflare Tunnel you
  don't need a reverse proxy at all.
- **Watchtower** *(optional)* — auto-updates images. Fine for `cloudflared`; **skip it for
  `worldcup-hq`** since that image is built locally, not pulled from a registry.

---

## Backups & changes
- **Back up** `/mnt/user/appdata/worldcup-hq/data/` — `state.json` (the board) and
  `admin.json` (your settings + key) are everything. There's also a Backup button in the
  app's ⚙️ menu.
- To restyle or extend it later, see **DEV.md** (live editing + using Claude Code).

---

## Troubleshooting
- **Site won't load on `:3050`** → `docker logs worldcup-hq`; make sure the stack is *Up*.
- **Tunnel shows Inactive / Down** → token wrong or connector not running:
  `docker logs cloudflared`.
- **Domain gives 502 Bad Gateway** → the Public Hostname *Service* URL/port is wrong. Same
  stack → `worldcup-hq:3050`; separate cloudflared → `<UNRAID-IP>:3050`.
- **"Test connection" fails in the app** → check the key/plan, then `docker logs worldcup-hq`.
  If it lists "couldn't match" team names, send them to Claude to add as aliases.
- **Locked out of admin** → fix `ADMIN_PASSWORD` in the compose file and Compose Up again.
