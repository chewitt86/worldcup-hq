/* World Cup HQ — MAP data: host venues, team home coords, routes, land grid.
   Equirectangular: lon -180..180 -> x, lat 90..-90 -> y. Extends window.WCHQ. */
(function () {
  const W = window.WCHQ;

  /* Host venues (2026 host cities — USA / Canada / Mexico) */
  const VENUES = {
    NYC: { city: "New York", host: "USA", lat: 40.81, lon: -74.07 },
    LA:  { city: "Los Angeles", host: "USA", lat: 33.95, lon: -118.34 },
    DAL: { city: "Dallas", host: "USA", lat: 32.75, lon: -97.09 },
    ATL: { city: "Atlanta", host: "USA", lat: 33.75, lon: -84.40 },
    MIA: { city: "Miami", host: "USA", lat: 25.96, lon: -80.24 },
    SEA: { city: "Seattle", host: "USA", lat: 47.59, lon: -122.33 },
    SF:  { city: "San Francisco", host: "USA", lat: 37.40, lon: -121.97 },
    HOU: { city: "Houston", host: "USA", lat: 29.68, lon: -95.41 },
    KC:  { city: "Kansas City", host: "USA", lat: 39.05, lon: -94.48 },
    BOS: { city: "Boston", host: "USA", lat: 42.09, lon: -71.26 },
    PHI: { city: "Philadelphia", host: "USA", lat: 39.90, lon: -75.17 },
    TOR: { city: "Toronto", host: "CAN", lat: 43.63, lon: -79.42 },
    VAN: { city: "Vancouver", host: "CAN", lat: 49.28, lon: -123.11 },
    MEX: { city: "Mexico City", host: "MEX", lat: 19.30, lon: -99.15 },
    GDL: { city: "Guadalajara", host: "MEX", lat: 20.68, lon: -103.46 },
    MTY: { city: "Monterrey", host: "MEX", lat: 25.67, lon: -100.24 },
  };

  /* Team home capitals (approx) */
  const HOME = {
    BRA: { lat: -15.79, lon: -47.88 }, FRA: { lat: 48.85, lon: 2.35 },
    ARG: { lat: -34.61, lon: -58.38 }, ENG: { lat: 51.51, lon: -0.13 },
    ESP: { lat: 40.42, lon: -3.70 },   GER: { lat: 52.52, lon: 13.40 },
    POR: { lat: 38.72, lon: -9.14 },   NED: { lat: 52.37, lon: 4.90 },
    CRO: { lat: 45.81, lon: 15.98 },   MAR: { lat: 33.97, lon: -6.85 },
    USA: { lat: 38.90, lon: -77.04 },  MEX: { lat: 19.43, lon: -99.13 },
    CAN: { lat: 45.42, lon: -75.70 },  JPN: { lat: 35.68, lon: 139.69 },
    SEN: { lat: 14.69, lon: -17.45 },  GHA: { lat: 5.60, lon: -0.19 },
    BEL: { lat: 50.85, lon: 4.35 },    ITA: { lat: 41.90, lon: 12.50 },
    URU: { lat: -34.90, lon: -56.16 }, COL: { lat: 4.71, lon: -74.07 },
    SUI: { lat: 46.95, lon: 7.45 },    DEN: { lat: 55.68, lon: 12.57 },
    KOR: { lat: 37.57, lon: 126.98 },  AUS: { lat: -35.28, lon: 149.13 },
    POL: { lat: 52.23, lon: 21.01 },   SRB: { lat: 44.79, lon: 20.45 },
    ECU: { lat: -0.18, lon: -78.47 },  NGA: { lat: 9.06, lon: 7.50 },
    EGY: { lat: 30.04, lon: 31.24 },   NOR: { lat: 59.91, lon: 10.75 },
    TUR: { lat: 39.93, lon: 32.86 },   IRN: { lat: 35.69, lon: 51.39 },
  };

  /* Each group is "based" near a few host cities; teams play their group games there */
  const GROUP_VENUES = {
    A: ["LA", "SF", "SEA"],   B: ["NYC", "BOS", "TOR"],
    C: ["MIA", "ATL", "HOU"], D: ["DAL", "HOU", "MEX"],
    E: ["GDL", "MTY", "KC"],  F: ["PHI", "KC", "DAL"],
    G: ["VAN", "SEA", "SF"],  H: ["TOR", "PHI", "NYC"],
  };
  const ROUTES = {};
  Object.keys(W.GROUPS || {}).forEach((g) => {
    W.GROUPS[g].forEach((c) => { ROUTES[c] = GROUP_VENUES[g] || ["NYC"]; });
  });

  /* Stylized land as dot-grid ranges. Grid 64 cols x 32 rows, equirectangular.
     Each row: list of [startCol,endCol] inclusive that are "land". */
  const GRID_W = 64, GRID_H = 32;
  const LAND_ROWS = [
    [], [[13,19],[25,28],[45,61]], [[8,20],[24,29],[40,62]], [[4,21],[24,29],[33,63]],
    [[3,22],[25,29],[30,63]], [[7,22],[29,63]], [[6,22],[30,63]], [[7,21],[30,63]],
    [[8,21],[30,63]], [[9,21],[27,63]], [[10,20],[27,58]], [[12,18],[27,58]],
    [[14,18],[28,58]], [[18,25],[29,42],[53,58]], [[18,26],[30,41],[52,58]], [[18,26],[31,40],[52,57]],
    [[18,26],[32,39],[52,57]], [[18,26],[33,39],[53,58]], [[18,25],[33,39],[51,58]], [[19,25],[34,39],[51,58]],
    [[19,24],[35,38],[51,57]], [[20,24],[35,37],[52,56]], [[20,23],[53,55],[61,62]], [[20,22],[61,62]],
    [[20,22]], [[20,21]], [], [], [], [], [], [],
  ];

  /* lon/lat -> normalised 0..1 (x right, y down) on equirectangular */
  function lonLatXY(lon, lat) {
    return { x: (lon + 180) / 360, y: (90 - lat) / 180 };
  }

  /* Knockout-stage host venues (projected). R32 uses all 16, R16 the first 8. */
  const ALLV = Object.keys(VENUES);
  const KO_VENUES = {
    R32: ALLV,
    R16: ALLV.slice(0, 8),
    QF: ["LA", "KC", "MIA", "BOS"],
    SF: ["DAL", "ATL"],
    F:  ["NYC"],
  };
  const STAGE_LABEL = { R32: "Round of 32", R16: "Round of 16", QF: "Quarter-final", SF: "Semi-final", F: "Final" };

  /* Teams + arcs + matchups for a given stage.
     stage: "Groups" | "R32" | "R16" | "QF" | "SF" | "F" */
  function stageRoutes(stage) {
    if (stage === "Groups") {
      return {
        teams: Object.keys(ROUTES),
        routeOf: ROUTES,
        matches: Object.keys(W.GROUPS).flatMap((g) =>
          (W.GROUP_RESULTS[g] || []).map((m) => ({ a: m.a, b: m.b, venue: ROUTES[m.a]?.[0], label: "Group " + g }))),
      };
    }
    const b = W.bracketFull();
    const ties = stage === "F" ? [b.final]
      : { R32: b.r32, R16: b.r16, QF: b.qf, SF: b.sf }[stage] || [];
    const venues = KO_VENUES[stage] || ALLV;
    const routeOf = {}, matches = [], teams = [];
    ties.forEach((t, i) => {
      const venue = venues[i % venues.length];
      routeOf[t.a] = [venue]; routeOf[t.b] = [venue];
      teams.push(t.a, t.b);
      matches.push({ a: t.a, b: t.b, venue, label: STAGE_LABEL[stage] });
    });
    return { teams: [...new Set(teams)], routeOf, matches };
  }

  /* Knockout kickoff schedule (BST) + venue for a tie at round `stage`, index `i` */
  const KO_DATES = {
    R32: { label: "Round of 32", start: "2026-06-27", span: 5 },
    R16: { label: "Round of 16", start: "2026-07-04", span: 3 },
    QF:  { label: "Quarter-final", start: "2026-07-09", span: 2 },
    SF:  { label: "Semi-final", start: "2026-07-14", span: 1 },
    F:   { label: "Final", start: "2026-07-19", span: 0 },
  };
  const KO_TIMES = ["5:00pm", "8:00pm", "11:00pm"]; // BST kick-offs
  /* All games a given team plays in a stage: opponent, venue, date/time (BST),
     and score if played. Groups -> 3 fixtures; knockout -> 1 tie. */
  function teamGames(code, stage) {
    if (stage === "Groups") {
      const g = W.groupOf(code);
      const venues = ROUTES[code] || [];
      return (W.GROUP_RESULTS[g] || [])
        .filter((m) => m.a === code || m.b === code)
        .map((m, idx) => {
          const opp = m.a === code ? m.b : m.a;
          const us = m.a === code ? m.as : m.bs;
          const them = m.a === code ? m.bs : m.as;
          const venue = venues[idx % venues.length] || venues[0];
          return { opp, venue, city: VENUES[venue]?.city, host: VENUES[venue]?.host,
            label: "Group " + g, played: true, score: [us, them],
            result: us > them ? "W" : us < them ? "L" : "D",
            date: null, time: null };
        });
    }
    const sr = stageRoutes(stage);
    return sr.matches
      .map((m, i) => ({ m, i }))
      .filter(({ m }) => m.a === code || m.b === code)
      .map(({ m, i }) => {
        const opp = m.a === code ? m.b : m.a;
        const info = koGame(stage, i);
        const us = info.played ? (m.a === code ? info.score[0] : info.score[1]) : null;
        const them = info.played ? (m.a === code ? info.score[1] : info.score[0]) : null;
        return { opp, venue: info.venue, city: info.city, host: info.host, label: info.label,
          played: info.played, score: info.played ? [us, them] : null,
          result: info.played ? (us > them ? "W" : us < them ? "L" : "D") : null,
          date: info.date, time: info.time, gi: i, m };
      });
  }

  /* Knockout kickoff schedule (BST) + venue for a tie at round `stage`, index `i` */
  function koGame(stage, i) {
    const m = KO_DATES[stage] || KO_DATES.F;
    const venues = KO_VENUES[stage] || ALLV;
    const venue = venues[i % venues.length];
    const d = new Date(m.start + "T00:00:00");
    d.setDate(d.getDate() + (m.span ? i % (m.span + 1) : 0));
    const date = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    // results overlay (Admin can enter actual scores)
    const store = window.WCHQStore;
    const res = store && store.getResults ? store.getResults()[stage + ":" + i] : null;
    return { label: m.label, venue, city: VENUES[venue].city, host: VENUES[venue].host,
      date, time: KO_TIMES[i % KO_TIMES.length],
      played: !!(res && res.played), score: res ? res.score : null };
  }

  Object.assign(W, { VENUES, HOME, ROUTES, GRID_W, GRID_H, LAND_ROWS, lonLatXY, KO_VENUES, stageRoutes, koGame, teamGames });
})();
