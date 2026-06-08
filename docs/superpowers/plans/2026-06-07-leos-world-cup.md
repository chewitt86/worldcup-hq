# Leo's World Cup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faithfully rebuild the `design_handoff_leos_world_cup` prototype as a production React + TypeScript + Vite SPA, backed by a small zero-dependency Node server providing one shared family board, viewer + admin auth, and a live-data proxy stub, deployable as a single Docker container on Unraid.

**Architecture:** A `client/` Vite SPA (the design) talks to a `server/` zero-dep Node API that owns the shared board (`data/state.json`, revision/envelope), enforces a viewer gate + admin auth, keeps provider API keys server-side, and proxies live-data fetches. Multi-stage Docker builds the client and runs the server serving `client/dist` + `/api/*`. Decisions recorded in `docs/superpowers/specs/2026-06-07-leos-world-cup-architecture.md`.

**Tech Stack:** React 18, TypeScript, Vite, Zustand, react-router (hash routes), d3-geo + topojson-client (self-hosted world-atlas), Vitest + Testing Library, zero-dependency Node (runtime server), Docker.

---

## Source-of-truth & conventions

- **Prototype is the visual source of truth.** For every visual component/page, the matching
  `design_handoff_leos_world_cup/home/*.jsx` file is the reference to port, and the matching
  `design_handoff_leos_world_cup/screenshots/*.png` is the pixel target. Visual tasks reference
  these rather than re-transcribing hundreds of lines.
- **Porting transform (applies to every JSX port):** `<script>`/`window.*` scaffolding →
  ES modules + imports; `window.WCHQ` static data → typed imports from `client/src/data/*`;
  `window.WCHQStore` → the Zustand store hooks; `window.X = ...` exports → named `export`;
  keep class names, inline styles, SVG, and exact pixel values **verbatim**.
- **British English** in copy/comments; **kebab-case** filenames; functional components.
- **TDD** is used for logic and server tasks (real test code below). Visual ports use the
  per-component **build-and-verify loop** (below) instead of unit tests.
- **Commit after every task.** Conventional commits. Never `--no-verify`.

### Visual build-and-verify loop (used in Phases 4–8)
For each component/page: (1) port the reference JSX → target file per the transform; (2)
`npm run dev` and open the route; (3) compare against the screenshot at ~390px width and at ≥760px;
(4) fix spacing/size/colour/copy until it matches; (5) `npm run build && npm run typecheck` clean;
(6) commit. Ambiguities → ask the user (the prompt invites this).

---

## File structure (target)

```
/  (git root: chewitt86/worldcup-hq)
  legacy/                         old app, moved intact, not built
  client/
    index.html
    vite.config.ts  tsconfig.json  package.json  vitest.config.ts
    public/geo/countries-110m.json        self-hosted world-atlas
    src/
      main.tsx  App.tsx  router.tsx
      styles/tokens.css  styles/global.css
      data/teams.ts  data/tournament.ts  data/map.ts  data/flags.ts   (ported static data + derived logic)
      lib/bracket.ts  lib/standings.ts  lib/countdown.ts               (pure logic, tested)
      store/types.ts  store/store.ts  store/sync.ts                     (Zustand + server sync)
      components/   (Flag, Avatar, Wobbles, Backdrop, Confetti, Countdown, Toast,
                     PersonPopup, Podium, PageTitle, TierBadge, OddsPill, Backers,
                     TopNav, Ticker, NextUpCard, PanZoom, MatchPopup)
      pages/        (home, sweepstake, teams, groups, knockout, map, admin)
      map/          (world-map + globe rendering)
  server/
    server.js  lib/state.js  lib/auth.js  lib/config.js  lib/fetcher.js  public-login.html
    data/                        runtime state.json + admin.json (gitignored)
  Dockerfile  docker-compose.yml  manage.sh  .env.example  .gitignore  CLAUDE.md
  docs/superpowers/specs + plans
```

---

## Phase 0 — Repo, scaffold, migration

### Task 0.1: Initialise git against the existing private repo
**Files:** Create: `.gitignore` (root), Modify: repo root.
- [ ] **Step 1:** `git init -b main`
- [ ] **Step 2:** Write root `.gitignore`:
```
node_modules/
client/dist/
server/data/*
!server/data/.gitkeep
.env
*.tmp
backups/
.DS_Store
```
- [ ] **Step 3:** `git remote add origin https://github.com/chewitt86/worldcup-hq.git`
- [ ] **Step 4:** Commit current state (design handoff + docs):
```bash
git add -A && git commit -m "chore: initial commit — design handoff, specs, plan"
```
- [ ] **Step 5 (push — confirm with user first):** `git push -u origin main`

### Task 0.2: Move the old app to legacy/
**Files:** Move: `server.js fetcher.js public/ docker-compose.yml Dockerfile Dockerfile.dev manage.sh README.md SETUP-GUIDE.md DEV.md .env.example data/` → `legacy/`.
- [ ] **Step 1:** `mkdir legacy && git mv server.js fetcher.js public docker-compose.yml Dockerfile Dockerfile.dev manage.sh README.md SETUP-GUIDE.md DEV.md .env.example data legacy/` (move `CLAUDE.md` last is separate — it gets rewritten in Phase 9; copy the old one to `legacy/CLAUDE.md` first).
- [ ] **Step 2:** Verify nothing at root still references moved files. Commit: `chore: move old zero-dep app to legacy/`.

### Task 0.3: Scaffold the Vite client
**Files:** Create: `client/` (Vite react-ts), `client/package.json` deps.
- [ ] **Step 1:** Scaffold: `npm create vite@latest client -- --template react-ts`
- [ ] **Step 2:** Add deps: `zustand react-router-dom d3-geo topojson-client`; dev deps: `vitest @testing-library/react @testing-library/jest-dom jsdom @types/d3-geo @types/topojson-client`.
- [ ] **Step 3:** `vite.config.ts`: dev server `server.proxy` maps `/api` → `http://localhost:3050` (the Node server); base `./` for static hosting.
- [ ] **Step 4:** Fonts: add the Google Fonts `<link>` for Luckiest Guy + Baloo 2 to `client/index.html` head (matches prototype); set `html,body{background:#1b2a4a}` and `#root` full-height per the prototype HTML.
- [ ] **Step 5:** `npm --prefix client run build` succeeds. Commit: `feat: scaffold vite react-ts client`.

### Task 0.4: Scaffold the zero-dep server
**Files:** Create: `server/server.js`, `server/data/.gitkeep`.
- [ ] **Step 1:** Minimal `server/server.js`: zero-dep http server, `GET /api/health` → `{status:"healthy"}`, serves `client/dist` statically (path-normalised, no traversal), SPA fallback to `index.html`. `PORT=3050`.
- [ ] **Step 2:** `node --check server/server.js`; run it and `curl /api/health`. Commit: `feat: scaffold zero-dep node server (health + static)`.

### Task 0.5: Port design tokens
**Files:** Create: `client/src/styles/tokens.css` (verbatim copy of `home/styles.css`), `client/src/styles/global.css` (the `html/body/#root` rules from the prototype HTML + `input,select,button,textarea` font). Import both in `main.tsx`.
- [ ] **Step 1:** Copy `home/styles.css` → `tokens.css` unchanged (it is already the token system).
- [ ] **Step 2:** Import in `main.tsx`; render a smoke `<div className="sticker">` and confirm the navy outline + hard shadow + cream fill appear. Commit: `feat: port sticker-album design tokens`.

---

## Phase 1 — Static data + derived logic (TDD)

> Port `home/data.js`, `home/data-tournament.js`, `home/data-map.js` to typed modules. Keep all
> data **identical**. Add the advancement-recompute improvement. These are pure functions — full TDD.

### Task 1.1: Teams + flags module
**Files:** Create: `client/src/data/teams.ts`, `client/src/data/flags.ts`, Test: `client/src/data/flags.test.ts`.
- [ ] **Step 1 (test):** flagCss returns a `linear-gradient(90deg,...)` for `dir:"v"`, a radial for `"centre"`, the SVG data-URI for `"cross"`, and `180deg` default; unknown code → `"#ccc"`.
```ts
import { flagCss } from './flags';
test('vertical bands → 90deg gradient', () => {
  expect(flagCss('MEX')).toMatch(/^linear-gradient\(90deg/);
});
test('unknown code → grey', () => { expect(flagCss('ZZZ')).toBe('#ccc'); });
```
- [ ] **Step 2:** Run → fails (no module).
- [ ] **Step 3:** Port the 16 base teams from `data.js` + the 16 `EXTRA` from `data-tournament.js` into one typed `TEAMS: Record<string, Team>` in `teams.ts`; port `META`, `SQUAD_SLUG`/`squad` assignment. Port `flagCss` into `flags.ts` (typed). Define `Team` type (`name, bands, dir, tier, odds, titles?, fact?, squad?`).
- [ ] **Step 4:** Run → passes.
- [ ] **Step 5:** Commit: `feat: port teams + flag-css data`.

### Task 1.2: People, ticker, next-up, kickoff
**Files:** Create: `client/src/data/teams.ts` exports `PEOPLE, TICKER, NEXTUP, KICKOFF` (from `data.js`), Test: `client/src/data/teams.test.ts`.
- [ ] **Step 1 (test):** `PEOPLE` has 6 entries; Leo backs `BRA,NED,JPN` with `JPN` out; `KICKOFF` equals `new Date("2026-06-11T20:00:00").getTime()`.
- [ ] **Step 2:** Fail → port the four constants verbatim (typed) → pass. Commit: `feat: port people/ticker/next-up/kickoff`.

### Task 1.3: Groups, standings, group results
**Files:** Create: `client/src/data/tournament.ts`, Test: `client/src/data/tournament.test.ts`.
- [ ] **Step 1 (test):** porting `GROUPS` (8×4), `gscore`, round-robin `GROUP_RESULTS`, and `STANDINGS`:
```ts
import { GROUPS, table, STANDINGS } from './tournament';
test('8 groups of 4', () => {
  const g = Object.keys(GROUPS); expect(g).toHaveLength(8);
  Object.values(GROUPS).forEach(t => expect(t).toHaveLength(4));
});
test('standings: played = 3 per team', () => {
  Object.values(STANDINGS).forEach(s => expect(s.p).toBe(3));
});
test('table sorted by pts then GD then GF', () => {
  const t = table('A');
  for (let i=1;i<t.length;i++){ expect(t[i-1].pts).toBeGreaterThanOrEqual(t[i].pts); }
});
```
- [ ] **Step 2:** Fail → port `GROUPS`, `ELIMINATED`, `oddsNum`, `scoreStrength`, `gscore`, `RR`, `GROUP_RESULTS`, `STANDINGS`, `table`, `groupOf`, `backers`, `isAlive` from `data-tournament.js` (typed, pure; no `window`). → pass. Commit: `feat: port groups + generated standings`.

### Task 1.4: Odds-seeded bracket + advancement from results (the improvement)
**Files:** Create: `client/src/lib/bracket.ts`, Test: `client/src/lib/bracket.test.ts`.
- [ ] **Step 1 (test) — seeding:** port `strength`, `seedOrder`, `mkTies`, `bracketFull`; assert R32 has 16 ties, R16 8, QF 4, SF 2, Final 1, and an eliminated team (`JPN`) loses its R32 tie.
```ts
import { buildBracket } from './bracket';
test('shape', () => {
  const b = buildBracket({ results:{}, teams: TEAMS });
  expect(b.r32).toHaveLength(16); expect(b.r16).toHaveLength(8);
  expect(b.qf).toHaveLength(4); expect(b.sf).toHaveLength(2);
});
test('eliminated team loses in R32', () => {
  const b = buildBracket({ results:{}, teams: TEAMS });
  const tie = b.r32.find(t => t.a==='JPN' || t.b==='JPN')!;
  expect(tie.w).not.toBe('JPN');
});
```
- [ ] **Step 2 (test) — advancement from saved results (NEW):** a saved R32 result that makes the seeded underdog win must carry that winner into R16 and beyond (prototype did NOT do this).
```ts
test('saved R32 upset advances the actual winner', () => {
  const b0 = buildBracket({ results:{}, teams: TEAMS });
  const tie = b0.r32[0]; const underdog = tie.w === tie.a ? tie.b : tie.a;
  const score: [number,number] = tie.w === tie.a ? [0,1] : [1,0];
  const b = buildBracket({ results: { 'R32:0': { score, played:true } }, teams: TEAMS });
  expect(b.r32[0].w).toBe(underdog);
  expect(b.r16[0].a === underdog || b.r16[0].b === underdog).toBe(true);
});
```
- [ ] **Step 3:** Fail → implement `buildBracket(state)`: seed R32 by `strength` (odds-weighted; eliminated sink), then for each round compute each tie's winner as: **if a saved `results["<stage>:<i>"]` is played → the higher-scoring side (penalty/winner tiebreak optional later); else the projected stronger seed.** Propagate winners round-by-round so later rounds follow *actual* results. Export `buildBracket`, `STAGES`, types. → pass.
- [ ] **Step 4:** Commit: `feat: bracket seeding + advancement recompute from saved results`.

### Task 1.5: Map data + routes + teamGames
**Files:** Create: `client/src/data/map.ts`, Test: `client/src/data/map.test.ts`.
- [ ] **Step 1 (test):** port `VENUES` (16), `HOME` (32), `GROUP_VENUES`, `ROUTES`, `lonLatXY`, `KO_VENUES`, `stageRoutes`, `koGame`, `teamGames`, land grid. Assert: `lonLatXY(-180,90)→{x:0,y:0}` and `(180,-90)→{x:1,y:1}`; `teamGames('BRA','Groups')` has 3 fixtures with cities; `stageRoutes('R32')` returns 16 matches.
- [ ] **Step 2:** Fail → port from `data-map.js`. `koGame`/`teamGames` take `results` as a param (not `window.WCHQStore`) so they're pure; bracket comes from `buildBracket`. → pass. Commit: `feat: port map venues/routes/schedule + teamGames`.

---

## Phase 2 — Store (Zustand) + sync interface (TDD)

### Task 2.1: Store types + defaults
**Files:** Create: `client/src/store/types.ts` (AppState: `settings, people, teamEdits, results, bracketNonce`; Settings incl. `providers` but **no key values client-side** — keys are server-only, client holds `{name,status,baseUrl,authHeader,docs,hint,builtin, keySet:boolean, keyHint:string}`), `client/src/store/defaults.ts`.
- [ ] **Step 1:** Define types mirroring `store.js` DEFAULTS, with provider shape adjusted: replace `key:string` with `keySet:boolean`+`keyHint:string` (the key never reaches the browser). Commit: `feat: store types + defaults`.

### Task 2.2: Store actions (TDD)
**Files:** Create: `client/src/store/store.ts` (Zustand), Test: `client/src/store/store.test.ts`.
- [ ] **Step 1 (test):** add/update/remove person; `toggleOut`; `editTeam` with `odds` bumps `bracketNonce`; `setResult`/`clearResult`; `reset` restores defaults.
```ts
test('editTeam odds bumps bracketNonce', () => {
  const s = createStore(); const n0 = s.getState().bracketNonce;
  s.getState().editTeam('BRA', { odds:'2/1' });
  expect(s.getState().bracketNonce).toBe(n0 + 1);
});
test('toggleOut adds then removes', () => {
  const s = createStore(); const id = s.getState().people[0].id; const code='BRA';
  s.getState().toggleOut(id, code);
  expect(s.getState().people[0].out).toContain(code);
  s.getState().toggleOut(id, code);
  expect(s.getState().people[0].out).not.toContain(code);
});
```
- [ ] **Step 2:** Fail → port every `Store` method from `store.js` into Zustand actions (people CRUD, toggleOut, editTeam→teamEdits + bracketNonce, results, provider CRUD that talks to the server, sync, reset). `teamEdits` apply to a derived team map via a selector (not by mutating the static import). → pass. Commit: `feat: port app store to zustand`.

### Task 2.3: Sync layer (client ↔ server)
**Files:** Create: `client/src/store/sync.ts`, Test: `client/src/store/sync.test.ts` (mock fetch).
- [ ] **Step 1 (test):** `hydrate()` GETs `/api/state`, applies `env.state` when `env.rev > localRev`; `push()` POSTs the board, no-ops for non-admin; offline → keeps localStorage cache.
- [ ] **Step 2:** Fail → implement: on boot `hydrate()` + poll every ~10s (skip if a form field is focused, like legacy); admin writes call `push()` with the bearer token; localStorage `wchq.store.v2` is an offline read cache only. → pass. Commit: `feat: client-server sync layer`.

---

## Phase 3 — Backend: shared board + auth + viewer gate (TDD)

> Port concepts from `legacy/server.js` + `legacy/fetcher.js`. Zero-dep Node. Tests use Node's
> built-in `node:test` + `http` against an ephemeral port.

### Task 3.1: State envelope store
**Files:** Create: `server/lib/state.js`, Test: `server/lib/state.test.js`.
- [ ] **Step 1 (test):** `read()` returns `{rev:0,state:null}` when no file; `write(state)` bumps `rev`, sets `updatedAt`, persists atomically (tmp+rename).
- [ ] **Step 2:** Fail → port the envelope/atomic-write from `legacy/server.js` → pass. Commit: `feat(server): shared state envelope store`.

### Task 3.2: Admin auth + server-side keys (TDD)
**Files:** Create: `server/lib/auth.js`, `server/lib/config.js`, Test: `server/lib/auth.test.js`.
- [ ] **Step 1 (test):** `login(password)` with correct `ADMIN_PASSWORD` → token that `validToken` accepts; wrong → none; tokens expire. `maskedProviders()` never returns raw `key`, returns `keySet`+`keyHint` (`•••• 1234`).
- [ ] **Step 2:** Fail → port admin-token map + `effectiveConfig`/`maskedConfig` ideas from legacy, generalised to the provider list (keys in `data/admin.json`). → pass. Commit: `feat(server): admin auth + server-side masked provider keys`.

### Task 3.3: Viewer gate
**Files:** Modify: `server/server.js`, Create: `server/public-login.html`, Test: `server/server.test.js`.
- [ ] **Step 1 (test):** with `VIEW_PASSWORD` set: GET `/` or `/api/state` without cookie → 401/login; POST correct password → `Set-Cookie` httpOnly token; subsequent request with cookie → 200. `/api/health` always open. With `VIEW_PASSWORD` unset → all open.
- [ ] **Step 2:** Fail → implement gate middleware + the standalone `public-login.html` served on 401 → pass. Commit: `feat(server): viewer password gate`.

### Task 3.4: /api/state + /api/admin routes
**Files:** Modify: `server/server.js`, Test: `server/server.test.js`.
- [ ] **Step 1 (test):** `GET /api/state` (viewer-authed) returns envelope; `POST /api/state` without admin token → 403; with token → rev bumps. `POST /api/admin/login`, `GET /api/admin/config` (masked), `POST /api/admin/config` (save settings + keys), `POST /api/admin/test` (proxy probe stub).
- [ ] **Step 2:** Fail → implement routes (port legacy router shape) → pass. Commit: `feat(server): shared board + admin api`.

### Task 3.5: Live-data proxy stub + team matching
**Files:** Create: `server/lib/fetcher.js`, Test: `server/lib/fetcher.test.js`.
- [ ] **Step 1 (test):** port `norm`/alias team matching from `legacy/fetcher.js`; `teamId('USA')` and `teamId('Korea Republic')` resolve. `probe(provider)` returns `{ok:false, reason}` cleanly when no key.
- [ ] **Step 2:** Fail → port matching + a `fetchLive(provider)` that calls the provider server-side (global fetch) and **normalises into the store's `results` shape**, with a clear `// TODO: map provider response → results[stage:index]` where per-provider mapping goes. Wire `/api/admin/test` + a `/api/admin/sync` to it. → pass. Commit: `feat(server): live-data proxy stub + team matching`.

---

## Phase 4 — Design system + shared components (build-and-verify)

Port these from `home/components.jsx`, `home/app-core.jsx`, `home/widgets.jsx`, `home/match-popup.jsx`, `home/panzoom.jsx` using the porting transform. One commit per component (or small group). No CDN.
- [ ] Flag, FlagChip (`components.jsx`)
- [ ] Avatar (`components.jsx`)
- [ ] Wobbles mascot SVG (`components.jsx`) — verbatim SVG
- [ ] Backdrop + Cloud (`components.jsx`) — dark + light variants
- [ ] Confetti (`components.jsx`)
- [ ] useCountdown + CountdownBoxes (`components.jsx`)
- [ ] PageTitle, TierBadge, OddsPill, Backers, TIER_COLOUR (`app-core.jsx`)
- [ ] Toast, PersonPopup, Podium (locate in `components.jsx`/`widgets.jsx`)
- [ ] TopNav, Ticker, NextUpCard (`widgets.jsx`)
- [ ] MatchPopup (`match-popup.jsx`)
- [ ] PanZoom (`panzoom.jsx`) — **add the README fix:** `onPointerDown` ignores events whose
  `target` is a `<button>` so the +/−/⟲ controls aren't swallowed; `touch-action` switches from
  `pan-y` (base) to `none` (zoomed) for the map usage.

Each: render in a scratch route, compare to the relevant screenshot detail, typecheck+build, commit.

---

## Phase 5 — App shell + routing (build-and-verify)
**Files:** `client/src/App.tsx`, `client/src/router.tsx` (port `home/app.jsx`).
- [ ] Port `useWide`, `useReminders`, `Mascot`, `GoalFlash`, the context provider (`WCHQContext` → a
  React context fed by store + UI state), the full-width **scroll container** + centred inner column,
  hash routing (`#Home`…`#Admin`), nav→scroll-reset + confetti on non-Home, welcome confetti,
  `goalCelebrate`/`burst`/`ping`. Replace `window` page registry with the router.
- [ ] Verify shell chrome (backdrop, mascot poke → bounce+confetti+bubble, GOAL flash) against
  `01-home.png` ambient. Build+typecheck, commit.

---

## Phase 6 — Pages: Home, Sweepstake, Teams, Groups (build-and-verify)
Port one at a time; verify against the screenshot before the next (per the prompt).
- [ ] **Home** (`page-home.jsx` + `variantB.jsx` Jumbotron) vs `01-home.png` — jumbotron LED
  countdown + tap→GOAL, LED ticker marquee, LIVE LEADERS expand/collapse, NEXT UP + reminders.
- [ ] **Sweepstake** (`page-sweepstake.jsx`) vs `02-sweepstake.png` — podium, ranked PersonCards,
  in/out split, struck-through chips, **"OUT OF THE SWEEPSTAKE" stamp** when all teams out.
- [ ] **Teams** (`page-teams.jsx`) vs `03-teams.png` + `10-team-popup.png` — tier filter, TeamCards
  (TierBadge/OddsPill/backers, corner **OUT ribbon**), TeamPopup (form boxes, results, FIFA link).
- [ ] **Groups** (`page-groups.jsx`) vs `04-groups.png` — 8 tables, leader 👑, eliminated styling,
  owner avatars, results strip → MatchPopup.

---

## Phase 7 — Knockout + Map (build-and-verify; the hard canvases)
- [ ] **Knockout** (`page-knockout.jsx`) vs `05-knockout.png` + `11-game-modal.png` — ChampionHero,
  two-sided bracket on PanZoom (connector lines, gold winners, faded eliminated), **Jump-to-team**
  dropdown (focusTo), **Fit**, TieCards with score/✓, GameModal (BST kickoff/venue or FULL-TIME),
  Graveyard. Bracket data comes from `buildBracket(state)` so saved results drive advancement.
- [ ] **Map** (`page-map.jsx` + `map-globe.jsx`) vs `06-map.png` + `07-map-team-selected.png` —
  d3 Natural Earth projection, self-hosted `countries-110m.json` (`client/public/geo/`), navy ocean,
  host tints, gold selected country, arcs + flying footballs + pulsing pins; stage tabs; "Whose
  teams?" row; **clean single-team view** + auto-scroll to games card; **wheel scrolls page, zoom =
  +/−/pinch/Ctrl-wheel** (`touch-action` rule); "[TEAM]'S GAMES" card.

---

## Phase 8 — Admin console + live sync UI (build-and-verify)
**Files:** `client/src/pages/admin/*` (port `page-admin.jsx`) vs `08-admin-login.png` + `09-admin.png`.
- [ ] PIN/login screen → calls `POST /api/admin/login`; wrong → wobble-shake.
- [ ] Players editor; Tournament settings (title/tagline/kickoff/admin password) → `POST /api/admin/config` / state.
- [ ] **ApiConnections**: provider list with **masked** key fields (key sent to server, never read
  back), base URL, auth header, 🔌 Test (`/api/admin/test`), ★ Use this, add/remove custom, auto-sync
  + 🔄 Sync now (`/api/admin/sync`), status banner.
- [ ] **KnockoutResults**: round tabs, enter scoreline → `setResult` → propagates everywhere (bracket
  advancement, map, groups, popups).
- [ ] **TeamDataEditor**: edit name/odds/tier/titles/fact/squad; **odds re-seeds bracket live**.
- [ ] Danger zone: Reset → restores demo defaults.

---

## Phase 9 — Deployment + docs + ship
- [ ] **Dockerfile** (multi-stage): stage 1 `node:20-alpine` builds `client` (`npm ci && npm run
  build`); stage 2 `node:20-alpine` copies `server/` + `client/dist`, runs `node server/server.js`;
  `EXPOSE 3050`; `HEALTHCHECK` → `/api/health`; `VOLUME /app/server/data`.
- [ ] **docker-compose.yml**: env `PORT, ADMIN_PASSWORD, VIEW_PASSWORD`, provider keys optional;
  bind-mount `server/data`; optional cloudflared (commented, from legacy).
- [ ] **manage.sh**: `restart|rebuild|update|backup|deploy(git pull+rebuild)|logs|status|check`.
- [ ] **.env.example**: `ADMIN_PASSWORD`, `VIEW_PASSWORD`, provider keys.
- [ ] **CLAUDE.md (rewrite)**: new architecture (client/server), lightest-change guidance (front-end
  edit → `npm run dev`; server edit → restart; dep/Docker change → rebuild), guardrails (keys
  server-side, don't touch `server/data/`), and how to deploy to Unraid + keep developing here.
- [ ] **README.md (root)**: quick start, Unraid routes, the dev-here/deploy-there git loop.
- [ ] Full `npm run build` + `node --check` + test suites green; `manage.sh check`. Commit; push;
  document `./manage.sh deploy` on Unraid.

---

## Self-review notes
- **Spec coverage:** every README screen/interaction maps to a Phase 4–8 task; state model →
  Phases 1–2; derived logic (standings/bracket/map) → Phase 1; the advancement-recompute improvement
  → Task 1.4; admin (players/settings/results/edit-team/API keys) → Phase 8; shared board + viewer
  password + server-side keys (new decisions) → Phase 3; deployment → Phase 9.
- **Sequencing:** the board is shared from Phase 3 onward (UI built against a synced store), honouring
  "server-shared from the start". Visual phases each verify against a screenshot before moving on.
- **Risk hotspots:** the d3 map (Phase 7) and the two-sided bracket layout (Phase 7) — budget extra
  verification; the live-provider mapping is intentionally a stub (TODO) per the prompt.
