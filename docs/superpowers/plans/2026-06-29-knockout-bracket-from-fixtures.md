# Knockout bracket from real fixtures — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the board's real `fixtures` list a first-class input to the knockout bracket so the Knockout page fills with real matchups, scores, dates and venues instead of being stuck on TBD.

**Architecture:** Add a pure `fullKoRounds(fixtures)` helper that buckets fully-drawn knockout fixtures by stage; feed its output into `buildBracket` with resolution order **fixtures → koLive → odds projection**, opening the TBD gate whenever fixtures supply a drawn round. Surface each tie's real kick-off date/time and stadium in the Knockout popup via a new `koTieInfo` helper that prefers the tie's real `ts`/`venue` and falls back to the existing synthetic `koGame` schedule. Thread `fixtures` through every `buildBracket` call site (Knockout, Home, Admin, Map).

**Tech Stack:** React + TypeScript + Vite SPA (`client/`), Zustand store, Vitest. Pure, side-effect-free `lib/` + `data/` modules.

## Global Constraints

- British English everywhere; kebab-case filenames; functional components.
- Do **not** change the shared board shape (`settings`, `people`, `teamEdits`, `results`, `bracketNonce`, `koLive`, `fixtures`). The new `ts`/`venue` fields live only on the **client-only** `Tie` interface, never on `KoTie` or `Fixture`.
- `selectTeams` must stay memoised — never replace `useStore(selectTeams)` with a selector that returns a fresh object each call.
- `lib/bracket.ts` and `data/map.ts` stay **pure** (no `window`, no store access); they receive `results`/`teams`/`koLive`/`fixtures` as parameters.
- Keep `server/` untouched and dependency-free; do not touch `server/data/`.
- Lightest change wins: client-only edits use Vite HMR. After all tasks run `./manage.sh check` (server syntax + client typecheck + tests).
- Existing public exports and behaviour must not regress (empty `fixtures` ⇒ identical output to today).

---

### Task 1: `fullKoRounds` helper + extended `Tie`

Add the pure round-bucketing helper and the two optional real-fixture fields on `Tie`. No `buildBracket` behaviour changes yet — this task only adds the helper and proves it in isolation.

**Files:**
- Modify: `client/src/lib/bracket.ts`
- Test: `client/src/lib/bracket.test.ts`

**Interfaces:**
- Consumes: `Fixture` from `../store/types`; existing `STAGES`, `Stage`, `ROUND_COUNT`.
- Produces:
  - `Tie` gains optional `ts?: number | null` and `venue?: string`.
  - `export interface FxTie { a: string; b: string; as: number | null; bs: number | null; played: boolean; ts: number; venue: string }`
  - `export function fullKoRounds(fixtures?: Fixture[]): Partial<Record<Stage, FxTie[]>>` — buckets knockout fixtures by stage, orders each bucket by `ts` ascending, and includes a stage **only** when its row count equals `ROUND_COUNT[stage]` and every row has both teams known.

- [ ] **Step 1: Write the failing tests**

Add to the end of `client/src/lib/bracket.test.ts` (and extend the existing import on line 2 to include `fullKoRounds`, and the type import on line 5 to add `Fixture`):

```ts
// line 2 becomes:
import { buildBracket, qualifiers, fullKoRounds } from './bracket';
// line 5 becomes:
import type { KoLive, KoTie, Fixture } from '../store/types';
```

```ts
/* 16 fully-drawn R32 fixtures (2-0 home wins), ts ascending by index. */
function fxR32(): Fixture[] {
  const out: Fixture[] = [];
  for (let i = 0; i < 16; i++) {
    out.push({
      id: `fx-r32-${i}`,
      ts: 1_780_000_000_000 + i * 3_600_000,
      stage: 'R32',
      label: 'Round of 32',
      venue: 'New York',
      a: `H${i}`,
      b: `A${i}`,
      as: 2,
      bs: 0,
      played: true,
    });
  }
  return out;
}

test('fullKoRounds returns a fully-drawn round, ts-ordered, and omits absent rounds', () => {
  const rounds = fullKoRounds(fxR32());
  expect(rounds.R32).toHaveLength(16);
  expect(rounds.R32![0].a).toBe('H0');
  expect(rounds.R32![0].venue).toBe('New York');
  expect(rounds.R16).toBeUndefined();
});

test('fullKoRounds drops a round that is short of full count or missing a team', () => {
  expect(fullKoRounds(fxR32().slice(0, 15)).R32).toBeUndefined();
  const fx = fxR32();
  fx[2].a = '';
  expect(fullKoRounds(fx).R32).toBeUndefined();
});

test('fullKoRounds returns an empty object for no fixtures', () => {
  expect(fullKoRounds([])).toEqual({});
  expect(fullKoRounds()).toEqual({});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm --prefix client test -- bracket`
Expected: FAIL — `fullKoRounds is not a function` (and a type error referencing `Fixture`).

- [ ] **Step 3: Add the `Fixture` import and extend `Tie`**

In `client/src/lib/bracket.ts`, extend the existing types import (around line 22) and the `Tie` interface (around lines 28-37):

```ts
import type { KoLive, KoTie, Fixture } from '../store/types';
```

```ts
export interface Tie {
  a: string;
  b: string;
  w: string;
  /* present only when a koLive feed result drives this tie. */
  as?: number | null;
  bs?: number | null;
  pen?: string | null;
  played?: boolean;
  /* present only when a real fixture drives this tie (kick-off ms + host city). */
  ts?: number | null;
  venue?: string;
}
```

- [ ] **Step 4: Add `FxTie` and `fullKoRounds`**

In `client/src/lib/bracket.ts`, immediately after the `ROUND_COUNT` definition (around line 40), add:

```ts
/* A raw knockout tie pulled from the fixtures feed, carrying real schedule data.
   The winner is decided later (in buildBracket) once teams/standings are known. */
export interface FxTie {
  a: string;
  b: string;
  as: number | null;
  bs: number | null;
  played: boolean;
  ts: number;
  venue: string;
}

/* Bucket the feed's knockout fixtures by stage, order each bucket by kick-off,
   and return ONLY fully-drawn rounds: a round whose tie count matches
   ROUND_COUNT[stage] and where every tie has both teams known. Partial/undrawn
   rounds are omitted so the odds projection fills them. The 'Third' place
   fixture has no bracket slot and is ignored (it is not a member of STAGES). */
export function fullKoRounds(fixtures: Fixture[] = []): Partial<Record<Stage, FxTie[]>> {
  const out: Partial<Record<Stage, FxTie[]>> = {};
  for (const stage of STAGES) {
    const rows = fixtures
      .filter((f) => f.stage === stage)
      .slice()
      .sort((x, y) => x.ts - y.ts);
    if (rows.length !== ROUND_COUNT[stage]) continue;
    if (!rows.every((f) => f.a && f.b)) continue;
    out[stage] = rows.map((f) => ({
      a: f.a, b: f.b, as: f.as, bs: f.bs, played: f.played, ts: f.ts, venue: f.venue,
    }));
  }
  return out;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm --prefix client test -- bracket`
Expected: PASS (all existing bracket tests plus the three new ones).

- [ ] **Step 6: Commit**

```bash
git add client/src/lib/bracket.ts client/src/lib/bracket.test.ts
git commit -m "feat(bracket): add fullKoRounds helper and real-fixture Tie fields"
```

---

### Task 2: Drive `buildBracket` from fixtures

Wire `fullKoRounds` into `buildBracket`: open the TBD gate when fixtures supply a drawn round, and resolve each round **fixtures → koLive → projection**, carrying real scores/dates/venues and advancing actual winners.

**Files:**
- Modify: `client/src/lib/bracket.ts`
- Test: `client/src/lib/bracket.test.ts`

**Interfaces:**
- Consumes: `fullKoRounds`, `FxTie`, `strength`, `mapKoTie`, `tieWinner`, `nextPairs` (all in `bracket.ts`).
- Produces: `BracketState` gains `fixtures?: Fixture[]`. `buildBracket` output unchanged in shape; ties may now carry `ts`/`venue`.

- [ ] **Step 1: Write the failing tests**

Add to `client/src/lib/bracket.test.ts` (reusing the `fxR32()` and `fullGroups()` helpers already in the file):

```ts
test('a full drawn R32 from fixtures fills the bracket with no results or koLive', () => {
  const b = buildBracket({ results: {}, teams: TEAMS, fixtures: fxR32() });
  expect(b.r32).toHaveLength(16);
  expect(b.r32[0].a).toBe('H0');
  expect(b.r32[0].b).toBe('A0');
  expect(b.r32[0].as).toBe(2);
  expect(b.r32[0].bs).toBe(0);
  expect(b.r32[0].played).toBe(true);
  expect(b.r32[0].venue).toBe('New York');
  expect(b.r32[0].w).toBe('H0'); // 2-0 home win
});

test('a partial R32 from fixtures leaves the bracket TBD', () => {
  const b = buildBracket({ results: {}, teams: TEAMS, fixtures: fxR32().slice(0, 15) });
  expect(b.champ).toBe('');
  expect(b.r32.every((t) => t.a === '' && t.b === '')).toBe(true);
});

test('played R32 fixtures advance their actual winners into the projected R16', () => {
  const b = buildBracket({ results: {}, teams: TEAMS, fixtures: fxR32() });
  expect(b.r16).toHaveLength(8);
  expect(b.r16[0].a).toBe('H0');
  expect(b.r16[0].b).toBe('H1');
});

test('a played Final fixture sets champ to the real winner', () => {
  const fixtures: Fixture[] = [{
    id: 'fx-final', ts: 1_790_000_000_000, stage: 'Final', label: 'Final',
    venue: 'New York', a: 'ARG', b: 'FRA', as: 3, bs: 2, played: true,
  }];
  const b = buildBracket({ results: {}, teams: TEAMS, fixtures });
  expect(b.final.a).toBe('ARG');
  expect(b.final.b).toBe('FRA');
  expect(b.final.played).toBe(true);
  expect(b.champ).toBe('ARG');
});

test('empty fixtures leave existing behaviour unchanged', () => {
  const base = buildBracket({ results: fullGroups(), teams: TEAMS });
  const withEmpty = buildBracket({ results: fullGroups(), teams: TEAMS, fixtures: [] });
  expect(withEmpty.champ).toBe(base.champ);
  expect(withEmpty.r32.map((t) => [t.a, t.b])).toEqual(base.r32.map((t) => [t.a, t.b]));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm --prefix client test -- bracket`
Expected: FAIL — the fixtures-driven bracket still returns a TBD bracket (e.g. `b.r32[0].a` is `''`, not `'H0'`), because `buildBracket` ignores `fixtures`.

- [ ] **Step 3: Add `fixtures` to `BracketState` and a fixture→Tie mapper**

In `client/src/lib/bracket.ts`, extend `BracketState` (around lines 59-66):

```ts
export interface BracketState {
  results: Record<string, SavedResult>;
  teams: Record<string, Team>;
  /* live knockout ties from the feed; a round is only applied when it holds its
     full expected count (see ROUND_COUNT). Absent/partial rounds keep the
     projection. */
  koLive?: KoLive | null;
  /* day-by-day schedule from the feed; fully-drawn knockout rounds here are the
     PRIMARY source for the bracket (real matchups, scores, dates, venues). */
  fixtures?: Fixture[];
}
```

Add the mapper next to `mapKoTie` (after line 74):

```ts
/* Map a fixtures-derived FxTie onto a Tie. A played, decisive result picks the
   higher-scoring side; an unplayed (or score-level) tie falls back to the
   odds-projected stronger seed, so a drawn-but-unplayed round still projects
   forward to a champion. The real ts/venue ride along for the schedule popup.
   (Fixtures carry no penalty winner, so a played score-level tie also uses the
   seed tiebreak; the next round, when drawn, supplies who actually advanced.) */
function mapFxTie(
  t: FxTie,
  teams: Record<string, Team>,
  standings: Record<string, Standing>,
): Tie {
  const decisive = t.played && t.as != null && t.bs != null && t.as !== t.bs;
  const w = decisive
    ? ((t.as as number) > (t.bs as number) ? t.a : t.b)
    : strength(t.a, teams, standings) >= strength(t.b, teams, standings) ? t.a : t.b;
  return { a: t.a, b: t.b, w, as: t.as, bs: t.bs, played: t.played, ts: t.ts, venue: t.venue };
}
```

`Standing` is already imported at the top of the file (from `../data/tournament`).

- [ ] **Step 4: Open the gate and resolve rounds from fixtures first**

In `buildBracket` (around lines 211-258), change the destructure, the gate, and the round resolution. The full updated function body:

```ts
export function buildBracket(state: BracketState): Bracket {
  const { results, teams, koLive, fixtures } = state;
  const standings = computeStandings(results);
  const koFx = fullKoRounds(fixtures);
  const hasFx = Object.keys(koFx).length > 0;

  /* Until the group stage finishes (so the qualifiers are real) — or the feed
     delivers an actual knockout draw via koLive or fixtures — the knockout teams
     aren't known. Show a blank/TBD bracket rather than an odds-based prediction. */
  if (!groupStageComplete(results) && !hasRealKoLive(koLive) && !hasFx) {
    return tbdBracket();
  }

  // the 32 qualifiers, ordered strongest-first (seed1 = index 0)
  const seeds = qualifiers(standings).sort(
    (a, b) => strength(b, teams, standings) - strength(a, teams, standings),
  );
  const order = seedOrder(32);

  const r32pairs: [string, string][] = [];
  for (let i = 0; i < 32; i += 2) {
    r32pairs.push([seeds[order[i] - 1], seeds[order[i + 1] - 1]]);
  }

  /* A round's koLive array, but only when it reports its FULL expected count
     AND every tie has both teams decided. */
  const liveRound = (stage: Stage): KoTie[] | null => {
    const arr = koLive ? koLive[stage] : null;
    if (!arr || arr.length !== ROUND_COUNT[stage]) return null;
    return arr.every((t) => t.a && t.b) ? arr : null;
  };

  /* Resolve one round. Precedence: a fully-drawn fixtures round (real matchups,
     scores, dates, venues) REPLACES everything; else a full koLive round; else
     the odds projection built from the previous round's winners. */
  const resolveRound = (pairs: [string, string][], stage: Stage): Tie[] => {
    const fx = koFx[stage];
    if (fx) return fx.map((t) => mapFxTie(t, teams, standings));
    const live = liveRound(stage);
    if (live) return live.map(mapKoTie);
    return pairs.map(([a, b], i) => ({ a, b, w: tieWinner(a, b, stage, i, results, teams, standings) }));
  };

  const r32 = resolveRound(r32pairs, 'R32');
  const r16 = resolveRound(nextPairs(r32), 'R16');
  const qf = resolveRound(nextPairs(r16), 'QF');
  const sf = resolveRound(nextPairs(qf), 'SF');
  const final = resolveRound(nextPairs(sf), 'Final')[0];

  return { r32, r16, qf, sf, final, champ: final.w, seeds };
}
```

(The `liveRound` arrow is the existing one — keep a single copy; do not duplicate it. The only line-level changes vs. today are: the `fixtures` destructure, the `koFx`/`hasFx` lines, the `&& !hasFx` in the gate, and the new `fx` branch at the top of `resolveRound`.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm --prefix client test -- bracket`
Expected: PASS (all bracket tests, old and new).

- [ ] **Step 6: Commit**

```bash
git add client/src/lib/bracket.ts client/src/lib/bracket.test.ts
git commit -m "feat(bracket): resolve rounds from real fixtures before koLive and projection"
```

---

### Task 3: `koTieInfo` schedule helper + thread fixtures through map selectors

Add a `CITY_HOST` reverse map and a `koTieInfo` helper that returns the real date/time/venue for a fixtures-driven tie (falling back to the synthetic `koGame`), and accept `fixtures` in `stageRoutes`/`teamGames` so the Map's knockout matchups match the bracket.

**Files:**
- Modify: `client/src/data/map.ts`
- Test: `client/src/data/map.test.ts`

**Interfaces:**
- Consumes: `Tie`, `Fixture`; `dayLabel`, `kickTime` from `../lib/fixtures`; existing `VENUES`, `KO_DATES`, `koGame`, `KoStage`, `KoGameInfo`, `ResultsMap`.
- Produces:
  - `export const CITY_HOST: Record<string, string>` — city name → host code (`'USA'`/`'CAN'`/`'MEX'`).
  - `export function koTieInfo(tie: Tie, stage: KoStage, i: number, results?: ResultsMap): KoGameInfo`.
  - `stageRoutes(stage, results?, teams?, koLive?, fixtures?)` and `teamGames(code, stage, results?, koLive?, fixtures?)` gain a trailing optional `fixtures: Fixture[] = []`.

- [ ] **Step 1: Write the failing tests**

In `client/src/data/map.test.ts`, extend the import on line 2 and add a `Tie` type import, then add tests inside the `describe('map data', …)` block:

```ts
// line 2 becomes:
import { VENUES, HOME, lonLatXY, stageRoutes, teamGames, koGame, koTieInfo, CITY_HOST } from './map';
import type { Tie } from '../lib/bracket';
```

```ts
test('CITY_HOST maps host cities back to their host code', () => {
  expect(CITY_HOST['New York']).toBe('USA');
  expect(CITY_HOST['Toronto']).toBe('CAN');
  expect(CITY_HOST['Mexico City']).toBe('MEX');
});

test('koTieInfo prefers the tie’s real ts/venue when present', () => {
  const tie: Tie = {
    a: 'ARG', b: 'FRA', w: 'ARG', as: null, bs: null, played: false,
    ts: Date.UTC(2026, 6, 4, 19, 0), venue: 'New York',
  };
  const info = koTieInfo(tie, 'R16', 0);
  expect(info.city).toBe('New York');
  expect(info.host).toBe('USA');
  expect(info.played).toBe(false);
  expect(info.date).toMatch(/4 Jul/);
  expect(info.time).toBe('20:00'); // 19:00 UTC -> 20:00 BST
});

test('koTieInfo carries the real score for a played tie', () => {
  const tie: Tie = {
    a: 'ARG', b: 'FRA', w: 'ARG', as: 3, bs: 2, played: true,
    ts: Date.UTC(2026, 6, 19, 18, 0), venue: 'New York',
  };
  const info = koTieInfo(tie, 'F', 0);
  expect(info.played).toBe(true);
  expect(info.score).toEqual([3, 2]);
});

test('koTieInfo falls back to koGame when the tie has no real fixture', () => {
  const tie: Tie = { a: 'ARG', b: 'FRA', w: 'ARG' };
  expect(koTieInfo(tie, 'R32', 0)).toEqual(koGame('R32', 0));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm --prefix client test -- map`
Expected: FAIL — `koTieInfo is not a function` / `CITY_HOST` undefined.

- [ ] **Step 3: Add the `lib/fixtures` import and `CITY_HOST`**

In `client/src/data/map.ts`, add to the imports (near lines 10-13):

```ts
import { dayLabel, kickTime } from '../lib/fixtures';
```

After the `VENUES` definition (after line 94), add:

```ts
/* Reverse lookup: a real fixture's host-city string (e.g. "New York") back to
   its host code ("USA"/"CAN"/"MEX"), so koTieInfo can show "New York, USA". */
export const CITY_HOST: Record<string, string> = Object.fromEntries(
  Object.values(VENUES).map((v) => [v.city, v.host]),
);
```

- [ ] **Step 4: Add `koTieInfo`**

In `client/src/data/map.ts`, immediately after `koGame` (after line 303), add:

```ts
/* Schedule + venue for a knockout tie, preferring the tie's REAL fixture data
   (kick-off ts + host city) and formatting it with the BST helpers; falls back
   to the synthetic koGame schedule when the tie carries no real fixture. */
export function koTieInfo(
  tie: Tie,
  stage: KoStage,
  i: number,
  results: ResultsMap = {},
): KoGameInfo {
  if (tie.ts == null || !tie.venue) return koGame(stage, i, results);
  const played = tie.played === true && tie.as != null && tie.bs != null;
  return {
    label: (KO_DATES[stage] || KO_DATES.F).label,
    venue: tie.venue,
    city: tie.venue,
    host: CITY_HOST[tie.venue] ?? '',
    date: dayLabel(tie.ts),
    time: kickTime(tie.ts),
    played,
    score: played ? [tie.as as number, tie.bs as number] : null,
  };
}
```

- [ ] **Step 5: Thread `fixtures` through `stageRoutes` and `teamGames`**

In `stageRoutes` (lines 176-211), add the parameter and pass it to `buildBracket`:

```ts
export function stageRoutes(
  stage: MapStage,
  results: ResultsMap = {},
  teams: Record<string, Team> = TEAMS,
  koLive: KoLive | null = null,
  fixtures: Fixture[] = [],
): StageRoutesResult {
```

and change the `buildBracket` call (line 195) to:

```ts
  const b = buildBracket({ results, teams, koLive, fixtures });
```

In `teamGames` (lines 225-281), add the parameter and forward it to `stageRoutes`:

```ts
export function teamGames(
  code: string,
  stage: MapStage,
  results: ResultsMap = {},
  koLive: KoLive | null = null,
  fixtures: Fixture[] = [],
): TeamGame[] {
```

and change the `stageRoutes` call (line 257) to:

```ts
  const sr = stageRoutes(stage, results, TEAMS, koLive, fixtures);
```

Add the `Fixture` type to the existing `../store/types` import on line 13:

```ts
import type { KoLive, Fixture } from '../store/types';
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm --prefix client test -- map`
Expected: PASS (existing map tests plus the four new ones).

- [ ] **Step 7: Commit**

```bash
git add client/src/data/map.ts client/src/data/map.test.ts
git commit -m "feat(map): add koTieInfo with real fixture schedule and thread fixtures through selectors"
```

---

### Task 4: Wire fixtures into every `buildBracket` call site

Pass `fixtures` from the store into the Knockout, Home, Admin and Map views, and switch the Knockout popup/cards to `koTieInfo` so they show real dates and stadiums. No new unit tests — verified by typecheck, the full suite, and a manual look.

**Files:**
- Modify: `client/src/pages/knockout.tsx` (lines 14, 102, 210, 380-388, and the modal venue line ~273)
- Modify: `client/src/pages/home.tsx` (lines 112-126)
- Modify: `client/src/components/admin/knockout-results.tsx` (lines 55-57)
- Modify: `client/src/pages/map.tsx` (lines 62, 160)

**Interfaces:**
- Consumes: `buildBracket` (now accepts `fixtures`), `koTieInfo`, `stageRoutes`/`teamGames` (now accept `fixtures`), `useStore`.
- Produces: no new exports.

- [ ] **Step 1: Knockout page — read fixtures, pass to bracket, use `koTieInfo`**

In `client/src/pages/knockout.tsx`, change the `koGame` import (line 14) to `koTieInfo`:

```ts
import { koTieInfo, type KoStage, type ResultsMap } from '../data/map';
```

In `TieCard`, change line 102:

```ts
  const g = koTieInfo(tie, stage, gi, results);
```

In `GameModal`, change line 210:

```ts
  const info = koTieInfo(tie, stage, i, results);
```

In the `KnockoutPage` component, add the store read and pass `fixtures` into `buildBracket` (lines 380-388):

```ts
  const results = useStore((s) => s.results);
  const teams = useStore(selectTeams);
  const koLive = useStore((s) => s.koLive);
  const fixtures = useStore((s) => s.fixtures);
  // ...
  const b = useMemo(
    () => buildBracket({ results, teams, koLive, fixtures }),
    [results, teams, koLive, fixtures],
  );
```

In `GameModal`, make the venue line tolerate an unknown host (so a city outside `VENUES` shows the city alone, no dangling comma). Change line ~273 from:

```tsx
                <span style={{ fontWeight: 700, fontSize: 14 }}>{info.city}, {host}</span>
```

to:

```tsx
                <span style={{ fontWeight: 700, fontSize: 14 }}>{info.city}{host ? `, ${host}` : ''}</span>
```

- [ ] **Step 2: Home page — pass fixtures into the bracket**

In `client/src/pages/home.tsx`, move the `fixtures` store read above the bracket `useMemo` and remove the now-duplicate read. Lines 112-116 become:

```ts
  const teams = useStore(selectTeams);
  const results = useStore((s) => s.results);
  const koLive = useStore((s) => s.koLive);
  const fixtures = useStore((s) => s.fixtures);

  const bracket = useMemo(
    () => buildBracket({ results, teams, koLive, fixtures }),
    [results, teams, koLive, fixtures],
  );
```

Then delete the original `const fixtures = useStore((s) => s.fixtures);` that was on line 126 (it now lives above the `useMemo`). Leave lines 128-131 (`nextUp`/`latestResults`/`tickerItems`/`hasFixtures`) unchanged.

- [ ] **Step 3: Admin knockout panel — pass fixtures into the bracket**

In `client/src/components/admin/knockout-results.tsx`, add the store read and pass `fixtures` (lines 55-57):

```ts
  const teams = useStore(selectTeams);
  const results = useStore((s) => s.results);
  const fixtures = useStore((s) => s.fixtures);
  const b = useMemo(() => buildBracket({ results, teams, fixtures }), [results, teams, fixtures]);
```

- [ ] **Step 4: Map page — pass fixtures into the selectors**

In `client/src/pages/map.tsx`, add a `fixtures` store read alongside the other store reads, then forward it. Change line 62:

```ts
  const fixtures = useStore((s) => s.fixtures);
  const sr = useMemo(() => stageRoutes(stage, results, teams, koLive, fixtures), [stage, results, teams, koLive, fixtures]);
```

and line 160:

```tsx
            {teamGames(single, stage, results, koLive, fixtures).map((gm, i) => {
```

(If `map.tsx` does not already read `koLive`/`results`/`teams` via `useStore`, follow the existing pattern in that file for the new `fixtures` read — do not introduce a non-memoised `selectTeams`.)

- [ ] **Step 5: Typecheck and run the full client suite**

Run: `npm --prefix client run build`
Expected: typecheck/build PASS (no TS errors about argument counts or missing props).

Run: `npm --prefix client test`
Expected: PASS — all suites green.

- [ ] **Step 6: Manual smoke check (HMR)**

With `npm --prefix client run dev` running, open the Knockout page. With an empty board it still shows the TBD bracket and "To be decided" hero (regression intact). The real fill is exercised by the unit tests in Tasks 1-3; no manual data entry is required here.

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/knockout.tsx client/src/pages/home.tsx client/src/components/admin/knockout-results.tsx client/src/pages/map.tsx
git commit -m "feat(knockout): drive bracket and schedule popup from real fixtures across all views"
```

---

### Task 5: Full health check

**Files:** none (verification only).

- [ ] **Step 1: Run the project check**

Run: `./manage.sh check`
Expected: server syntax OK, client typecheck OK, all tests pass.

- [ ] **Step 2: Confirm no board-shape or purity regressions**

Confirm by inspection: no edits to `server/`, no changes to `client/src/store/types.ts` (the `Fixture`/`KoTie` shapes are untouched), and `lib/bracket.ts` / `data/map.ts` still take all data as parameters (no `window`/store access).

- [ ] **Step 3: Final commit if anything was adjusted**

```bash
git add -A
git commit -m "chore(knockout): tidy after fixtures-driven bracket wiring"
```

(Skip if the working tree is clean.)

---

## Self-Review

**Spec coverage:**
- "Extend `Tie` with `ts?`/`venue?`" → Task 1 Step 3.
- "Add `fixtures?` to `BracketState`" → Task 2 Step 3.
- "Add `fullKoRounds`" → Task 1 Step 4.
- "Open the TBD gate when fixtures supply a drawn round" → Task 2 Step 4 (`hasFx`).
- "Resolution order fixtures → koLive → projection" → Task 2 Step 4 (`resolveRound`).
- "Winner = actual higher scorer / pen when played, else stronger seed" → Task 2 Step 3 (`mapFxTie`); fixtures carry no `pen`, so a score-level played tie falls back to the seed projection (documented in `mapFxTie`).
- "`CITY_HOST` reverse map" → Task 3 Step 3.
- "`koTieInfo` preferring real ts/venue, else `koGame`" → Task 3 Step 4.
- "Thread fixtures through `stageRoutes`/`teamGames`" → Task 3 Step 5.
- "`knockout.tsx`: pass fixtures, popup/cards use `koTieInfo`" → Task 4 Step 1.
- "`home.tsx`: pass fixtures" → Task 4 Step 2.
- "`admin/knockout-results.tsx`: pass fixtures" → Task 4 Step 3.
- Map page call sites (`map.tsx`) → Task 4 Step 4. *Deviation from the spec's "Files touched" list, which named `data/map.ts` but not `pages/map.tsx`; the page must pass `fixtures` for the design's "Map knockout matchups stay consistent with the bracket" to actually hold. Flagged here for the reviewer.*
- Testing plan (fixtures-only fill, partial→TBD, played-advances, played-Final champ, empty-fixtures regression; `koTieInfo` real vs fallback) → Tasks 1-3 tests.

**Placeholder scan:** none — every code step shows complete code and exact commands.

**Type consistency:** `fullKoRounds` returns `Partial<Record<Stage, FxTie[]>>`, consumed by `koFx[stage]` in `buildBracket`. `mapFxTie(t, teams, standings)` signature matches its call. `koTieInfo(tie, stage, i, results?)` returns `KoGameInfo`, the same type `koGame` returns and that `TieCard`/`GameModal` already consume. `stageRoutes`/`teamGames` gain a trailing optional `fixtures: Fixture[] = []`, so existing internal calls with fewer args still compile.
