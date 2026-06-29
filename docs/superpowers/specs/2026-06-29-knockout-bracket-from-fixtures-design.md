# Knockout bracket from real fixtures — design

**Date:** 2026-06-29
**Status:** Approved (design); implementation pending
**Area:** `client/` — knockout bracket engine + schedule display

## Problem

The Knockout page bracket is blank — every slot shows "TBD" and never fills in,
even when real schedule data is available.

### Root cause

`buildBracket` (`client/src/lib/bracket.ts`) only consumes two inputs:

- `results` — manual `stage:index` score entries from the Admin console, and
- `koLive` — a round-bucketed live-knockout structure.

Its first gate is:

```ts
if (!groupStageComplete(results) && !hasRealKoLive(koLive)) return tbdBracket();
```

The real, feed-supplied schedule now lives in the board's **`fixtures`** array
(a flat `Fixture[]` carrying group *and* knockout rows with real kick-off
timestamps, scores and venues) — the same source the Home page was rewired to
use. `buildBracket` ignores `fixtures` entirely, so with `results` empty and
`koLive` null the bracket always falls through to `tbdBracket()`.

The board is currently a clean slate (`fixtures: 0`, `koLive: null`,
`results: 0`), so the bracket will only ever fill once the live feed populates
`fixtures`. This change ensures it fills **correctly** at that point.

## Goal

Make the real `fixtures` list the single source of truth for the knockout
bracket: real matchups, real scores + advancement, and each tie's real kick-off
date/time and venue — while keeping the existing odds projection for rounds not
yet drawn, so the "projected road to the final" still works.

## Non-goals

- Adding demo/seed knockout data (the bracket stays blank until `fixtures`
  arrives — a separate task).
- Changing the shared board shape (`settings`, `people`, `teamEdits`, `results`,
  `bracketNonce`, `koLive`, `fixtures`). `koLive` is retained as a fallback.
- The Map page's per-team knockout venue/date (stays on the synthetic `koGame`
  schedule). The Map's knockout *matchups* do update via the shared
  `buildBracket`.

## Design

### 1. `lib/bracket.ts` — the engine

- Extend the **client-only** `Tie` interface with optional real-fixture fields:
  `ts?: number | null` (kick-off ms) and `venue?: string` (city). `KoTie` and the
  shared board shape are untouched.
- Add `fixtures?: Fixture[]` to `BracketState`.
- Add a pure helper `fullKoRounds(fixtures)`: buckets knockout fixtures by stage
  (`R32`, `R16`, `QF`, `SF`, `Final`), orders each bucket by `ts` ascending, and
  returns only **fully-drawn** rounds — a round whose tie count matches
  `ROUND_COUNT[stage]` and where every tie has both teams known. Each entry is a
  raw tie carrying `a, b, as, bs, pen, played, ts, venue`. Partial / undrawn
  rounds are omitted (the projection fallback handles them). The `Third` stage is
  ignored (no third-place slot in the bracket).
- `buildBracket` changes:
  - Compute `koFx = fullKoRounds(fixtures)`.
  - Open the TBD gate when `koFx` supplies any drawn round (in addition to the
    existing `groupStageComplete` / `hasRealKoLive` conditions).
  - Resolution order per round becomes: **real fixtures round → `koLive` round →
    odds projection**.
  - Winner `w` for a fixtures-driven tie: the actual higher-scoring side (or the
    `pen` winner) when `played`; otherwise the odds-projected stronger seed (via
    the existing `strength`), so unplayed-but-drawn rounds still project forward
    to a champion.

### 2. `data/map.ts` — schedule display

- Add a pure `CITY_HOST` reverse map (city name → host country) derived from
  `VENUES`, so a real fixture venue like `"New York"` can show as
  `"New York, USA"`.
- Add a pure `koTieInfo(tie, stage, i, results)` returning the display schedule
  (label, venue, city, host, date, time, played, score). It prefers the tie's
  **real** `ts`/`venue` — formatting the date/time with the existing
  `dayLabel`/`kickTime` BST helpers from `lib/fixtures.ts` — and falls back to the
  current synthetic `koGame(stage, i, results)` when a tie carries no real fixture.
- Thread `fixtures` through `stageRoutes`/`teamGames` so the Map's knockout
  matchups stay consistent with the bracket.

### 3. Pages / components — wiring

- `pages/knockout.tsx`: read `fixtures` from the store and pass it into
  `buildBracket`. `TieCard` and `GameModal` use `koTieInfo` (instead of `koGame`)
  so the popup shows the real kick-off date/time and stadium. Score display
  already prefers the tie's own played result, so it carries through unchanged.
- `pages/home.tsx`: pass `fixtures` into its `buildBracket` call so the
  live-scored leaders board matches the bracket.
- `components/admin/knockout-results.tsx`: pass `fixtures` into its `buildBracket`
  call so the admin matchup list matches what the family sees. Precedence note:
  when the feed supplies a drawn round, its scores are authoritative over manual
  `stage:index` entries — identical to the precedence `koLive` already had. With
  no `fixtures` (demo / feed off) the panel behaves exactly as today.

### Data flow (after)

```
fixtures (board) ──┐
results (board) ───┼─▶ buildBracket ─▶ Bracket { r32..final, champ }
koLive (board) ────┘        │
                            └─ per round: fixtures → koLive → odds projection
knockout.tsx / home.tsx / admin ─ pass fixtures into buildBracket
knockout.tsx popup ─ koTieInfo(tie, …) ─ real ts/venue else synthetic koGame
```

## Testing (TDD)

- `lib/bracket.test.ts`:
  - fixtures-only (no results/koLive): a full drawn R32 fills `r32` with the
    fixtures' teams, scores and `played`.
  - partial R32 (fewer than 16, or a tie with an unknown team) → TBD bracket.
  - played R32 ties advance their **actual** winners into the projected R16.
  - a played `Final` fixture sets `champ` to the real winner.
  - empty `fixtures` → behaviour unchanged (regression guard).
- `data/map.test.ts` (or the nearest existing suite):
  - `koTieInfo` returns the real `ts`-derived date/time and `venue`/host when the
    tie carries them, and falls back to `koGame` otherwise.

## Risks / edge cases

- **Projection vs reality drift:** if `fixtures` draws R16 from actual R32 results
  that differ from the odds projection, we trust the fixtures' R16 matchups
  directly (fixtures is the source of truth). No inconsistency surfaces because
  each drawn round is taken whole from fixtures.
- **Unknown venue:** a fixture venue not present in `VENUES` shows the city alone
  (no host country) — acceptable.
- **Ordering:** ties are ordered by `ts` within a round, matching how the server
  fetcher orders `koLive`; the bracket connector geometry is index-based exactly
  as it is for `koLive` today, so no new assumption is introduced.

## Files touched

- `client/src/lib/bracket.ts` (+ `bracket.test.ts`)
- `client/src/data/map.ts` (+ `map.test.ts` if present/created)
- `client/src/pages/knockout.tsx`
- `client/src/pages/home.tsx`
- `client/src/components/admin/knockout-results.tsx`
