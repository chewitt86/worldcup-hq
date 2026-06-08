/* ============================================================================
 * fetcher.js — server-side live-data proxy + team-name matching.
 *
 * Keeps provider API keys server-side and (eventually) normalises a provider's
 * fixtures into the store's results shape:  { "<stage>:<index>": { score:[a,b],
 * played:true } }  — stages being R32, R16, QF, SF, Final.
 *
 * The per-provider response mapping is intentionally a stub for now (see the
 * TODO in fetchLive). Team-name matching (norm + ALIAS + teamId) is ported
 * verbatim from legacy/fetcher.js so feed names line up with our teams.
 *
 * Never throws into the server loop: on any problem returns {ok:false,reason}.
 * ========================================================================== */

const TEAMS = [
 'Mexico', 'South Africa', 'South Korea', 'Czechia',
 'Canada', 'Bosnia & Herz.', 'Qatar', 'Switzerland',
 'Brazil', 'Morocco', 'Haiti', 'Scotland',
 'United States', 'Paraguay', 'Australia', 'Türkiye',
 'Germany', 'Curaçao', 'Ivory Coast', 'Ecuador',
 'Netherlands', 'Japan', 'Sweden', 'Tunisia',
 'Belgium', 'Egypt', 'Iran', 'New Zealand',
 'Spain', 'Cape Verde', 'Saudi Arabia', 'Uruguay',
 'France', 'Senegal', 'Iraq', 'Norway',
 'Argentina', 'Algeria', 'Austria', 'Jordan',
 'Portugal', 'DR Congo', 'Uzbekistan', 'Colombia',
 'England', 'Croatia', 'Ghana', 'Panama'
].map((name, id) => ({ id, name, group: 'ABCDEFGHIJKL'[Math.floor(id / 4)] }));

const GROUPS = 'ABCDEFGHIJKL'.split('');
const RR = [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]];
function groupTeamIds(g) { return TEAMS.filter(t => t.group === g).map(t => t.id); }
function allGroupMatches() {
  return GROUPS.flatMap(g => {
    const ids = groupTeamIds(g);
    return RR.map((p, i) => ({ id: g + '-' + i, home: ids[p[0]], away: ids[p[1]] }));
  });
}

/* normalise a feed name for matching: lower-case, strip accents, collapse
 * punctuation/whitespace, spell out ampersands. */
function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

const ALIAS = {
  'usa': 'United States', 'united states of america': 'United States', 'us': 'United States',
  'korea republic': 'South Korea', 'republic of korea': 'South Korea', 'korea': 'South Korea',
  'ir iran': 'Iran',
  'turkey': 'Türkiye', 'turkiye': 'Türkiye',
  'cote d ivoire': 'Ivory Coast', 'cote divoire': 'Ivory Coast', "cote d'ivoire": 'Ivory Coast',
  'czech republic': 'Czechia',
  'bosnia and herzegovina': 'Bosnia & Herz.', 'bosnia herzegovina': 'Bosnia & Herz.', 'bosnia': 'Bosnia & Herz.',
  'cabo verde': 'Cape Verde',
  'democratic republic of the congo': 'DR Congo', 'congo dr': 'DR Congo', 'dr congo': 'DR Congo',
  'ksa': 'Saudi Arabia'
};

const NAME2ID = {};
TEAMS.forEach(t => { NAME2ID[norm(t.name)] = t.id; });
Object.entries(ALIAS).forEach(([feed, our]) => { NAME2ID[norm(feed)] = NAME2ID[norm(our)]; });

/* resolve a feed team name to our internal team id, or null if unknown. */
function teamId(name) { const k = norm(name); return (k in NAME2ID) ? NAME2ID[k] : null; }

/* map a feed "round" string to one of our stages, or "other". */
function classifyRound(roundStr) {
  const r = (roundStr || '').toLowerCase();
  if (r.includes('group')) return 'group';
  if (r.includes('round of 32') || r.includes('1/16')) return 'R32';
  if (r.includes('round of 16') || r.includes('1/8')) return 'R16';
  if (r.includes('quarter')) return 'QF';
  if (r.includes('semi')) return 'SF';
  if (r.includes('3rd') || r.includes('third')) return 'third';
  if (r.includes('final')) return 'Final'; // after semi/quarter/third
  return 'other';
}

/* ---------------------------------------------------------------------------
 * Live-data proxy. Both helpers take a fully-resolved provider config
 * (server-side, so it may carry the secret `key`):
 *   { name, baseUrl, authHeader, path?, key }
 * They never throw — any problem comes back as { ok:false, reason }.
 * ------------------------------------------------------------------------- */

async function getProviderJson(provider) {
  const p = provider || {};
  if (!p.key) return { ok: false, reason: 'No API key set for this provider — add one in the admin panel.' };
  const baseUrl = String(p.baseUrl || '').replace(/\/+$/, '');
  if (!baseUrl) return { ok: false, reason: 'No base URL set for this provider.' };
  const headers = {};
  if (p.authHeader) headers[p.authHeader] = p.key;
  let res, txt;
  try {
    res = await fetch(baseUrl + (p.path || '/fixtures'), { headers });
    txt = await res.text();
  } catch (e) {
    return { ok: false, reason: 'Network error: ' + (e && e.message ? e.message : String(e)) };
  }
  let data;
  try { data = JSON.parse(txt); }
  catch { return { ok: false, reason: 'Non-JSON response from provider: ' + txt.slice(0, 120) }; }
  if (!res.ok) return { ok: false, reason: 'HTTP ' + res.status + ' from provider.' };
  return { ok: true, data };
}

/* fetchLive — pull the tournament from a provider and normalise it into the
 * store's results shape. Returns { ok:true, results } or { ok:false, reason }. */
async function fetchLive(provider) {
  const fetched = await getProviderJson(provider);
  if (!fetched.ok) return fetched;

  const results = {};
  // TODO: map provider response -> results[stage:index]
  //   For each finished fixture in `fetched.data`, resolve the two sides with
  //   teamId(), classify its round with classifyRound(), work out its index
  //   within that stage (group fixtures via allGroupMatches(); knockout ties via
  //   buildBracket ordering), and set:
  //     results[`${stage}:${index}`] = { score:[homeGoals, awayGoals], played:true }
  //   The exact per-provider field names differ, so this mapping is the
  //   provider-specific seam to fill in (see legacy/fetcher.js norm* helpers).

  return { ok: true, results };
}

/* probe — the admin "Test connection" button. Cleanly reports a missing key
 * without ever touching the network. */
async function probe(provider) {
  const fetched = await getProviderJson(provider);
  if (!fetched.ok) return { ok: false, reason: fetched.reason };
  const data = fetched.data;
  const count = Array.isArray(data) ? data.length
    : (Array.isArray(data && data.response) ? data.response.length : null);
  return { ok: true, reason: 'Connected.', sampleCount: count };
}

module.exports = {
  fetchLive, probe, teamId, norm, classifyRound, allGroupMatches,
  _norm: norm, TEAMS
};
