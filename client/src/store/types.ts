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
}

/* A saved match result overlay entry, keyed by "stage:index". */
export interface MatchResult {
  score: [number, number];
  played: boolean;
}

/* Map of "stage:index" → saved result. */
export type Results = Record<string, MatchResult>;

/* The whole shared board. */
export interface AppState {
  settings: Settings;
  people: Person[];
  teamEdits: TeamEdits;
  results: Results;
  /* bumps whenever odds change so the projected bracket re-seeds. */
  bracketNonce: number;
}
