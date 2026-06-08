/* World Cup HQ — tournament data: 32 teams, 8 groups, generated standings,
   and a full seeded knockout bracket (R32 -> Final). Extends window.WCHQ. */
(function () {
  const W = window.WCHQ;

  /* ---- 16 EXTRA nations (added to the original 16 in data.js) ---- */
  const EXTRA = {
    BEL: { name: "Belgium",     bands: ["#1b2a4a", "#ffd23f", "#ff5d5d"], dir: "v", tier: "Contender", odds: "12/1" },
    ITA: { name: "Italy",       bands: ["#46b94a", "#fffdf3", "#ff5d5d"], dir: "v", tier: "Contender", odds: "12/1" },
    URU: { name: "Uruguay",     bands: ["#8ad6ff", "#fffdf3"],            dir: "h", tier: "Dark horse", odds: "16/1" },
    COL: { name: "Colombia",    bands: ["#ffd23f", "#36a9ff", "#ff5d5d"], dir: "h", tier: "Dark horse", odds: "20/1" },
    SUI: { name: "Switzerland", bands: ["#ff5d5d", "#fffdf3"],            dir: "centre", tier: "Outsider", odds: "40/1" },
    DEN: { name: "Denmark",     bands: ["#ff5d5d", "#fffdf3"],            dir: "cross", tier: "Dark horse", odds: "33/1" },
    KOR: { name: "South Korea", bands: ["#fffdf3", "#ff5d5d", "#36a9ff"], dir: "centre", tier: "Longshot", odds: "60/1" },
    AUS: { name: "Australia",   bands: ["#1b2a4a", "#36a9ff"],            dir: "h", tier: "Longshot", odds: "80/1" },
    POL: { name: "Poland",      bands: ["#fffdf3", "#ff5d5d"],            dir: "h", tier: "Outsider", odds: "50/1" },
    SRB: { name: "Serbia",      bands: ["#ff5d5d", "#36a9ff", "#fffdf3"], dir: "h", tier: "Outsider", odds: "50/1" },
    ECU: { name: "Ecuador",     bands: ["#ffd23f", "#36a9ff", "#ff5d5d"], dir: "h", tier: "Longshot", odds: "80/1" },
    NGA: { name: "Nigeria",     bands: ["#46b94a", "#fffdf3", "#46b94a"], dir: "v", tier: "Longshot", odds: "66/1" },
    EGY: { name: "Egypt",       bands: ["#ff5d5d", "#fffdf3", "#1b2a4a"], dir: "h", tier: "Longshot", odds: "90/1" },
    NOR: { name: "Norway",      bands: ["#ff5d5d", "#fffdf3", "#36a9ff"], dir: "cross", tier: "Outsider", odds: "40/1" },
    TUR: { name: "Turkey",      bands: ["#ff5d5d", "#fffdf3"],            dir: "centre", tier: "Outsider", odds: "45/1" },
    IRN: { name: "Iran",        bands: ["#46b94a", "#fffdf3", "#ff5d5d"], dir: "h", tier: "Longshot", odds: "100/1" },
  };
  Object.assign(W.TEAMS, EXTRA);

  /* ---- titles + fun facts (all 32) ---- */
  const META = {
    BRA: { titles: "5× Winners", fact: "Famous for samba football and the golden shirt." },
    FRA: { titles: "2× Winners", fact: "Love a stylish, lightning counter-attack." },
    ARG: { titles: "3× Winners", fact: "The sky-blue stripes never, ever give up." },
    ENG: { titles: "1× Winners", fact: "It's coming home… probably… maybe?" },
    ESP: { titles: "1× Winners", fact: "Pass, pass, pass — then pass again." },
    GER: { titles: "4× Winners", fact: "Super organised, like a footballing machine." },
    POR: { titles: "Euro Champions", fact: "Counter-attacks at warp speed." },
    NED: { titles: "3× Finalists", fact: "Invented 'Total Football' — and the orange kit." },
    CRO: { titles: "2018 Finalists", fact: "Tiny country, absolutely giant midfield." },
    MAR: { titles: "2022 Semis", fact: "Africa's record-breaking history makers." },
    USA: { titles: "Co-Hosts 2026", fact: "Big home crowds cheering them on!" },
    MEX: { titles: "Co-Hosts 2026", fact: "The green wave brings ALL the noise." },
    CAN: { titles: "Co-Hosts 2026", fact: "Their very first home World Cup." },
    JPN: { titles: "Samurai Blue", fact: "Tidy passing and the tidiest fans around." },
    SEN: { titles: "Africa Champs", fact: "The Lions of Teranga love a roar." },
    GHA: { titles: "Black Stars", fact: "Always, always full of flair." },
    BEL: { titles: "Red Devils", fact: "A whole golden generation of stars." },
    ITA: { titles: "4× Winners", fact: "Defending is basically an art form." },
    URU: { titles: "2× Winners", fact: "Tiny nation, enormous footballing heart." },
    COL: { titles: "Los Cafeteros", fact: "They dance every single goal." },
    SUI: { titles: "The Nati", fact: "Reliable as a Swiss watch." },
    DEN: { titles: "Danish Dynamite", fact: "Shock winners of Euro '92." },
    KOR: { titles: "Taeguk Warriors", fact: "Never stop running, ever." },
    AUS: { titles: "The Socceroos", fact: "Travel the furthest of anyone!" },
    POL: { titles: "Biało-czerwoni", fact: "A proper goal-scoring number 9." },
    SRB: { titles: "The Eagles", fact: "Towering, powerful and direct." },
    ECU: { titles: "La Tri", fact: "Play half their games up a mountain." },
    NGA: { titles: "Super Eagles", fact: "The coolest kits at the whole cup." },
    EGY: { titles: "The Pharaohs", fact: "Record 7-time African champions." },
    NOR: { titles: "Løvene", fact: "A goal machine leads the line." },
    TUR: { titles: "Ay-Yıldızlılar", fact: "Loud, proud and fearless." },
    IRN: { titles: "Team Melli", fact: "Asia's most regular qualifiers." },
  };
  Object.keys(META).forEach((c) => { if (W.TEAMS[c]) Object.assign(W.TEAMS[c], META[c]); });

  /* ---- FIFA 2026 squad page per team (slug is best-guess; editable in Admin) ---- */
  const FIFA_BASE = "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/teams/";
  const SQUAD_SLUG = {
    BRA: "brazil", FRA: "france", ARG: "argentina", ENG: "england", ESP: "spain",
    GER: "germany", POR: "portugal", NED: "netherlands", CRO: "croatia", MAR: "morocco",
    USA: "usa", MEX: "mexico", CAN: "canada", JPN: "japan", SEN: "senegal", GHA: "ghana",
    BEL: "belgium", ITA: "italy", URU: "uruguay", COL: "colombia", SUI: "switzerland",
    DEN: "denmark", KOR: "korea-republic", AUS: "australia", POL: "poland", SRB: "serbia",
    ECU: "ecuador", NGA: "nigeria", EGY: "egypt", NOR: "norway", TUR: "turkiye", IRN: "iran",
  };
  Object.keys(W.TEAMS).forEach((c) => {
    if (!W.TEAMS[c].squad) W.TEAMS[c].squad = FIFA_BASE + (SQUAD_SLUG[c] || W.TEAMS[c].name.toLowerCase().replace(/\s+/g, "-")) + "/squad";
  });

  /* ---- 8 groups of 4 ---- */
  const GROUPS = {
    A: ["BRA", "BEL", "JPN", "NOR"],
    B: ["FRA", "ITA", "MEX", "KOR"],
    C: ["ARG", "URU", "SEN", "AUS"],
    D: ["ESP", "COL", "CAN", "EGY"],
    E: ["GER", "SUI", "MAR", "ECU"],
    F: ["POR", "DEN", "USA", "IRN"],
    G: ["NED", "POL", "GHA", "TUR"],
    H: ["ENG", "SRB", "CRO", "NGA"],
  };

  /* ---- teams knocked OUT so far (= union of everyone's sweepstake outs) ---- */
  const ELIMINATED = ["JPN", "CAN", "GHA", "POR", "GER"];

  function oddsNum(code) {
    const o = (W.TEAMS[code] && W.TEAMS[code].odds) || "999/1";
    return parseInt(o.split("/")[0], 10) || 999;
  }
  // strength used to generate scores: lower odds = stronger; eliminated heavily penalised
  function scoreStrength(code) { return -oddsNum(code) - (ELIMINATED.includes(code) ? 600 : 0); }

  /* ---- generate full round-robin results per group from strength ---- */
  function gscore(a, b) {
    const d = scoreStrength(a) - scoreStrength(b);
    if (d > 300) return [3, 0]; if (d > 120) return [2, 0]; if (d > 30) return [2, 1];
    if (d > -30) return [1, 1]; if (d > -120) return [1, 2]; if (d > -300) return [0, 2];
    return [0, 3];
  }
  const RR = [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]];
  const GROUP_RESULTS = {};
  Object.keys(GROUPS).forEach((g) => {
    const t = GROUPS[g];
    GROUP_RESULTS[g] = RR.map(([i, j]) => {
      const [as, bs] = gscore(t[i], t[j]);
      return { a: t[i], b: t[j], as, bs };
    });
  });

  /* ---- compute standings from those results ---- */
  const STANDINGS = {};
  Object.keys(GROUPS).forEach((g) => {
    GROUPS[g].forEach((c) => (STANDINGS[c] = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }));
    GROUP_RESULTS[g].forEach((m) => {
      const A = STANDINGS[m.a], B = STANDINGS[m.b];
      A.p++; B.p++; A.gf += m.as; A.ga += m.bs; B.gf += m.bs; B.ga += m.as;
      if (m.as > m.bs) { A.w++; B.l++; A.pts += 3; }
      else if (m.as < m.bs) { B.w++; A.l++; B.pts += 3; }
      else { A.d++; B.d++; A.pts++; B.pts++; }
    });
  });

  /* knockout seeding + bracket. Seed by odds (favourites on top); eliminated
     teams sink to the bottom seeds so they lose in the Round of 32. */
  function strength(code) {
    if (ELIMINATED.includes(code)) return -2000 - oddsNum(code);
    return (1000 - oddsNum(code)) * 100 + STANDINGS[code].pts;
  }
  function seedOrder(n) {
    let s = [1];
    while (s.length < n) { const m = s.length * 2 + 1; const nx = []; s.forEach((x) => { nx.push(x, m - x); }); s = nx; }
    return s;
  }
  function mkTies(pairs) {
    return pairs.map((p) => ({ a: p[0], b: p[1], w: strength(p[0]) >= strength(p[1]) ? p[0] : p[1] }));
  }
  let _bracket = null;
  function bracketFull() {
    if (_bracket) return _bracket;
    const seeds = Object.keys(W.TEAMS).sort((a, b) => strength(b) - strength(a)); // seed1 = index 0
    const order = seedOrder(32);
    const r32pairs = [];
    for (let i = 0; i < 32; i += 2) r32pairs.push([seeds[order[i] - 1], seeds[order[i + 1] - 1]]);
    const r32 = mkTies(r32pairs);
    const nextPairs = (ties) => { const w = ties.map((t) => t.w); const out = []; for (let i = 0; i < w.length; i += 2) out.push([w[i], w[i + 1]]); return out; };
    const r16 = mkTies(nextPairs(r32));
    const qf = mkTies(nextPairs(r16));
    const sf = mkTies(nextPairs(qf));
    const final = mkTies(nextPairs(sf))[0];
    _bracket = { r32, r16, qf, sf, final, champ: final.w, seeds };
    return _bracket;
  }
  // back-compat shape for older callers
  function projectedBracket() {
    const b = bracketFull();
    return { qf: b.qf.map((t) => [t.a, t.b]), qfW: b.qf.map((t) => t.w),
      sf: b.sf.map((t) => [t.a, t.b]), sfW: b.sf.map((t) => t.w),
      finalPair: [b.final.a, b.final.b], champ: b.champ };
  }

  function isAlive(code) { return !ELIMINATED.includes(code); }
  function backers(code, people) { return (people || W.PEOPLE).filter((p) => p.teams.includes(code)); }
  function groupOf(code) { return Object.keys(GROUPS).find((g) => GROUPS[g].includes(code)); }
  function table(g) {
    return GROUPS[g].map((c) => ({ code: c, ...STANDINGS[c] }))
      .sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf);
  }

  Object.assign(W, {
    META, GROUPS, STANDINGS, GROUP_RESULTS, ELIMINATED,
    oddsNum, isAlive, backers, groupOf, table, projectedBracket,
    bracketFull, seedOrder, strength,
    invalidateBracket() { _bracket = null; },
  });
})();
