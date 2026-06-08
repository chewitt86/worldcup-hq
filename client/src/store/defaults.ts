/* World Cup HQ — default board state.
   Mirrors the prototype's store.js DEFAULTS exactly, with the one architectural
   change that provider keys stay server-side: each provider carries
   keySet:false + keyHint:"" instead of a raw key string. */

import { KICKOFF, PEOPLE } from '../data/teams';
import type { AppState, Provider } from './types';

/* Built-in provider presets (from store.js DEFAULTS.settings.providers),
   with key:"" replaced by keySet:false + keyHint:"". */
const PROVIDERS: Record<string, Provider> = {
  'api-football': {
    name: 'API-Football',
    status: 'idle',
    baseUrl: 'https://v3.football.api-sports.io',
    authHeader: 'x-apisports-key',
    docs: 'https://www.api-football.com/documentation-v3',
    hint: 'api-sports.io key (or RapidAPI key).',
    builtin: true,
    keySet: false,
    keyHint: '',
  },
  'football-data': {
    name: 'football-data.org',
    status: 'idle',
    baseUrl: 'https://api.football-data.org/v4',
    authHeader: 'X-Auth-Token',
    docs: 'https://www.football-data.org/documentation/quickstart',
    hint: 'Free tier API token.',
    builtin: true,
    keySet: false,
    keyHint: '',
  },
  sportmonks: {
    name: 'SportMonks',
    status: 'idle',
    baseUrl: 'https://api.sportmonks.com/v3/football',
    authHeader: 'Authorization',
    docs: 'https://docs.sportmonks.com/football',
    hint: 'API token.',
    builtin: true,
    keySet: false,
    keyHint: '',
  },
  custom: {
    name: 'Custom provider',
    status: 'idle',
    baseUrl: '',
    authHeader: 'Authorization',
    docs: '',
    hint: 'Any REST endpoint that returns match data.',
    builtin: false,
    keySet: false,
    keyHint: '',
  },
};

export const DEFAULTS: AppState = {
  settings: {
    title: "LEO'S WORLD CUP",
    tagline: 'The family sweepstake HQ',
    kickoff: KICKOFF,
    // data source: 'demo' (built-in) or 'live' (a configured provider)
    dataSource: 'demo',
    activeProvider: 'api-football',
    autoSync: true,
    syncMins: 15,
    lastSync: null,
    pin: '1966',
    providers: PROVIDERS,
  },
  // clone the people arrays so defaults stay pristine if the board mutates
  people: PEOPLE.map((p) => ({ ...p, teams: [...p.teams], out: [...p.out] })),
  teamEdits: {}, // { CODE: { name?, odds?, tier?, titles?, fact?, squad? } }
  results: {}, // { "stage:index": { score:[a,b], played:true } }
  bracketNonce: 0, // bumps when odds change so the bracket re-seeds
};
