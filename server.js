/* ============================================================================
 * server.js — World Cup Sweepstake HQ (Unraid)
 *   Public:
 *     GET  /api/state            -> shared board (read-only for viewers)
 *     GET  /api/health
 *   Admin (needs token from /api/admin/login; password = ADMIN_PASSWORD env):
 *     POST /api/admin/login      {password} -> {token}
 *     GET  /api/admin/config     -> settings (key masked) + live status
 *     POST /api/admin/config     -> update settings, reconfigure poller
 *     POST /api/admin/test       -> live "does the API work?" probe
 *     POST /api/state            -> save board (admin only; or first-run seed)
 * Zero npm deps (Node 18+ built-ins + global fetch).
 * ========================================================================== */
const http = require("http");
const fs   = require("fs");
const path = require("path");
const crypto = require("crypto");
const { fetchAndMerge, probe } = require("./fetcher");

const PORT       = parseInt(process.env.PORT || "3050", 10);
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_FILE  = process.env.DATA_FILE || path.join(__dirname, "data", "state.json");
const ADMIN_FILE = path.join(path.dirname(DATA_FILE), "admin.json");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "changeme";
const MAX_BODY   = 16 * 1024 * 1024;

/* ---------- persistence ---------- */
function readJson(file, fallback){ try{ return JSON.parse(fs.readFileSync(file,"utf8")); }catch(e){ return fallback; } }
function writeJson(file, obj){ fs.mkdirSync(path.dirname(file),{recursive:true}); const t=file+".tmp"; fs.writeFileSync(t,JSON.stringify(obj)); fs.renameSync(t,file); }
let envelope = readJson(DATA_FILE, { rev:0, updatedAt:null, state:null });
let adminConfig = readJson(ADMIN_FILE, null);   // overrides env when present
function saveEnvelope(){ writeJson(DATA_FILE, envelope); }
function saveAdminConfig(){ writeJson(ADMIN_FILE, adminConfig||{}); }

/* ---------- effective config (env defaults <- admin.json overrides) ---------- */
function effectiveConfig(){
  const e = process.env;
  const def = {
    enabled:  String(e.AUTOFETCH_ENABLED||"false").toLowerCase()==="true",
    provider: e.AUTOFETCH_PROVIDER||"apifootball",
    intervalMin: parseInt(e.AUTOFETCH_INTERVAL_MIN||"20",10),
    apiKey:   e.APIFOOTBALL_KEY||"",
    league:   e.APIFOOTBALL_LEAGUE||"1",
    season:   e.APIFOOTBALL_SEASON||"2026",
    rapidapi: String(e.APIFOOTBALL_RAPIDAPI||"false").toLowerCase()==="true",
    url:      e.AUTOFETCH_URL||"",
    wc2026Base: e.WC2026_BASE||"", wc2026Token: e.WC2026_TOKEN||""
  };
  return Object.assign(def, adminConfig||{});
}
function feedEnv(c){
  return { AUTOFETCH_PROVIDER:c.provider, APIFOOTBALL_KEY:c.apiKey, APIFOOTBALL_LEAGUE:String(c.league),
    APIFOOTBALL_SEASON:String(c.season), APIFOOTBALL_RAPIDAPI:String(c.rapidapi),
    AUTOFETCH_URL:c.url, WC2026_BASE:c.wc2026Base, WC2026_TOKEN:c.wc2026Token };
}
function maskedConfig(){
  const c = effectiveConfig();
  return { enabled:c.enabled, provider:c.provider, intervalMin:c.intervalMin, league:c.league,
    season:c.season, rapidapi:c.rapidapi, url:c.url,
    apiKeySet: !!c.apiKey, apiKeyHint: c.apiKey ? ("•••• "+String(c.apiKey).slice(-4)) : "" };
}

/* ---------- admin tokens ---------- */
const tokens = new Map();
function newToken(){ const t=crypto.randomBytes(24).toString("hex"); tokens.set(t, Date.now()+7*864e5); return t; }
function validToken(t){ const e=tokens.get(t); if(!e) return false; if(Date.now()>e){ tokens.delete(t); return false; } return true; }
function isAdmin(req){
  const h = req.headers["authorization"]||"";
  const t = h.replace(/^Bearer\s+/i,"") || req.headers["x-admin-token"] || "";
  return t && validToken(t);
}

/* ---------- helpers ---------- */
const MIME = { ".html":"text/html; charset=utf-8",".js":"text/javascript",".css":"text/css",".json":"application/json",
  ".png":"image/png",".jpg":"image/jpeg",".svg":"image/svg+xml",".ico":"image/x-icon" };
function sendJson(res,code,obj){ res.writeHead(code,{ "Content-Type":"application/json","Cache-Control":"no-store" }); res.end(JSON.stringify(obj)); }
function serveStatic(req,res){
  let rel = decodeURIComponent(req.url.split("?")[0]); if (rel==="/") rel="/index.html";
  const fp = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!fp.startsWith(PUBLIC_DIR)){ res.writeHead(403); return res.end("no"); }
  fs.readFile(fp,(err,buf)=>{ if(err){res.writeHead(404);return res.end("Not found");}
    res.writeHead(200,{ "Content-Type": MIME[path.extname(fp)]||"application/octet-stream" }); res.end(buf); });
}
function readBody(req,res,cb){
  let body="",big=false;
  req.on("data",c=>{ body+=c; if(body.length>MAX_BODY){big=true;req.destroy();} });
  req.on("end",()=>{ if(big)return sendJson(res,413,{error:"too large"});
    let j={}; try{ j = body?JSON.parse(body):{}; }catch(e){ return sendJson(res,400,{error:"bad json"}); } cb(j); });
}

/* ---------- live status (for admin panel) ---------- */
const status = { lastSync:null, lastError:null, lastResult:null };

/* ---------- request router ---------- */
const server = http.createServer((req,res)=>{
  const url = req.url.split("?")[0];

  if (url==="/api/health") return sendJson(res,200,{ status:"healthy", rev:envelope.rev, mode: envelope.state&&envelope.state.mode });

  if (url==="/api/admin/login" && req.method==="POST")
    return readBody(req,res,j=>{ if(j.password===ADMIN_PASSWORD) sendJson(res,200,{token:newToken()}); else sendJson(res,401,{error:"wrong password"}); });

  if (url==="/api/admin/config" && req.method==="GET"){
    if(!isAdmin(req)) return sendJson(res,401,{error:"unauthorized"});
    return sendJson(res,200,{ config:maskedConfig(), status, mode: envelope.state&&envelope.state.mode });
  }
  if (url==="/api/admin/config" && req.method==="POST"){
    if(!isAdmin(req)) return sendJson(res,401,{error:"unauthorized"});
    return readBody(req,res,j=>{
      adminConfig = adminConfig || {};
      ["provider","league","season","url","wc2026Base","wc2026Token"].forEach(k=>{ if(typeof j[k]==="string") adminConfig[k]=j[k]; });
      if(typeof j.enabled==="boolean") adminConfig.enabled=j.enabled;
      if(typeof j.rapidapi==="boolean") adminConfig.rapidapi=j.rapidapi;
      if(j.intervalMin!=null && !isNaN(+j.intervalMin)) adminConfig.intervalMin=Math.max(1,+j.intervalMin);
      if(typeof j.apiKey==="string" && j.apiKey.length) adminConfig.apiKey=j.apiKey;   // blank = keep current
      if(j.clearKey===true) adminConfig.apiKey="";
      saveAdminConfig();
      // if automatic turned OFF, hand control back to manual editing
      if(!effectiveConfig().enabled && envelope.state){
        envelope.state.mode="manual"; envelope.state.koLive=null;
        envelope = { rev:(envelope.rev||0)+1, updatedAt:new Date().toISOString(), state:envelope.state }; saveEnvelope();
      }
      restartPoller();
      return sendJson(res,200,{ config:maskedConfig(), status });
    });
  }
  if (url==="/api/admin/test" && req.method==="POST"){
    if(!isAdmin(req)) return sendJson(res,401,{error:"unauthorized"});
    return readBody(req,res,async j=>{
      const c = Object.assign({}, effectiveConfig());
      ["provider","league","season","url","wc2026Base","wc2026Token"].forEach(k=>{ if(typeof j[k]==="string") c[k]=j[k]; });
      if(typeof j.rapidapi==="boolean") c.rapidapi=j.rapidapi;
      if(typeof j.apiKey==="string" && j.apiKey.length) c.apiKey=j.apiKey;
      const out = await probe(feedEnv(c));
      return sendJson(res,200,out);
    });
  }

  if (url==="/api/state" && req.method==="GET") return sendJson(res,200,envelope);
  if (url==="/api/state" && req.method==="POST"){
    const firstRun = !envelope.state;                 // allow the very first seed; then admin-only
    if(!firstRun && !isAdmin(req)) return sendJson(res,403,{error:"admin only"});
    return readBody(req,res,j=>{
      const newState = j.state!==undefined ? j.state : j;
      envelope = { rev:(envelope.rev||0)+1, updatedAt:new Date().toISOString(), state:newState };
      saveEnvelope(); sendJson(res,200,{ rev:envelope.rev, updatedAt:envelope.updatedAt });
    });
  }

  return serveStatic(req,res);
});

server.listen(PORT, ()=>{
  console.log(`⚽ Sweepstake HQ on http://0.0.0.0:${PORT}  (data: ${DATA_FILE})`);
  if (ADMIN_PASSWORD==="changeme") console.log("⚠  ADMIN_PASSWORD is the default 'changeme' — set it in docker-compose.yml!");
  restartPoller();
});

/* ---------- poller (reconfigurable at runtime) ---------- */
let pollTimer = null;
function restartPoller(){
  if (pollTimer){ clearInterval(pollTimer); pollTimer=null; }
  const c = effectiveConfig();
  if (!c.enabled){ console.log("[autofetch] OFF (manual mode)"); return; }
  const ms = Math.max(1, c.intervalMin)*60000;
  console.log(`[autofetch] ON provider=${c.provider} every ${c.intervalMin} min`);
  pollOnce().catch(e=>console.log("[autofetch]",e.message));
  pollTimer = setInterval(()=>pollOnce().catch(e=>console.log("[autofetch]",e.message)), ms);
}
async function pollOnce(){
  if (!envelope.state){ console.log("[autofetch] no board yet"); return; }
  const c = effectiveConfig();
  const st = envelope.state;
  const results = st.results || (st.results={});
  const out = await fetchAndMerge(feedEnv(c), results);
  if (!out.ok){ status.lastError=out.reason; console.log("[autofetch] feed error:", out.reason); return; }
  status.lastError=null; status.lastResult=out.applied.length;
  let changed = out.applied.length>0;
  if (out.koLive && JSON.stringify(st.koLive||null)!==JSON.stringify(out.koLive)){ st.koLive=out.koLive; changed=true; }
  if (st.mode!=="auto"){ st.mode="auto"; changed=true; }
  status.lastSync = new Date().toISOString();
  if (changed){
    st.lastSync = status.lastSync;
    envelope = { rev:(envelope.rev||0)+1, updatedAt:status.lastSync, state:st }; saveEnvelope();
    console.log(`[autofetch] synced rev ${envelope.rev} — groups+${out.applied.length}, knockout:${out.koLive?"yes":"no"}`);
  } else console.log("[autofetch] no changes");
}
