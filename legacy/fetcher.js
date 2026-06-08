/* ============================================================================
 * fetcher.js — pulls the WHOLE tournament from a feed and normalises it:
 *   - group results  -> mapped onto fixtures A-0 .. L-5
 *   - knockout games -> a koLive structure {r32,r16,qf,sf,final,third}
 *
 * Never throws into the server loop: on any problem returns {ok:false,reason}.
 *
 * Providers (env.AUTOFETCH_PROVIDER):
 *   apifootball (default) — API-Football v3. Needs APIFOOTBALL_KEY.
 *                            league=1, season=2026 by default.
 *   jsonurl              — GET AUTOFETCH_URL, array of games (optionally with
 *                            "round" + "pen_winner" for knockout).
 *   wc2026               — open-source worldcup26 API (group games only).
 * ========================================================================== */

const TEAMS = [
 "Mexico","South Africa","South Korea","Czechia",
 "Canada","Bosnia & Herz.","Qatar","Switzerland",
 "Brazil","Morocco","Haiti","Scotland",
 "United States","Paraguay","Australia","Türkiye",
 "Germany","Curaçao","Ivory Coast","Ecuador",
 "Netherlands","Japan","Sweden","Tunisia",
 "Belgium","Egypt","Iran","New Zealand",
 "Spain","Cape Verde","Saudi Arabia","Uruguay",
 "France","Senegal","Iraq","Norway",
 "Argentina","Algeria","Austria","Jordan",
 "Portugal","DR Congo","Uzbekistan","Colombia",
 "England","Croatia","Ghana","Panama"
].map((name,id)=>({id,name,group:"ABCDEFGHIJKL"[Math.floor(id/4)]}));

const GROUPS = "ABCDEFGHIJKL".split("");
const RR = [[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]];
function groupTeamIds(g){ return TEAMS.filter(t=>t.group===g).map(t=>t.id); }
function allGroupMatches(){
  return GROUPS.flatMap(g=>{ const ids=groupTeamIds(g);
    return RR.map((p,i)=>({id:g+"-"+i, home:ids[p[0]], away:ids[p[1]]})); });
}

function norm(s){ return String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")
  .replace(/&/g," and ").replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," "); }
const ALIAS = {
  "usa":"United States","united states of america":"United States","us":"United States",
  "korea republic":"South Korea","republic of korea":"South Korea","korea":"South Korea",
  "ir iran":"Iran",
  "turkey":"Türkiye","turkiye":"Türkiye",
  "cote d ivoire":"Ivory Coast","cote divoire":"Ivory Coast","cote d'ivoire":"Ivory Coast",
  "czech republic":"Czechia",
  "bosnia and herzegovina":"Bosnia & Herz.","bosnia herzegovina":"Bosnia & Herz.","bosnia":"Bosnia & Herz.",
  "cabo verde":"Cape Verde",
  "democratic republic of the congo":"DR Congo","congo dr":"DR Congo","dr congo":"DR Congo",
  "ksa":"Saudi Arabia"
};
const NAME2ID = {};
TEAMS.forEach(t=>{ NAME2ID[norm(t.name)] = t.id; });
Object.entries(ALIAS).forEach(([feed,our])=>{ NAME2ID[norm(feed)] = NAME2ID[norm(our)]; });
function teamId(name){ const k=norm(name); return (k in NAME2ID)?NAME2ID[k]:null; }

function classifyRound(roundStr){
  const r = (roundStr||"").toLowerCase();
  if (r.includes("group")) return "group";
  if (r.includes("round of 32") || r.includes("1/16")) return "r32";
  if (r.includes("round of 16") || r.includes("1/8"))  return "r16";
  if (r.includes("quarter"))                            return "qf";
  if (r.includes("semi"))                               return "sf";
  if (r.includes("3rd") || r.includes("third"))         return "third";
  if (r.includes("final"))                              return "final"; // after semi/quarter/third
  return "other";
}

async function getJson(url, headers){
  const r = await fetch(url, { headers: headers||{} });
  const txt = await r.text();
  let data; try{ data = JSON.parse(txt); }catch(e){ throw new Error("non-JSON from "+url+": "+txt.slice(0,120)); }
  if (!r.ok) throw new Error("HTTP "+r.status+" from "+url);
  return data;
}

/* providers -> flat list of { home, away, hs, as, finished, round, penWinner } */
async function rawApiFootball(env){
  const key = env.APIFOOTBALL_KEY;
  if (!key) throw new Error("APIFOOTBALL_KEY not set — paste your free API-Football key");
  const league = env.APIFOOTBALL_LEAGUE || "1";
  const season = env.APIFOOTBALL_SEASON || "2026";
  const rapid  = String(env.APIFOOTBALL_RAPIDAPI||"false").toLowerCase()==="true";
  const base   = rapid ? "https://api-football-v1.p.rapidapi.com/v3"
                       : (env.APIFOOTBALL_BASE || "https://v3.football.api-sports.io");
  const headers= rapid ? { "x-rapidapi-key":key, "x-rapidapi-host":"api-football-v1.p.rapidapi.com" }
                       : { "x-apisports-key":key };
  const url = base.replace(/\/+$/,"") + "/fixtures?league="+league+"&season="+season;
  const data = await getJson(url, headers);
  if (!Array.isArray(data.response)) {
    const e = data.errors && Object.keys(data.errors).length ? JSON.stringify(data.errors) : (data.message||"unknown");
    throw new Error("API-Football error: "+e);
  }
  return data.response;
}
function normApiFootball(fixtures){
  return fixtures.map(f=>{
    const short = f.fixture && f.fixture.status ? f.fixture.status.short : "";
    const finished = ["FT","AET","PEN"].includes(short);
    const home = f.teams && f.teams.home ? f.teams.home.name : null;
    const away = f.teams && f.teams.away ? f.teams.away.name : null;
    const hs = f.goals ? f.goals.home : null;
    const as = f.goals ? f.goals.away : null;
    let penWinner = null;
    const pen = f.score && f.score.penalty;
    if (pen && pen.home!=null && pen.away!=null && pen.home!==pen.away) penWinner = pen.home>pen.away?home:away;
    if (penWinner==null && finished && hs===as && f.teams){
      if (f.teams.home && f.teams.home.winner===true) penWinner=home;
      else if (f.teams.away && f.teams.away.winner===true) penWinner=away;
    }
    return { home, away, hs, as, finished,
             round: classifyRound(f.league && f.league.round), penWinner };
  });
}

async function rawJsonUrl(env){
  if (!env.AUTOFETCH_URL) throw new Error("AUTOFETCH_URL not set");
  const data = await getJson(env.AUTOFETCH_URL);
  return Array.isArray(data) ? data : (data.matches||data.games||data.results||[]);
}
function normJsonUrl(arr){
  return arr.map(g=>({
    home: g.home != null ? g.home : (g.home_team != null ? g.home_team : (g.homeTeam != null ? g.homeTeam : g.home_name)),
    away: g.away != null ? g.away : (g.away_team != null ? g.away_team : (g.awayTeam != null ? g.awayTeam : g.away_name)),
    hs:   g.hs   != null ? g.hs   : (g.home_score != null ? g.home_score : (g.homeScore != null ? g.homeScore : g.home_goals)),
    as:   g.as   != null ? g.as   : (g.away_score != null ? g.away_score : (g.awayScore != null ? g.awayScore : g.away_goals)),
    finished: g.finished != null ? g.finished : (String(g.status||"").toLowerCase().includes("fin")),
    round: classifyRound(g.round || "group"),
    penWinner: g.pen_winner != null ? g.pen_winner : (g.penWinner != null ? g.penWinner : null)
  }));
}

async function rawWc2026(env){
  const base = (env.WC2026_BASE||"").replace(/\/+$/,"");
  if (!base) throw new Error("WC2026_BASE not set");
  if (!env.WC2026_TOKEN) throw new Error("WC2026_TOKEN not set");
  const h = { Authorization:"Bearer "+env.WC2026_TOKEN };
  const [teams, games] = await Promise.all([ getJson(base+"/get/teams",h), getJson(base+"/get/games",h) ]);
  const tA = Array.isArray(teams)?teams:(teams.data||[]); const gA = Array.isArray(games)?games:(games.data||[]);
  const id2 = {}; tA.forEach(t=>id2[String(t.id)] = t.name_en||t.name);
  return gA.map(g=>({ home:id2[String(g.home_team_id)], away:id2[String(g.away_team_id)],
    hs:g.home_score, as:g.away_score, finished:!!g.finished,
    round: classifyRound(g.type==="group"?"group":(g.round||g.type)), penWinner:null }));
}

async function getNormalisedGames(env){
  const p = (env.AUTOFETCH_PROVIDER||"apifootball").toLowerCase();
  if (p==="apifootball") return normApiFootball(await rawApiFootball(env));
  if (p==="wc2026")      return await rawWc2026(env);
  return normJsonUrl(await rawJsonUrl(env));
}

function koLiveWinner(m){
  if (!m || !m.finished) return null;
  if (m.a==null || m.b==null || m.as==="" || m.bs==="" || m.as==null || m.bs==null) return null;
  const a=+m.as, b=+m.bs;
  if (a>b) return m.a; if (b>a) return m.b;
  return m.pen!=null ? m.pen : null;
}

/* fetch + merge: mutates `results`, returns {ok, applied:[ids], koLive|null} */
async function fetchAndMerge(env, results){
  let games;
  try{ games = await getNormalisedGames(env); }
  catch(e){ return { ok:false, reason:e.message }; }

  const fixtures = allGroupMatches();
  const applied = [];
  const ko = { r32:[], r16:[], qf:[], sf:[], final:[], third:[] };

  for (const g of games){
    if (g.home==null || g.away==null) continue;
    const a = teamId(g.home), b = teamId(g.away);
    if (a==null || b==null) continue;

    if (g.round==="group"){
      if (!g.finished || g.hs==null || g.as==null) continue;
      const m = fixtures.find(f => (f.home===a&&f.away===b) || (f.home===b&&f.away===a));
      if (!m) continue;
      const hs = (m.home===a)?Number(g.hs):Number(g.as);
      const as = (m.home===a)?Number(g.as):Number(g.hs);
      if (Number.isNaN(hs)||Number.isNaN(as)) continue;
      const cur = results[m.id];
      if (!cur || String(cur.hs)!==String(hs) || String(cur.as)!==String(as)){
        results[m.id] = { hs:String(hs), as:String(as), finished:true };
        applied.push(m.id);
      }
    } else if (ko[g.round]){
      ko[g.round].push({
        a, b,
        as: g.hs==null?"":String(g.hs),
        bs: g.as==null?"":String(g.as),
        pen: g.penWinner!=null ? teamId(g.penWinner) : null,
        finished: !!g.finished
      });
    }
  }

  const anyKO = ["r32","r16","qf","sf","final","third"].some(k=>ko[k].length);
  return { ok:true, applied, koLive: anyKO ? ko : null };
}

/* probe a feed for the admin "Test connection" button */
async function probe(env){
  try{
    const games = await getNormalisedGames(env);
    const names = [...new Set(games.flatMap(g=>[g.home,g.away]).filter(Boolean))];
    const unmatched = names.filter(n=>teamId(n)==null);
    const finished = games.filter(g=>g.finished).length;
    const sample = games.slice(0,6).map(g=>`${g.home||"?"} ${g.hs==null?"-":g.hs}-${g.as==null?"-":g.as} ${g.away||"?"} [${g.round}]`);
    return { ok:true, total:games.length, finished, teams:names.length, unmatched, sample };
  }catch(e){ return { ok:false, error:e.message }; }
}

module.exports = { fetchAndMerge, probe, teamId, allGroupMatches, koLiveWinner, classifyRound, _norm:norm };
