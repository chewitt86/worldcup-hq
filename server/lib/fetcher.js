/* ============================================================================
 * fetcher.js — server-side live-data proxy + team-name matching.
 *
 * Pulls the 2026 World Cup GROUP results from API-Football and normalises them
 * into the shared board's results shape:
 *   { "<GROUP>:<index>": { score:[scoreForA, scoreForB], played:true } }
 * where <index> is the round-robin order [[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]]
 * over the four teams of a group in DRAW order, and score is oriented to the
 * fixture's (aName, bName). Knockout slots ("R32:i", …) are not mapped yet.
 *
 * Provider API keys stay server-side. Never throws into the server loop: on any
 * problem returns { ok:false, reason }. Uses only built-in Node + global fetch.
 * ========================================================================== */
"use strict";

/* ---- the real 48 teams / 12 groups, in DRAW order per group ---------------
 * Internal names are kept compact (e.g. "Bosnia & Herz."); the feed's longer
 * forms ("Bosnia and Herzegovina") resolve through ALIAS below. */
const GROUPS = {
  A: ["Mexico", "South Africa", "South Korea", "Czechia"],
  B: ["Canada", "Bosnia & Herz.", "Qatar", "Switzerland"],
  C: ["Brazil", "Morocco", "Haiti", "Scotland"],
  D: ["United States", "Paraguay", "Australia", "Türkiye"],
  E: ["Germany", "Curaçao", "Ivory Coast", "Ecuador"],
  F: ["Netherlands", "Japan", "Sweden", "Tunisia"],
  G: ["Belgium", "Egypt", "Iran", "New Zealand"],
  H: ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"],
  I: ["France", "Senegal", "Iraq", "Norway"],
  J: ["Argentina", "Algeria", "Austria", "Jordan"],
  K: ["Portugal", "DR Congo", "Uzbekistan", "Colombia"],
  L: ["England", "Croatia", "Ghana", "Panama"],
};
const GROUP_LETTERS = Object.keys(GROUPS);

/* Flat team list with a stable id + group letter (used by team-name matching). */
const TEAMS = GROUP_LETTERS.flatMap((g) =>
  GROUPS[g].map((name) => ({ name, group: g })),
).map((t, id) => ({ id, name: t.name, group: t.group }));

/* round-robin pairing order (4 teams → 6 matches), matching the client. */
const RR = [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]];

/* Every group fixture as { key, group, ai, bi, aName, bName }; key = "<G>:<i>"
 * where i is the round-robin index, and (aName,bName) the draw-order sides. */
function allGroupFixtures() {
  return GROUP_LETTERS.flatMap((g) => {
    const teams = GROUPS[g];
    return RR.map((pair, i) => ({
      key: `${g}:${i}`,
      group: g,
      ai: pair[0],
      bi: pair[1],
      aName: teams[pair[0]],
      bName: teams[pair[1]],
    }));
  });
}

/* normalise a feed name for matching: lower-case, strip accents, collapse
 * punctuation/whitespace, spell out ampersands. */
function norm(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

/* Feed spellings → our internal team name (ported/extended from legacy). */
const ALIAS = {
  "usa": "United States", "united states of america": "United States", "us": "United States",
  "korea republic": "South Korea", "republic of korea": "South Korea", "korea": "South Korea",
  "ir iran": "Iran",
  "turkey": "Türkiye", "turkiye": "Türkiye",
  "cote d ivoire": "Ivory Coast", "cote divoire": "Ivory Coast", "cote d'ivoire": "Ivory Coast",
  "czech republic": "Czechia",
  "bosnia and herzegovina": "Bosnia & Herz.", "bosnia herzegovina": "Bosnia & Herz.", "bosnia": "Bosnia & Herz.",
  "cabo verde": "Cape Verde",
  "democratic republic of the congo": "DR Congo", "congo dr": "DR Congo", "dr congo": "DR Congo",
  "ksa": "Saudi Arabia",
};

const NAME2ID = {};
TEAMS.forEach((t) => { NAME2ID[norm(t.name)] = t.id; });
Object.entries(ALIAS).forEach(([feed, our]) => { NAME2ID[norm(feed)] = NAME2ID[norm(our)]; });

/* resolve a feed team name to our internal team id, or null if unknown. */
function teamId(name) { const k = norm(name); return (k in NAME2ID) ? NAME2ID[k] : null; }

/* map a feed "round" string to one of our stages, or "other". */
function classifyRound(roundStr) {
  const r = (roundStr || "").toLowerCase();
  if (r.includes("group")) return "group";
  if (r.includes("round of 32") || r.includes("1/16")) return "R32";
  if (r.includes("round of 16") || r.includes("1/8")) return "R16";
  if (r.includes("quarter")) return "QF";
  if (r.includes("semi")) return "SF";
  if (r.includes("3rd") || r.includes("third")) return "third";
  if (r.includes("final")) return "Final"; // after semi/quarter/third
  return "other";
}

/* ---------------------------------------------------------------------------
 * normaliseGroupResults — PURE: API-Football `response[]` → board results.
 *
 * For each FINISHED (FT/AET/PEN) group-stage fixture, match the two team names
 * to a group fixture and emit results["<G>:<i>"] = { score:[a,b], played:true }
 * oriented to that fixture's (aName,bName). Non-group fixtures are skipped.
 * Returns { results, applied:[keys], unmatched:[names] }.
 *
 * TODO: map knockout fixtures -> "R32:i" bracket slots (skipped for now).
 * ------------------------------------------------------------------------- */
function normaliseGroupResults(responseArray) {
  const fixtures = allGroupFixtures();

  /* index group fixtures by the unordered pair of internal team ids. */
  const pairToFixture = {};
  fixtures.forEach((fx) => {
    const aId = teamId(fx.aName);
    const bId = teamId(fx.bName);
    if (aId == null || bId == null) return;
    pairToFixture[[aId, bId].sort((x, y) => x - y).join("-")] = { fx, aId };
  });

  const results = {};
  const applied = [];
  const unmatched = new Set();

  (Array.isArray(responseArray) ? responseArray : []).forEach((f) => {
    const round = f && f.league ? f.league.round : "";
    if (classifyRound(round) !== "group") return; // skip knockout/other (see TODO)

    const short = f && f.fixture && f.fixture.status ? f.fixture.status.short : "";
    if (!["FT", "AET", "PEN"].includes(short)) return; // only finished games

    const homeName = f.teams && f.teams.home ? f.teams.home.name : null;
    const awayName = f.teams && f.teams.away ? f.teams.away.name : null;
    const hs = f.goals ? f.goals.home : null;
    const as = f.goals ? f.goals.away : null;
    if (homeName == null || awayName == null || hs == null || as == null) return;

    const homeId = teamId(homeName);
    const awayId = teamId(awayName);
    if (homeId == null) unmatched.add(homeName);
    if (awayId == null) unmatched.add(awayName);
    if (homeId == null || awayId == null) return;

    const entry = pairToFixture[[homeId, awayId].sort((x, y) => x - y).join("-")];
    if (!entry) return; // pair isn't a real group fixture (e.g. wrong group)

    const { fx, aId } = entry;
    const scoreForA = homeId === aId ? Number(hs) : Number(as);
    const scoreForB = homeId === aId ? Number(as) : Number(hs);
    if (Number.isNaN(scoreForA) || Number.isNaN(scoreForB)) return;

    results[fx.key] = { score: [scoreForA, scoreForB], played: true };
    applied.push(fx.key);
  });

  return { results, applied, unmatched: [...unmatched] };
}

/* ---------------------------------------------------------------------------
 * Live-data proxy. Takes a fully-resolved provider config (server-side, so it
 * may carry the secret `key`):
 *   { name, baseUrl, authHeader, path?, key, league?, season?, host? }
 * Never throws — any problem comes back as { ok:false, reason }.
 * ------------------------------------------------------------------------- */

/* GET ${baseUrl}/fixtures?league=&season= with the provider's auth header.
 * If the base URL is a RapidAPI host, also send the x-rapidapi-host header. */
async function apiFootballFetch(provider) {
  const p = provider || {};
  if (!p.key) return { ok: false, reason: "No API key set for this provider — add one in the admin panel." };
  const baseUrl = String(p.baseUrl || "").replace(/\/+$/, "");
  if (!baseUrl) return { ok: false, reason: "No base URL set for this provider." };

  const league = String(p.league != null ? p.league : "1");
  const season = String(p.season != null ? p.season : "2026");
  const path = p.path || "/fixtures";
  const url = `${baseUrl}${path}?league=${encodeURIComponent(league)}&season=${encodeURIComponent(season)}`;

  const headers = {};
  headers[p.authHeader || "x-apisports-key"] = p.key;
  if (/rapidapi/i.test(baseUrl)) {
    let host = p.host;
    if (!host) { try { host = new URL(baseUrl).host; } catch (e) { host = ""; } }
    if (host) headers["x-rapidapi-host"] = host;
  }

  let res, txt;
  try {
    res = await fetch(url, { headers });
    txt = await res.text();
  } catch (e) {
    return { ok: false, reason: "Network error: " + (e && e.message ? e.message : String(e)) };
  }

  let data;
  try { data = JSON.parse(txt); }
  catch { return { ok: false, reason: "Non-JSON response from provider: " + txt.slice(0, 120) }; }
  if (!res.ok) return { ok: false, reason: "HTTP " + res.status + " from provider." };
  if (!Array.isArray(data.response)) {
    const errs = data.errors && Object.keys(data.errors).length
      ? JSON.stringify(data.errors) : (data.message || "unknown");
    return { ok: false, reason: "API-Football error: " + errs };
  }
  return { ok: true, data };
}

/* fetchLive — pull the tournament from a provider and normalise group results
 * into the board shape. Returns { ok:true, results, applied, unmatched } or
 * { ok:false, reason }. */
async function fetchLive(provider) {
  const fetched = await apiFootballFetch(provider);
  if (!fetched.ok) return fetched;
  // TODO: map knockout fixtures -> "R32:i" bracket slots (skipped for now).
  const { results, applied, unmatched } = normaliseGroupResults(fetched.data.response);
  return { ok: true, results, applied, unmatched };
}

/* probe — the admin "Test connection" button. Runs a real fetch via fetchLive
 * and reports how many group results were recognised (plus any unmatched feed
 * names). A missing key is reported cleanly, never throwing. */
async function probe(provider) {
  const out = await fetchLive(provider);
  if (!out.ok) return { ok: false, reason: out.reason };
  return {
    ok: true,
    reason: "Connected.",
    sampleCount: out.applied.length,
    unmatched: out.unmatched,
  };
}

module.exports = {
  fetchLive, probe, teamId, norm, classifyRound,
  allGroupFixtures, normaliseGroupResults,
  GROUPS, TEAMS, _norm: norm,
};
