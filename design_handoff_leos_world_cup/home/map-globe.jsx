/* World Cup HQ — geographic WorldMap (d3-geo + topojson): real country
   borders, projected home→venue arcs, flag/venue pins, pan + zoom. */

const MAP_W = 1000, MAP_H = 560;

/* country name lookup for highlighting */
const TEAM_COUNTRY = {
  BRA: "Brazil", FRA: "France", ARG: "Argentina", ENG: "United Kingdom",
  ESP: "Spain", GER: "Germany", POR: "Portugal", NED: "Netherlands",
  CRO: "Croatia", MAR: "Morocco", USA: "United States of America",
  MEX: "Mexico", CAN: "Canada", JPN: "Japan", SEN: "Senegal", GHA: "Ghana",
};
const HOST_FILL = {
  "United States of America": "#bfe0ff", "Canada": "#ffd2d2", "Mexico": "#c9edcc",
};
const HOST_DOT = { USA: "#36a9ff", CAN: "#ff5d5d", MEX: "#46b94a" };

/* cache the world topology across remounts */
let WORLD = null, WORLD_PROMISE = null;
function loadWorld() {
  if (WORLD) return Promise.resolve(WORLD);
  if (!WORLD_PROMISE) {
    WORLD_PROMISE = fetch("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json")
      .then((r) => r.json())
      .then((topo) => { WORLD = window.topojson.feature(topo, topo.objects.countries).features; return WORLD; });
  }
  return WORLD_PROMISE;
}

function arcPath(h, v) {
  const dx = v[0] - h[0], dy = v[1] - h[1], dist = Math.hypot(dx, dy) || 1;
  const mx = (h[0] + v[0]) / 2, my = (h[1] + v[1]) / 2;
  const lift = Math.min(dist * 0.3, 120);
  let nx = -dy / dist, ny = dx / dist;
  if (ny > 0) { nx = -nx; ny = -ny; }
  return `M${h[0]} ${h[1]} Q${(mx + nx * lift).toFixed(1)} ${(my + ny * lift).toFixed(1)} ${v[0]} ${v[1]}`;
}

function MiniFlagSvg({ code, w = 26, h = 17 }) {
  const t = window.WCHQ.TEAMS[code]; if (!t) return null;
  const bands = t.bands || ["#ccc"];
  const vert = t.dir === "v" || t.dir === "cross";
  const seg = (vert ? w : h) / bands.length;
  const cid = "mf" + code;
  return (
    <g transform={`translate(${-w / 2} ${-h / 2})`}>
      <clipPath id={cid}><rect x="0" y="0" width={w} height={h} rx="3" /></clipPath>
      <g clipPath={`url(#${cid})`}>
        {bands.map((col, i) => vert
          ? <rect key={i} x={i * seg} y="0" width={seg} height={h} fill={col} />
          : <rect key={i} x="0" y={i * seg} width={w} height={seg} fill={col} />)}
      </g>
      <rect x="0" y="0" width={w} height={h} rx="3" fill="none" stroke="#1b2a4a" strokeWidth="2.5" />
    </g>
  );
}

function WorldMap({ pool, routeOf, shownTeams, onTeam, onVenue, motion }) {
  const W = window.WCHQ;
  // "focused" = a single team is selected → drop everyone else's arcs & dots for a clean map
  const focused = shownTeams.length === 1;
  const [feats, setFeats] = React.useState(WORLD);
  const [err, setErr] = React.useState(false);
  const [tf, setTf] = React.useState({ k: 1, x: 0, y: 0 });
  const wrapRef = React.useRef(null);
  const drag = React.useRef(null);
  const ptrs = React.useRef(new Map());
  const pinch = React.useRef(null);

  React.useEffect(() => {
    if (!feats) loadWorld().then(setFeats).catch(() => setErr(true));
  }, []);

  const projection = React.useMemo(
    () => window.d3 ? window.d3.geoNaturalEarth1().fitExtent([[8, 8], [MAP_W - 8, MAP_H - 8]], { type: "Sphere" }) : null,
    []);
  const path = React.useMemo(() => projection ? window.d3.geoPath(projection) : null, [projection]);
  const proj = (lon, lat) => projection ? projection([lon, lat]) : [0, 0];

  /* zoom helpers */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const setZoom = (k, x, y) => {
    k = clamp(k, 1, 9);
    if (k === 1) { setTf({ k: 1, x: 0, y: 0 }); return; }
    x = clamp(x, MAP_W * (1 - k), 0);
    y = clamp(y, MAP_H * (1 - k), 0);
    setTf({ k, x, y });
  };
  const vbScale = () => {
    const r = wrapRef.current.getBoundingClientRect();
    const s = Math.min(r.width / MAP_W, r.height / MAP_H);
    return { s, ox: (r.width - MAP_W * s) / 2, oy: (r.height - MAP_H * s) / 2, r };
  };
  React.useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const onWheel = (e) => {
      // plain wheel scrolls the page; only zoom with Ctrl/⌘ held (or when already zoomed in)
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const { s, ox, oy, r } = vbScale();
      const vx = (e.clientX - r.left - ox) / s, vy = (e.clientY - r.top - oy) / s;
      const factor = e.deltaY < 0 ? 1.22 : 1 / 1.22;
      setTf((t) => {
        let k = clamp(t.k * factor, 1, 9);
        if (k === 1) return { k: 1, x: 0, y: 0 };
        let x = vx - (vx - t.x) * (k / t.k), y = vy - (vy - t.y) * (k / t.k);
        x = clamp(x, MAP_W * (1 - k), 0); y = clamp(y, MAP_H * (1 - k), 0);
        return { k, x, y };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [feats, projection]);

  const onPointerDown = (e) => {
    // let the zoom buttons (and any controls) handle their own clicks
    if (e.target.closest && e.target.closest("button")) return;
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, k: tf.k, x: tf.x, y: tf.y,
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
      drag.current = null;
      wrapRef.current.setPointerCapture && wrapRef.current.setPointerCapture(e.pointerId);
    } else if (tf.k > 1 || e.pointerType === "mouse") {
      // only grab the pointer for panning when zoomed in (touch) — lets the page
      // scroll normally when swiping over the map at base zoom
      drag.current = { sx: e.clientX, sy: e.clientY, x: tf.x, y: tf.y, moved: false };
      wrapRef.current.setPointerCapture && wrapRef.current.setPointerCapture(e.pointerId);
    }
  };
  const onPointerMove = (e) => {
    if (ptrs.current.has(e.pointerId)) ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pn = pinch.current, dr = drag.current;
    if (ptrs.current.size >= 2 && pn) {
      const { s, ox, oy, r } = vbScale();
      const [a, b] = [...ptrs.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const k = clamp(pn.k * dist / pn.dist, 1, 9);
      // anchor at the original pinch midpoint in content space
      const vx = (pn.mid.x - r.left - ox) / s, vy = (pn.mid.y - r.top - oy) / s;
      let x = vx - (vx - pn.x) * (k / pn.k), y = vy - (vy - pn.y) * (k / pn.k);
      x = clamp(x, MAP_W * (1 - k), 0); y = clamp(y, MAP_H * (1 - k), 0);
      setTf(k === 1 ? { k: 1, x: 0, y: 0 } : { k, x, y });
      return;
    }
    if (!dr) return;
    const { s } = vbScale();
    const dx = (e.clientX - dr.sx) / s, dy = (e.clientY - dr.sy) / s;
    if (Math.abs(dx) + Math.abs(dy) > 2) dr.moved = true;
    setZoom(tf.k, dr.x + dx, dr.y + dy);
  };
  const onPointerUp = (e) => {
    ptrs.current.delete(e.pointerId);
    if (ptrs.current.size < 2) pinch.current = null;
    if (ptrs.current.size === 0) drag.current = null;
  };

  if (err) return <div style={{ padding: 40, textAlign: "center", color: "var(--cream)", fontWeight: 700 }}>
    Couldn't load the map data — check your connection.</div>;
  if (!feats || !projection) return <div style={{ height: "100%", display: "flex", alignItems: "center",
    justifyContent: "center", color: "var(--cream)", fontFamily: "var(--head)", fontSize: 18 }}>
    <span className="anim-bob">🌍 Loading the world…</span></div>;

  /* highlights */
  const homeNames = {};
  shownTeams.forEach((c) => { homeNames[TEAM_COUNTRY[c]] = true; });
  const fillFor = (name) => homeNames[name] ? "#ffe1a0" : (HOST_FILL[name] || "#e9dcc0");

  /* arcs + active venues */
  const arcs = []; let k = 0; const homesShown = []; const venuesActive = new Set();
  pool.forEach((code) => {
    const shown = shownTeams.includes(code), dead = W.ELIMINATED.includes(code);
    if (shown) homesShown.push(code);
    (routeOf[code] || []).forEach((vid) => {
      if (shown) venuesActive.add(vid);
      if (focused && !shown) return; // clean view: skip other teams' arcs
      const h = proj(W.HOME[code].lon, W.HOME[code].lat);
      const v = proj(W.VENUES[vid].lon, W.VENUES[vid].lat);
      arcs.push({ key: k++, d: arcPath(h, v), shown, dead, code });
    });
  });
  arcs.sort((a, b) => (a.shown === b.shown ? 0 : a.shown ? 1 : -1));
  const inv = 1 / tf.k;

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden",
      touchAction: tf.k > 1 ? "none" : "pan-y", cursor: drag.current ? "grabbing" : "grab", background: "#0c1838" }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet"
        style={{ display: "block" }}>
        <defs>
          <radialGradient id="oceanG" cx="50%" cy="42%" r="75%">
            <stop offset="0" stopColor="#1b3a78" /><stop offset="1" stopColor="#0c1838" />
          </radialGradient>
        </defs>
        <g transform={`translate(${tf.x} ${tf.y}) scale(${tf.k})`}>
          <path d={path({ type: "Sphere" })} fill="url(#oceanG)" stroke="#2c3f66" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <path d={window.d3.geoPath(projection)(window.d3.geoGraticule10())} fill="none"
            stroke="#ffffff" strokeOpacity="0.06" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
          {/* countries */}
          {feats.map((f, i) => (
            <path key={i} d={path(f)} fill={fillFor(f.properties.name)}
              stroke="#1b2a4a" strokeWidth="0.7" strokeOpacity="0.55" vectorEffect="non-scaling-stroke" />
          ))}

          {/* arcs */}
          {arcs.map((a) => (
            <path key={a.key} d={a.d} fill="none"
              stroke={a.dead ? "#9fb2d4" : a.shown ? "#ffd23f" : "#7fa8e6"}
              strokeWidth={a.shown ? 3 : 1.6} strokeLinecap="round"
              strokeDasharray={a.shown ? "0" : "2 6"} vectorEffect="non-scaling-stroke"
              style={{ opacity: a.shown ? 1 : 0.18,
                filter: a.shown ? "drop-shadow(0 0 3px rgba(255,210,63,.6))" : "none" }} />
          ))}
          {/* flying balls (separate so each has its own path id) */}
          {motion && arcs.filter((a) => a.shown).map((a) => {
            const pid = "arcp" + a.key;
            return (
              <g key={"b" + a.key}>
                <path id={pid} d={a.d} fill="none" stroke="none" />
                <g>
                  <g transform={`scale(${inv})`}>
                    <circle r="8" fill="#fffdf3" stroke="#1b2a4a" strokeWidth="2.4" />
                    <text fontSize="11" textAnchor="middle" dy="4">⚽</text>
                  </g>
                  <animateMotion dur={(2.8 + (a.key % 5) * 0.5) + "s"} repeatCount="indefinite" rotate="0">
                    <mpath href={"#" + pid} />
                  </animateMotion>
                </g>
              </g>
            );
          })}

          {/* venue pins */}
          {Object.keys(W.VENUES).map((vid) => {
            const v = W.VENUES[vid]; const p = proj(v.lon, v.lat);
            const active = venuesActive.has(vid);
            if (focused && !active) return null; // clean view: only the connected dots
            return (
              <g key={vid} transform={`translate(${p[0]} ${p[1]}) scale(${inv})`}
                onClick={(e) => { e.stopPropagation(); onVenue(vid); }} style={{ cursor: "pointer" }}>
                {active && <circle r="14" fill="none" stroke={HOST_DOT[v.host]} strokeWidth="2" opacity="0.5">
                  <animate attributeName="r" values="9;17;9" dur="2s" repeatCount="indefinite" /></circle>}
                <circle r={active ? 7 : 4.5} fill={HOST_DOT[v.host]} stroke="#1b2a4a" strokeWidth="2.4"
                  opacity={active ? 1 : 0.6} />
                {active && (
                  <g transform="translate(0 -13)">
                    <rect x={-v.city.length * 3.4 - 6} y="-12" width={v.city.length * 6.8 + 12} height="17" rx="6"
                      fill="#1b2a4a" />
                    <text textAnchor="middle" y="0.5" fontFamily="var(--head)" fontSize="11" fill="#fffdf3">{v.city}</text>
                  </g>
                )}
              </g>
            );
          })}

          {/* home flag pins */}
          {homesShown.map((code) => {
            const h = W.HOME[code]; const p = proj(h.lon, h.lat);
            const dead = W.ELIMINATED.includes(code);
            return (
              <g key={code} transform={`translate(${p[0]} ${p[1]}) scale(${inv})`}
                onClick={(e) => { e.stopPropagation(); onTeam(code); }}
                style={{ cursor: "pointer", opacity: dead ? 0.6 : 1 }}>
                <circle r="3" fill="#ffd23f" stroke="#1b2a4a" strokeWidth="1.5" />
                <g transform="translate(0 -20)"><MiniFlagSvg code={code} /></g>
              </g>
            );
          })}
        </g>
      </svg>

      {/* zoom controls */}
      <div style={{ position: "absolute", right: 10, bottom: 10, display: "flex", flexDirection: "column", gap: 7 }}>
        {[["+", () => setZoom(tf.k * 1.5, tf.x, tf.y)], ["−", () => setZoom(tf.k / 1.5, tf.x, tf.y)],
          ["⟳", () => setTf({ k: 1, x: 0, y: 0 })]].map(([l, fn]) => (
          <button key={l} onClick={fn} style={{ width: 38, height: 38, borderRadius: 11,
            border: "3px solid var(--ink)", background: "var(--cream)", fontFamily: "var(--head)",
            fontSize: 20, cursor: "pointer", boxShadow: "2px 3px 0 rgba(27,42,74,.7)", lineHeight: 1 }}>{l}</button>
        ))}
      </div>
      <div style={{ position: "absolute", left: 12, bottom: 12, color: "var(--cream)", fontWeight: 700,
        fontSize: 11, opacity: 0.6, pointerEvents: "none" }}>+ / − or pinch to zoom · drag to pan</div>
    </div>
  );
}

Object.assign(window, { WorldMap, MiniFlagSvg, MAP_W, MAP_H, TEAM_COUNTRY, loadWorld });
