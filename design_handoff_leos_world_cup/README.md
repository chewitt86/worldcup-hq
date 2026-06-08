# Handoff: Leo's World Cup — Family Sweepstake Tracker

## Overview
**Leo's World Cup** is a bright, playful, kid-friendly web app for tracking the 2026 FIFA
World Cup and a family **sweepstake** (each family member is randomly assigned teams; points
accrue and teams get knocked out until a winner is crowned). It is mobile-first but works on
phone, tablet, and desktop. The visual language is "Saturday-morning cartoon meets football
sticker album": thick navy outlines, hard offset shadows, chunky rounded corners, big bold
shapes, and lots of bouncy motion. Primary audience: a 10-year-old.

It contains six sections (single-page app with hash routing):
**Home · Sweepstake · Teams · Groups · Knockout · Map**, plus a **PIN-gated Admin** console.

---

## About the Design Files
The files in this bundle are **design references created in HTML/CSS/vanilla-React-via-Babel** —
working prototypes that show the intended look, layout, motion, and behavior. They are **not
meant to be shipped as-is**. The task is to **recreate these designs in your target
codebase/environment** (e.g. a real React + Vite/Next app, Vue, SwiftUI, etc.) using its
established patterns, component library, and build tooling. If no environment exists yet, pick
the most appropriate modern framework (React + TypeScript + Vite is a natural fit here) and
implement the designs there.

The prototype loads React 18 + Babel from a CDN and splits the app into many `<script type="text/babel">`
files that attach components to `window`. In a real build you'd convert each file into proper
ES modules / components. The **logic and data model are sound and worth porting directly**; the
script-tag/`window` wiring is just prototype scaffolding.

---

## Fidelity
**High-fidelity (hifi).** Colors, typography, spacing, radii, shadows, motion, and interactions
are final and intentional. Recreate the UI pixel-for-pixel using the exact tokens listed below.
The only deliberately "placeholder" elements are:
- **Flags** — drawn as simple colored bands (sticker-album style), NOT real national flags, to
  avoid copyright. Keep this approach or swap for a licensed flag set.
- **Avatars** — colored circles with initials (no real photos).
- **Match data** — generated demo data (see "State Management"); real data is meant to arrive
  via an API later (see Admin → Match data & API keys).

No real player names, team crests, brand logos, or photos are used anywhere (intentional —
likeness/copyright). Keep it that way unless properly licensed.

---

## Tech & Architecture (prototype)
- **React 18** (UMD) + **Babel standalone** (in-browser JSX). Port to a compiled setup.
- **d3-geo v7** + **topojson-client v3** for the Map (real country borders from
  `world-atlas@2 countries-110m.json`, fetched at runtime from jsDelivr).
- **No bundler, no TypeScript** in the prototype. Recommended target: React + TS + Vite.
- **State**: a hand-rolled observable store in `home/store.js` (localStorage-backed, pub/sub).
  Port this to your state solution (Zustand/Redux/Context). See "State Management".
- **Global data**: `window.WCHQ` (static tournament data) and `window.WCHQStore` (mutable store).
- **Routing**: `location.hash` (`#Home`, `#Sweepstake`, …). Use your router.
- **Fonts**: Google Fonts **Luckiest Guy** (headings/numbers) and **Baloo 2** (body, weights 400–800).

### File map (what's in this bundle)
- `Leo's World Cup.html` — entry point; loads fonts, libs, and all the scripts below in order.
- `home/styles.css` — the entire shared style system + keyframes (READ THIS FIRST).
- `home/data.js` — base teams (16), sweepstake people, ticker, next-up fixtures, kickoff date.
- `home/data-tournament.js` — expands to **32 teams / 8 groups**, generates standings & results
  from odds+form, and builds the **seeded knockout bracket** (R32→Final).
- `home/data-map.js` — host venues (16 cities), team home coords, group/knockout routing, the
  BST kickoff schedule, and `teamGames()` (a team's fixtures for a stage).
- `home/store.js` — mutable app store (people, settings, team edits, results, API providers).
- `home/app-core.jsx` — React context, `useStoreState` hook, shared bits (PageTitle, TierBadge,
  OddsPill, Backers).
- `home/components.jsx` — primitives: Flag, Avatar, Wobbles (mascot), Backdrop, Confetti,
  Toast, PersonPopup, Podium, useCountdown.
- `home/widgets.jsx` — TopNav, Ticker, NextUpCard.
- `home/variantB.jsx` — the Jumbotron (LED stadium big-screen) used on Home.
- `home/panzoom.jsx` — reusable pan/zoom canvas (drag, wheel, pinch, fit) used by the bracket.
- `home/map-globe.jsx` — the geographic WorldMap (borders, arcs, pins, its own pan/zoom).
- `home/match-popup.jsx` — shared match detail modal (owners + score or kickoff/venue).
- `home/page-*.jsx` — the six pages + Admin (`page-home`, `-sweepstake`, `-teams`, `-groups`,
  `-knockout`, `-map`, `-admin`).
- `home/app.jsx` — app shell: router, layout/scroll container, mascot, confetti, GOAL flash.
- (Legacy/unused: `home-app.jsx`, `variantA.jsx`, `variantC.jsx`, `page-home.jsx` is used —
  ignore `home-app.jsx`/`variantA`/`variantC`; only files loaded by the HTML matter.)

---

## Design Tokens

### Colors (CSS custom properties in `:root`)
| Token | Hex | Use |
|---|---|---|
| `--ink` | `#1b2a4a` | All outlines (3–4px), text, hard shadows |
| `--ink-soft` | `#2c3f66` | Secondary borders/strokes |
| `--sky1` → `--sky2` | `#8ad6ff` → `#c9efff` | Sky gradient backdrop |
| `--grass` / `--grass2` | `#5fd35f` / `#46b94a` | Pitch strip, "still in" pills |
| `--cream` | `#fffdf3` | Card backgrounds |
| `--cream2` | `#fff6dd` | Inset/secondary card fills |
| `--sun` | `#ffd23f` | Primary accent: active nav, highlights, LED digits |
| `--tomato` | `#ff5d5d` | Danger / "knocked out" / VS / live dot |
| `--pink` | `#ff8fd0` | Accent |
| `--orange` | `#ff9f1c` | Accent / warnings |
| `--grape` | `#9b6cf0` | Accent (knockout/section headers) |
| `--mint` | `#2fe0c0` | Accent |
| `--blue` | `#36a9ff` | Accent / links / USA host color |
Dark surfaces (jumbotron, map ocean, bracket bg): `#0a1330`, `#0c1838`, `#13204a`. Navy gradients
`linear-gradient(180deg,#13204a,#1b2a4a)`.
Host colors on map: USA `#36a9ff`, Canada `#ff5d5d`, Mexico `#46b94a`.

### Typography
- **Headings / numbers / labels** (`.head`, `--head`): **"Luckiest Guy"**, weight 400,
  `letter-spacing: .5px`, `line-height: .95`. Used for titles, nav, scores, stats.
- **Body** (`--body`): **"Baloo 2"**, weights 400–800. Default body weight ~600–700.
- **Outlined comic title** (`.outline-title`): Luckiest Guy, fill `--cream`,
  `-webkit-text-stroke: 5px var(--ink)`, `paint-order: stroke fill`,
  `text-shadow: 0 6px 0 var(--ink), 5px 9px 0 rgba(27,42,74,.35)`. Page titles use a 4px stroke
  variant at `clamp(30px,8vw,52px)`.
- Minimum body sizes ~11–13px for meta text; headline scores 17–30px; hero countdown digits large.

### Radius & borders
- `--r-sm: 12px`, `--r-md: 18px`, `--r-lg: 26px`; pills use `999px`.
- Standard border width `--bw: 4px` (cards), 2.5–3px on smaller chips/pills.

### Shadows (hard offset "sticker" shadows — NO blur)
- `.sticker`: `box-shadow: 5px 6px 0 rgba(27,42,74,.92)` + `4px solid var(--ink)` + `r-lg`.
- `.sticker-sm`: `3px 4px 0 rgba(27,42,74,.9)`, radius `r-md`.
- `.navpill`: `2px 3px 0 rgba(27,42,74,.85)`; `.flagchip`: `1.5px 2px 0 rgba(27,42,74,.8)`.
- Buttons generally `2px 3px 0 rgba(27,42,74,.7)`.
- Glows (LED/trophy) DO use blur: e.g. `0 0 28px rgba(255,210,63,.8)`.

### Spacing & layout
- Page scroll container is **full viewport width** (so the wheel scrolls anywhere); content is an
  inner column, `max-width: 1120px`, centered, `margin: 0 auto`.
- Page padding: mobile `16px 16px 110px`; desktop `22px 34px 72px`. Vertical rhythm via flex
  `gap`: mobile 18px, desktop 22px.
- **Responsive breakpoint: 760px** (`useWide`). <760 = single-column mobile; ≥760 = multi-column
  "wide"/desktop (used for tablet & desktop).
- Tap targets ≥44px; large text; high contrast on cream cards.

### Motion (keyframes in `styles.css`, prefix `wchq-`)
- `bob` (float, 3.4s), `wobble` (±2.2°, 3.6s), `spin` (26s, the sun), `drift` (clouds),
  `pop` (modal/card entrance), `digitpop` (LED roll), `marquee` (ticker), `ledpulse`,
  `conffall` (confetti), `shine`, `eye` (mascot googly eyes), `tapbounce` (mascot poke),
  `goalflash` (GOAL! wipe), `bubblepop` (speech bubble).
- Respect `prefers-reduced-motion: reduce` (ambient loops disabled).
- IMPORTANT: modal entrance animations use `transform: scale()` from a hidden state — make the
  visible end-state the base style so print / reduced-motion / SSR show content, not a blank frame.

---

## Screens / Views

> Shared chrome on every page: animated **Backdrop** (spinning sun, drifting clouds, grass strip,
> sky gradient — on a dark variant for most inner pages), a top **nav** (logo "LEO'S WORLD CUP"
> + pill links + ⚙️ admin), the **Wobbles** mascot bottom-right (googly-eyed football; tap →
> bounce + confetti + rotating speech-bubble cheer), a **Toast** (transient messages), and a
> full-screen **confetti** + **GOAL!** flash layer.

### 1. Home (`page-home.jsx` + `variantB.jsx`)
- **Jumbotron** (LED stadium big-screen): dark panel, banner title (store-driven), and a live
  **countdown** to kickoff in chunky LED digit boxes (Days/Hours/Mins/Secs). Tapping the screen
  fires confetti + GOAL! flash and re-pops the digits.
- **LED ticker**: red "⚽ SCORES" tag + horizontally scrolling marquee of results/upcoming.
- **LIVE LEADERS** board: red header (tap to expand top-3 podium ↔ full ranked table). Each row:
  rank, avatar, name, ✅ in / ❌ out counts, points. Bottom CTA "SEE FULL SWEEPSTAKE →".
- **NEXT UP**: 2 NextUpCards (group badge, date/time, flag-VS-flag, venue, 🔔 Remind me toggle →
  ✅ Reminded, persisted).
- Layout: mobile single column; desktop two columns (leaders `.9fr` / next-up `1.1fr`).

### 2. Sweepstake (`page-sweepstake.jsx`)
- **PageTitle** "SWEEPSTAKE" + subtitle "N of M still standing".
- **Podium** (gold/silver/bronze) on a navy card.
- **PersonCard** per player (grid: 1 col mobile, 2 col desktop), ranked by points:
  - avatar + rank medallion, name (+ 🥇/🥈/🥉 for top 3), ⭐ best-shot team + odds, big points.
  - "✅ N STILL IN" (grass) / "❌ N KNOCKED OUT" (tomato) split bar.
  - team flag-chips (knocked-out ones struck through + greyed).
  - **When all a player's teams are out**: a rotated "OUT OF THE SWEEPSTAKE" stamp overlays the
    card (tomato, 5px border, semi-transparent cream bg) and the card fades.
- Footer CTA "🌍 BROWSE ALL THE TEAMS →".

### 3. Teams (`page-teams.jsx`)
- Title "TEAMS" + "32 nations · N already out".
- **Tier filter** pills: All / Favourite / Contender / Dark horse / Host / Outsider / Longshot.
- **Grid** of TeamCards (2 col mobile, 3 col desktop), sorted by odds:
  - flag, name, titles, **TierBadge** (color-coded), **OddsPill** (navy pill, sun text, "to win"),
    "Backed by" avatar stack. Knocked-out teams: faded + a diagonal corner "OUT" ribbon
    (navy, rotated 45°, sits in the top-right corner — see `TeamCard`).
- **TeamPopup** on tap: navy header (flag, name, titles, tier, odds, group), fun-fact callout,
  group form stat boxes (P/W/D/L/Pts), recent results, "who's backing them" chips, and a blue
  **"👥 VIEW SQUAD ON FIFA.COM →"** button linking to
  `fifa.com/.../canadamexicousa2026/teams/<country>/squad` (URL is per-team and editable in Admin).

### 4. Groups (`page-groups.jsx`)
- Title "GROUPS". **8 group tables** (A–H; 2 col desktop, 1 col mobile). Each table:
  - navy header (group letter chip + "● LIVE"), column heads (W D L GD PTS),
  - rows sorted by pts/GD/GF: 👑 for leader, faded + struck-through for eliminated, owner avatars
    next to each team, highlighted leader row.
  - results strip (navy footer): tap a score chip → **MatchPopup** (final score + owners).

### 5. Knockout (`page-knockout.jsx`)
- Title "KNOCKOUTS". **ChampionHero** card (glowing navy/gold, projected champion + "beats X in
  the final").
- **Two-sided bracket** on the **PanZoom** canvas (`panzoom.jsx`), fit-to-window by default:
  left side R32→16→QF→SF, **center FINAL card + 🏆 trophy**, right side mirrors back out to R32.
  Thin **connector lines** join rounds. Winners highlighted gold; eliminated teams faded.
  Each **TieCard** shows both teams, owner avatars, and (if a result is entered) the **score**
  with the actual winner highlighted; otherwise a ✓ on the projected winner.
  - Controls: **🔎 Jump to** team dropdown (⭐ marks owned teams) zooms/pans to that team; **⟲ Fit**.
  - Tap a tie → **GameModal**: both teams + owners, and either **kickoff date + time in BST +
    venue** (upcoming) or **FULL-TIME + score** (played); projected winner line; tap a team → detail.
- **Graveyard**: tombstone cards for eliminated teams.
- PanZoom: drag to pan, wheel/pinch to zoom, +/−/⟲ buttons; **buttons must not be swallowed by the
  canvas pointer-capture** (the canvas ignores pointerdowns that start on a `<button>`).

### 6. Map (`page-map.jsx` + `map-globe.jsx`)
- Title "WORLD MAP". **Stage tabs**: ⚽ Groups / 🎲 Last 32 / 🎲 Last 16 / 🥊 Quarters / 🔥 Semis /
  🏆 Final. **"Whose teams?"** row: 🌍 Default / ✨ Show all / one pill per sweepstake person.
  **Team chips** row (filtered to the selection).
- **Geographic map** (d3 Natural Earth projection, real country borders): navy ocean, host nations
  tinted (USA blue / Canada red / Mexico green), selected team's home country highlighted gold.
  **Arcs** curve from each shown team's home country to the **host-city venues** where they play;
  little **footballs fly along** the arcs; venue **pins** pulse. Home **flag pins** mark countries.
- **Clean single-team view**: when exactly one team is selected (tap a chip OR a flag pin on the
  map), ALL other teams' arcs and unconnected venue dots are hidden — only that team's arcs + dots
  show. Selecting a team also auto-scrolls the page to its games card.
- **"[TEAM]'S GAMES"** card (below the map, appears when one team is selected): a row per fixture
  with the **opponent** (flag + name), **venue city**, and a **score** (played) or **kickoff time**
  (upcoming), plus the opponent's owner avatar and a **ⓘ TEAM INFO** button (opens team detail).
  Each row opens the **MatchPopup**. For multi-team knockout stages, a "PROJECTED TIES" list shows.
- **Zoom/scroll rules** (important UX): plain mouse-wheel **scrolls the page** (does NOT zoom);
  zoom is **+/− buttons, pinch, or Ctrl/⌘ + wheel**. The map wrapper uses `touch-action: pan-y`
  at base zoom (so a single-finger swipe scrolls the page) and switches to `none` once zoomed in
  (so dragging pans the map). Pointer-capture for panning is only taken when zoomed in or on mouse.

### Admin (`page-admin.jsx`) — PIN gated (demo PIN `1966`)
- **Login**: Wobbles mascot + "🔒 GROWN-UPS ONLY" card, numeric PIN input, wobble-shake on wrong.
- **Sweepstake players**: add player; per-player editor (name, points, color swatch, assign teams,
  tap a picked team to mark knocked-out, choose ⭐ best shot, remove).
- **Tournament settings**: title (drives jumbotron), tagline, kickoff date/time (drives countdown),
  admin PIN.
- **Match data & API keys** (`ApiConnections`): Demo vs Live toggle; provider list — **API-Football**
  (active default), **football-data.org**, **SportMonks**, **Custom** — each with masked key field
  (👁 toggle), base URL, auth header, **🔌 Test**, **★ Use this** (active), docs link; add/remove
  custom providers; auto-sync interval + 🔄 Sync now; status banner. Keys stored locally only.
  NOTE: real fetching needs a small server/proxy (browser CORS blocks direct calls) — this UI is
  the config layer; wire the actual sync server-side.
- **Match results** (`KnockoutResults`): round tabs (R32→Final); enter a scoreline per tie → Save.
  Saved scores flip games to "played" everywhere (bracket/map/groups/popups show the score + winner).
- **Edit team data** (`TeamDataEditor`): pick any nation; amend name, odds, tier, titles, fun-fact,
  FIFA squad URL. Editing **odds re-seeds the projected bracket live**.
- **Danger zone**: Reset everything → restores all demo defaults (incl. team data & bracket).

---

## Interactions & Behavior
- **Routing**: hash-based; nav pills switch pages and reset scroll to top; non-Home transitions
  fire a confetti burst. Unbuilt destinations show a playful toast.
- **Mascot (Wobbles)**: tap anywhere on it → `tapbounce` + confetti + a rotating cheer in a
  speech bubble ("GOAAAL! ⚽", "C'mon Leo!", "Up the family!", …). Idle: gentle `bob`; googly eyes
  drift.
- **Jumbotron**: live 1s countdown tick; tap → GOAL! flash + confetti + digit re-pop.
- **Leaders board**: tap header to expand/collapse top-3 ↔ full table.
- **Reminders**: 🔔 Remind me ↔ ✅ Reminded, persisted to localStorage (`wchq.reminders`).
- **PanZoom** (bracket): drag-pan, wheel-zoom (anchored at cursor), two-finger pinch (anchored at
  midpoint), +/−/fit buttons; graceful when a pointer lifts mid-gesture (capture refs into locals
  before state updates to avoid null-deref races).
- **Map**: see "Zoom/scroll rules" and "Clean single-team view" above.
- **Popups/modals**: tap backdrop or × to close; entrance via `pop`/`bubblepop` (keep visible
  end-state as base style).
- **Admin edits** propagate live across all pages via the store subscription.

## State Management
Port `home/store.js` (currently a localStorage-backed observable). Shape:
- `settings`: `{ title, tagline, kickoff (ms), dataSource ('demo'|'live'), activeProvider,
  autoSync, syncMins, lastSync, pin, providers: { <id>: { name, key, status, baseUrl, authHeader,
  docs, hint, builtin } } }`
- `people[]`: `{ id, name, initials, colour, points, teams[], out[], best }`
- `teamEdits`: `{ <CODE>: { name?, odds?, tier?, titles?, fact?, squad? } }` (applied onto team data)
- `results`: `{ "<stage>:<index>": { score:[a,b], played:true } }` (stage ∈ R32/R16/QF/SF/F)
- `bracketNonce`: bumped when odds change to force a bracket re-seed.
Methods: setSettings, add/update/remove person, toggleOut, editTeam (re-seeds bracket on odds),
provider CRUD + testProvider, setResult/clearResult, sync, reset (restores pristine team data),
subscribe. Persistence key `wchq.store.v2`; load() deep-merges provider presets + migrates a legacy
single key. Static (non-edited) data lives in `window.WCHQ` (`data*.js`) — port as plain modules.

### Key derived logic to preserve
- **32 teams / 8 groups**: results & standings are generated from each team's odds + an "eliminated"
  set (`data-tournament.js`). The **bracket** is seeded by strength (odds-weighted; eliminated teams
  sink to the bottom and lose in R32) into a standard 32-seed order, then winners propagate.
  Entering real scores overrides per-tie winners; later rounds still follow the projected path until
  recomputed (a known limitation — a real build should recompute advancement from saved results).
- **Map routing/schedule** lives in `data-map.js` (`stageRoutes`, `koGame`, `teamGames`, venues,
  home coords, BST kickoff schedule).

## Assets
- **Fonts**: Google Fonts — *Luckiest Guy*, *Baloo 2* (400–800). Already linked in the HTML head.
- **Map data**: `world-atlas@2 countries-110m.json` (public domain Natural Earth) fetched from
  jsDelivr at runtime; d3-geo + topojson-client from jsDelivr. For production, self-host these.
- **No image/logo/photo assets** — flags are CSS color bands, avatars are initials, the mascot and
  all icons are drawn in SVG/emoji. Replace flags/avatars with licensed assets only if desired.
- **Emoji** are used as lightweight icons (⚽🏆🥇🔔📍✅❌🪦✨) consistent with the playful brand.

## Files
Everything needed is in this folder: `Leo's World Cup.html` (entry) and the `home/` directory
(styles, data, store, and all component/page scripts). Start with `home/styles.css` for the token
system, then `Leo's World Cup.html` for load order, then the data files, the store, and the pages.
```
