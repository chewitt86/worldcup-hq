# Go-live: real 48-team / 12-group data + live API-Football

**Goal:** Convert the prototype's 32-team/8-group demo model to the real 2026 World Cup
(48 teams / 12 groups), wire the live API-Football feed, and start from a clean slate ready
for the family draw. Live feed supplies schedule/venues/scores; we hardcode only the static
facts (teams, groups, odds, coordinates).

## Verified real data (sources: FIFA final-draw, Wikipedia, Covers/Kalshi 2026-06-05)

### The 12 groups (CONFIRMED — identical to legacy/fetcher.js, which was the real draw)
```
A Mexico · South Africa · South Korea · Czechia
B Canada · Bosnia & Herz. · Qatar · Switzerland
C Brazil · Morocco · Haiti · Scotland
D United States · Paraguay · Australia · Türkiye
E Germany · Curaçao · Ivory Coast · Ecuador
F Netherlands · Japan · Sweden · Tunisia
G Belgium · Egypt · Iran · New Zealand
H Spain · Cape Verde · Saudi Arabia · Uruguay
I France · Senegal · Iraq · Norway
J Argentina · Algeria · Austria · Jordan
K Portugal · DR Congo · Uzbekistan · Colombia
L England · Croatia · Ghana · Panama
```

### Outright odds (grounded top of market; tail = strength-based estimates to verify)
Spain 9/2 · France 5/1 · England 8/1 · Portugal 10/1 · Argentina 10/1 · Brazil 11/1 ·
Germany 16/1 · Netherlands 22/1 · Norway 40/1 · Belgium 45/1 · Colombia 50/1 ·
Mexico 55/1 · USA 55/1 · Japan 66/1 · Morocco 66/1 · Uruguay 80/1 · Switzerland 80/1.
Remaining ~31 nations: longshots 100/1–500/1 by relative strength (FIFA ranking) — illustrative,
editable in Admin.

### Tier mapping (from odds)
Favourite ≤6/1 · Contender 6–12/1 · Dark horse 12–25/1 · Outsider 25–66/1 · Longshot >66/1.
Host (USA, Canada, Mexico) keep the Host tier badge regardless.

## Rework plan

1. **Data layer → 48/12** (`client/src/data/teams.ts`, `tournament.ts`, `map.ts`)
   - Replace the 32 teams with the real 48 (names, sticker flag bands, tier, odds, titles, fun
     facts, FIFA squad slug). Reuse legacy names + aliases; design new flag bands.
   - `GROUPS` → the real 12 groups (A–L). Add the 16 missing capital `HOME` coords.
   - Host-city `VENUES` (16) already correct; keep.

2. **Real qualification logic** (`tournament.ts`, `lib/bracket.ts`)
   - Standings from REAL group results (see step 3), tie-breakers per FIFA.
   - Qualifiers = top-2 per group (24) + **8 best third-placed** → 32 into the R32.
   - Seed/pair the R32 from the official bracket mapping; advancement already recomputes from
     saved results.

3. **Model change — real group results** (`store`, `tournament.ts`, `map.ts`, Admin)
   - Group scores become REAL: extend the board `results` to hold group matches (or a parallel
     `groupResults`), standings computed from them (generated fallback only until played).
   - Admin gains **group-result entry** (currently knockout-only).

4. **Live API-Football** (`server/lib/fetcher.js`)
   - Implement the real fetch+normalise: GET fixtures (league=World Cup, season=2026), map each
     → group/knockout `results` with venue + score; reuse legacy 48-team name matching.
   - Poller writes to the shared board; Admin 🔌 Test / 🔄 Sync now already call it.

5. **Clean slate**
   - Empty `results`, no demo eliminations; real family added via Admin with their drawn teams.
   - A one-click "Prepare for kickoff" reset that seeds the real teams/odds with empty results.

## Verification
Real draw cross-checked against the running Groups page; odds/tiers editable in Admin; live
sync confirmed against API-Football once the key is added; full typecheck + tests + Docker build.
