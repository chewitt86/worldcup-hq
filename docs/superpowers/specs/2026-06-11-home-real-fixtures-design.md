# Home: real fixtures for Next Up + Latest Results

**Date:** 2026-06-11
**Status:** Approved — ready for implementation plan

## Problem

The Home page's **Next Up** section shows fictional, stale matchups (e.g. "MEX v CRO",
"ARG v SEN") that don't match the real 2026 final draw. The LED **SCORES ticker** has the
same problem. There is no **Latest Results** section.

### Root cause

Two unrelated data sources exist in the app:

- **Real schedule** — `fixtures` in the shared store (`AppState.fixtures`): real kick-off
  timestamps, venues, scores. Populated by the server's live feed. The **Schedule page**
  already reads this correctly.
- **Stale prototype data** — hardcoded `NEXTUP` and `TICKER` arrays in
  `client/src/data/teams.ts`. The **Home page** reads these and never looks at `fixtures`.

The server-side live pipeline is **already built** (the CLAUDE.md "fetcher is a stub" note
is out of date): `server/lib/fetcher.js` normalises group results, knockout ties, and the
full fixture schedule from API-Football; `server/server.js` runs a background poller (when
`dataSource: "live"` + a provider key + autoSync) plus a manual Admin → Sync, and merges
`fixtures` / `results` / `koLive` into the shared board. So no server change is needed for
this work.

The fix is therefore **client-side**: point Home at the real `fixtures`.

## Goals

- Next Up shows the genuine next couple of upcoming fixtures.
- A new Latest Results section shows the most recent finished fixtures.
- The LED ticker is driven by real fixtures (recent results + upcoming kick-offs).
- No fictional fixture data remains on Home.
- When no fixtures are loaded yet, Home shows an honest "connect the feed" nudge — never
  fake games.

## Non-goals

- No server changes. The live pipeline already produces `fixtures`/`results`/`koLive`.
- The server's knockout → bracket-slot `TODO` is unrelated (it only affects the projected
  bracket; the schedule already renders knockouts).
- Entering the API key / switching the data source to Live is a one-time operational step
  the user performs in Admin, not part of this change.

## Design

### 1. New module: `client/src/lib/fixtures.ts` (pure, unit-tested)

The single source of truth for fixture selection + BST formatting. Pure functions, no
`window`. Mirrors the style of `lib/bracket.ts` / `lib/scoring.ts`.

BST formatting helpers (moved out of `schedule.tsx`, which imports them back so there is
one copy):

- `dayLabel(ts: number): string` — e.g. `"Thu 11 Jun"`.
- `kickTime(ts: number): string` — e.g. `"20:00"`.
- `shortWhen(ts: number): string` — compact label for the ticker, e.g. `"Thu 8:00pm"`.

Selectors over `Fixture[]`:

- `nextUp(fixtures, now, n = 2): Fixture[]` — keep only **decided** fixtures (`a && b`,
  so no "TBD v TBD" knockout slots) that are **not played**, sort by `ts` ascending, take
  `n`. An in-progress game (ts in the past, not yet played) sorts first, which is correct.
- `latestResults(fixtures, n = 3): Fixture[]` — keep `played` fixtures, sort by `ts`
  descending, take `n`.
- `tickerItems(fixtures, now): TickerItem[]` — build the existing `TickerItem` union:
  recent `played` fixtures → `{ type: 'result', a, b, as, bs, tag: label }`; upcoming
  decided fixtures → `{ type: 'soon', a, b, when: shortWhen(ts), tag: label }`. Interleave
  a small number of each (e.g. up to ~4 results + ~4 upcoming) in a sensible order.
  Returns `[]` when there is nothing real to show.
- `fixtureToNextUp(f: Fixture): NextUpItem` — adapt a `Fixture` to the existing
  `NextUpItem` shape the card renders: `group` ← `f.label`, `date` ← `dayLabel(f.ts)`,
  `time` ← `kickTime(f.ts)`, `venue` ← `f.venue`. (The fixture `id` is carried separately
  for reminders — see below.)

### 2. New component: `client/src/components/result-card.tsx`

A compact sticker matching `NextUpCard`'s look, for a finished match:

- Round chip + date (`dayLabel`).
- `Flag` – **score** – `Flag`, with the winning side highlighted and the loser dimmed
  (same treatment as the Schedule row).
- Venue line; optional owner avatars (reuse the existing owner-icon pattern if cheap).
- No remind button (the match is over).

Kept deliberately small and presentational — takes a `Fixture` (+ `teams`, `people`).

### 3. `client/src/pages/home.tsx`

- Read `fixtures` from the store: `const fixtures = useStore((s) => s.fixtures)`.
- **Next Up:** replace `NEXTUP.slice(0, 2)` with `nextUp(fixtures, Date.now())`. Render each
  through `NextUpCard` using `fixtureToNextUp(f)` for display, but key reminders by the
  **fixture `id`**: `reminded={reminders.has(f.id)}` and `onReminder` toggles `f.id`
  (consistent with the Schedule page, so reminders are shared across pages). Mark the first
  item `featured` for the album-sticker flourish.
- **Latest Results:** new section with a "🏁 LATEST RESULTS" heading (styled like the
  existing `NEXT UP` heading), rendering `latestResults(fixtures)` as `ResultCard`s. Placed
  under Next Up on mobile; in the right-hand column on desktop.
- **LED ticker:** feed `tickerItems(fixtures, Date.now())` to `<Ticker led … />` instead of
  `TICKER`. Hide the whole LED bar when the list is empty.
- **Empty state:** when `fixtures.length === 0`, replace both Next Up and Latest Results
  with a single compact nudge card: "Schedule loads once the live feed is connected" +
  a "⚙️ Open Admin" pill that calls `app.go('Admin')` (mirrors the Schedule page's empty
  state, condensed). The heading(s) are hidden in this state.

### 4. Data cleanup: `client/src/data/teams.ts`

- Delete the `NEXTUP` and `TICKER` constant arrays.
- Keep the `NextUpItem` and `TickerItem` **types** (the card, ticker, and adapter use them).
- Update any imports/tests that referenced the deleted arrays.

### 5. Tests

- `client/src/lib/fixtures.test.ts` (TDD, written first): ordering of `nextUp` /
  `latestResults`, the played/upcoming split, decided-only filtering (undecided knockout
  slots excluded from Next Up), the `tickerItems` shape, and the empty-input case.
- Adjust `schedule.tsx` to import the shared BST helpers; existing schedule behaviour
  unchanged.

## Data flow

```
API-Football ──(server poller / Admin Sync)──► board.fixtures ──/api/state──► store.fixtures
                                                                                   │
                                          ┌────────────────────────────────────────┤
                                          ▼                                         ▼
                              nextUp() / latestResults() / tickerItems()   (Schedule page, unchanged)
                                          ▼
                              Home: Next Up · Latest Results · LED ticker
```

## Edge cases

- **No fixtures yet** (pre first sync): empty-state nudge; ticker hidden.
- **Undecided knockout slots** (`a` or `b` === ''): excluded from Next Up (always `played`
  fixtures are fully decided, so Latest Results is unaffected).
- **All fixtures played** (tournament over): Next Up empty → show a small "tournament
  complete" style fallback or simply hide the Next Up sub-section while Latest Results
  continues. (Resolve in the plan; lowest-priority path.)
- **`now`**: `Date.now()` at render; selectors re-run when the store updates. A periodic
  re-render is not required for correctness.

## Operational follow-up (user, one-time, not code)

To make real fixtures actually appear: Admin → set a real **API-Football** key on the
provider → **🔌 Test** → set **Data source: Live** + **Auto-sync on** → **Sync**. Secrets
stay server-side; the key is never entered by the assistant.
