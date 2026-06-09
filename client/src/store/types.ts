/* World Cup HQ — app store types.
   Mirrors the shape of the prototype's store.js DEFAULTS (settings, people,
   teamEdits, results, bracketNonce), retyped for TypeScript.

   One deliberate change from the prototype (per the architecture spec): API
   provider keys never reach the browser. The client-side provider shape drops
   the raw `key` string and instead carries `keySet` (does the server hold a
   key?) and `keyHint` (a masked tail like "•••• 1234"). The real key lives
   server-side only. */

import type { Person, Team } from '../data/teams';

/* Editable team fields the Admin console can override (mirrors TEAM_FIELDS). */
export type TeamEdit = Partial<Pick<Team, 'name' | 'odds' | 'tier' | 'titles' | 'fact' | 'squad'>>;

/* Map of team code → its saved edits. */
export type TeamEdits = Record<string, TeamEdit>;

/* Connection state for a configured provider. */
export type ProviderStatus = 'idle' | 'testing' | 'ok' | 'saved' | 'nokey' | 'error';

/* A live-data provider preset. Note: no raw key — see file header. */
export interface Provider {
  name: string;
  status: ProviderStatus;
  baseUrl: string;
  authHeader: string;
  docs: string;
  hint: string;
  builtin: boolean;
  /* true when the server holds a key for this provider. */
  keySet: boolean;
  /* masked tail of the stored key (e.g. "•••• 1234"); empty when none. */
  keyHint: string;
  /* ISO timestamp of the last connection test, if any. */
  lastTest?: string;
}

/* Which data source the board reads from. */
export type DataSource = 'demo' | 'live';

export interface Settings {
  title: string;
  tagline: string;
  kickoff: number;
  dataSource: DataSource;
  activeProvider: string;
  autoSync: boolean;
  syncMins: number;
  lastSync: string | null;
  pin: string;
  providers: Record<string, Provider>;
  /* when true, poking the mascot always opens the hidden keepy-uppy game */
  alwaysGame?: boolean;
}

/* A saved match result overlay entry, keyed by "stage:index". */
export interface MatchResult {
  score: [number, number];
  played: boolean;
}

/* Map of "stage:index" → saved result. */
export type Results = Record<string, MatchResult>;

/* ---- live knockout (koLive) ----
   A knockout tie as reported by the live feed. `a`/`b` are our internal
   3-letter team CODES ('' when a slot's team isn't decided yet); `as`/`bs` are
   a's and b's goals (null until played); `pen` is the winner's CODE when the tie
   was decided on penalties, else null. */
export interface KoTie {
  a: string;
  b: string;
  as: number | null;
  bs: number | null;
  played: boolean;
  pen: string | null;
}

/* One ordered array per round (feed order, by date). A round's array is only
   authoritative when it holds the FULL count (R32:16, R16:8, QF:4, SF:2,
   Final:1); a partially-drawn round is treated as not-yet-available. */
export interface KoLive {
  R32: KoTie[];
  R16: KoTie[];
  QF: KoTie[];
  SF: KoTie[];
  Final: KoTie[];
}

/* ---- schedule fixtures ----
   A single match in the day-by-day schedule, as supplied by the feed. `a`/`b`
   are our internal 3-letter team CODES ('' when a knockout slot's team isn't
   decided yet); `as`/`bs` are their goals (null until played). `ts` is the
   kick-off time in UNIX MILLISECONDS — the client derives the calendar day and
   BST kick-off time from it at render time. */
export interface Fixture {
  id: string;
  ts: number;
  /* group letter "A".."L", else "R32"/"R16"/"QF"/"SF"/"Final"/"Third". */
  stage: string;
  /* human round name, e.g. "Group A" / "Round of 32" / "Final". */
  label: string;
  /* host city string (e.g. "New York"); '' if unknown. */
  venue: string;
  a: string;
  b: string;
  as: number | null;
  bs: number | null;
  played: boolean;
}

/* The whole shared board. */
export interface AppState {
  settings: Settings;
  people: Person[];
  teamEdits: TeamEdits;
  results: Results;
  /* bumps whenever odds change so the projected bracket re-seeds. */
  bracketNonce: number;
  /* live knockout results from the feed; null until a feed reports any. */
  koLive?: KoLive | null;
  /* day-by-day schedule from the feed; empty until a feed reports any. */
  fixtures: Fixture[];
}
