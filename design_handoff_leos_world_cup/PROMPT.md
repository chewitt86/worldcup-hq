# The prompt to give Claude Code

Open a terminal in this folder (the one containing `README.md`, `Leo's World Cup.html`, the
`home/` folder, and `screenshots/`), start Claude Code, and paste the prompt below.

---

## Recommended prompt (copy everything between the lines)

---

I want you to build a production app from the design references in this folder. Treat every file
here as a **design reference / working prototype**, NOT as code to ship — your job is to faithfully
recreate it in a clean, real codebase.

**Read these first, in order:**
1. `README.md` — the full design spec: tokens (exact hex, fonts, radii, shadows, motion), every
   screen, all interactions, the state model, and the derived logic.
2. `screenshots/` — the pixel targets for each screen (mobile). `screenshots/README.md` indexes them.
3. `Leo's World Cup.html` then the `home/` files — the actual prototype (React-via-Babel + d3-geo).
   The data model and logic are sound; port them. The `<script type="text/babel">` / `window.*`
   wiring is just prototype scaffolding — replace it with proper modules.

**Build it as:** React + TypeScript + Vite, with Tailwind (map my CSS custom-property tokens to the
theme) or CSS Modules — your call, but keep the design tokens centralized and exact. Use a small
store (Zustand) mirroring the prototype's `home/store.js` shape, persisted to localStorage. Use
`react-router` (or hash routes) for the six sections + Admin. Use `d3-geo` + `topojson-client` for
the map (self-host `world-atlas` countries-110m). No CDN script tags in the final app.

**Requirements — match the prototype exactly:**
- Pixel-match the sticker-album look: navy `#1b2a4a` outlines, hard offset shadows (no blur),
  chunky radii, Luckiest Guy headings + Baloo 2 body. Match spacing, sizes, and copy.
- All six pages + the PIN-gated Admin, with every interaction in the README: Wobbles mascot
  (tap → bounce/confetti/cheer), live countdown, jumbotron GOAL! flash, expandable leaders,
  reminders, tier filter, team & game popups, the two-sided 32-team knockout bracket on a
  drag/pinch/zoom canvas with connector lines + jump-to-team, the geographic map (arcs, flying
  footballs, clean single-team view, team-games card), and the full Admin (players, settings,
  match results that flip games to played, edit-team-data, and the multi-provider API-keys panel).
- Preserve the data/logic: 32 teams / 8 groups, generated standings, odds-seeded bracket
  (eliminated teams lose in R32; editing odds re-seeds), BST kickoff schedule.
- Responsive: single-column under 760px; centered multi-column at/above it; the **page scroll
  container is full-width** (wheel scrolls anywhere); plain wheel does NOT zoom the map (zoom =
  +/− buttons, pinch, or Ctrl/⌘+wheel). Respect `prefers-reduced-motion`.
- Keep it copyright-safe: flags are CSS color bands, avatars are initials, no real logos/photos.
- For live match data: build the Admin keys/provider UI as in the prototype, and add a small
  server/proxy stub (browsers block direct calls to api-football etc.) with a clear TODO where the
  real fetch+normalize goes. The app runs on demo data until that's wired.

**Improve where the README flags a limitation:** make saved knockout results actually drive who
advances through every later round (the prototype only overrides the tapped tie's winner).

Start by scaffolding the project and porting the design tokens + shared components, then build the
pages one at a time, checking each against its screenshot before moving on. Ask me if anything in
the spec is ambiguous.

---

### Notes
- The demo Admin PIN is `1966` (change it in code).
- If you prefer a different stack (Next.js, Remix, Vue, native), keep the tokens/logic identical and
  adapt the rest — the README is framework-agnostic.
