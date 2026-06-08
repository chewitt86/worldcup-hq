/* World Cup HQ — placeholder data (plain JS, attaches to window.WCHQ) */
(function () {
  // Simplified, original flag chips: a few colour bands + orientation.
  // ('v' vertical, 'h' horizontal). Not exact flags — sticker-album style.
  const TEAMS = {
    BRA: { name: "Brazil",      bands: ["#2fe0c0", "#ffd23f", "#36a9ff"], dir: "h", tier: "Favourite",  odds: "5/1" },
    FRA: { name: "France",      bands: ["#36a9ff", "#fffdf3", "#ff5d5d"], dir: "v", tier: "Favourite",  odds: "6/1" },
    ARG: { name: "Argentina",   bands: ["#8ad6ff", "#fffdf3", "#8ad6ff"], dir: "h", tier: "Favourite",  odds: "6/1" },
    ENG: { name: "England",     bands: ["#fffdf3", "#ff5d5d"],            dir: "cross", tier: "Contender", odds: "8/1" },
    ESP: { name: "Spain",       bands: ["#ff5d5d", "#ffd23f", "#ff5d5d"], dir: "h", tier: "Contender",  odds: "9/1" },
    GER: { name: "Germany",     bands: ["#1b2a4a", "#ff5d5d", "#ffd23f"], dir: "h", tier: "Contender",  odds: "10/1" },
    POR: { name: "Portugal",    bands: ["#46b94a", "#ff5d5d"],            dir: "v", tier: "Contender",  odds: "11/1" },
    NED: { name: "Netherlands", bands: ["#ff9f1c", "#fffdf3", "#36a9ff"], dir: "h", tier: "Dark horse", odds: "14/1" },
    CRO: { name: "Croatia",     bands: ["#ff5d5d", "#fffdf3", "#36a9ff"], dir: "h", tier: "Dark horse", odds: "22/1" },
    MAR: { name: "Morocco",     bands: ["#ff5d5d", "#46b94a"],            dir: "v", tier: "Dark horse", odds: "28/1" },
    USA: { name: "USA",         bands: ["#36a9ff", "#fffdf3", "#ff5d5d"], dir: "h", tier: "Host",       odds: "16/1" },
    MEX: { name: "Mexico",      bands: ["#46b94a", "#fffdf3", "#ff5d5d"], dir: "v", tier: "Host",       odds: "18/1" },
    CAN: { name: "Canada",      bands: ["#ff5d5d", "#fffdf3", "#ff5d5d"], dir: "v", tier: "Host",       odds: "40/1" },
    JPN: { name: "Japan",       bands: ["#fffdf3", "#ff5d5d"],            dir: "centre", tier: "Outsider", odds: "50/1" },
    SEN: { name: "Senegal",     bands: ["#46b94a", "#ffd23f", "#ff5d5d"], dir: "v", tier: "Longshot",   odds: "66/1" },
    GHA: { name: "Ghana",       bands: ["#ff5d5d", "#ffd23f", "#46b94a"], dir: "h", tier: "Longshot",   odds: "90/1" },
  };

  // Sweepstake players (the family). points = fun score so far.
  const PEOPLE = [
    { id: "leo",  name: "Leo",      initials: "LE", colour: "#36a9ff", points: 38, teams: ["BRA", "NED", "JPN"],          out: ["JPN"],        best: "BRA" },
    { id: "gp",   name: "Grandad",  initials: "GP", colour: "#9b6cf0", points: 34, teams: ["FRA", "MAR", "GHA"],          out: ["GHA"],        best: "FRA" },
    { id: "mum",  name: "Mum",      initials: "MU", colour: "#ff8fd0", points: 31, teams: ["ARG", "USA", "SEN"],          out: [],             best: "ARG" },
    { id: "dad",  name: "Dad",      initials: "DA", colour: "#ff9f1c", points: 27, teams: ["ESP", "CRO", "CAN"],          out: ["CAN"],        best: "ESP" },
    { id: "sam",  name: "Auntie Sam", initials: "SA", colour: "#2fe0c0", points: 22, teams: ["ENG", "MEX"],              out: [],             best: "ENG" },
    { id: "rob",  name: "Uncle Rob", initials: "RO", colour: "#ff5d5d", points: 12, teams: ["GER", "POR"],               out: ["GER", "POR"], best: "POR" },
  ];

  // Match ticker — mix of warm-up results and upcoming kick-offs.
  const TICKER = [
    { type: "result", a: "BRA", b: "JPN", as: 3, bs: 1, tag: "Warm-up" },
    { type: "soon",   a: "MEX", b: "CRO", when: "Thu 8:00pm", tag: "Group A" },
    { type: "result", a: "FRA", b: "CAN", as: 2, bs: 0, tag: "Warm-up" },
    { type: "soon",   a: "ARG", b: "SEN", when: "Fri 5:00pm", tag: "Group C" },
    { type: "soon",   a: "ESP", b: "GHA", when: "Fri 8:00pm", tag: "Group H" },
    { type: "result", a: "ENG", b: "MAR", as: 1, bs: 1, tag: "Warm-up" },
    { type: "soon",   a: "USA", b: "NED", when: "Sat 6:00pm", tag: "Group D" },
    { type: "soon",   a: "POR", b: "GER", when: "Sat 9:00pm", tag: "Group F" },
  ];

  // Next-up match cards.
  const NEXTUP = [
    { a: "MEX", b: "CRO", date: "Thu 11 Jun", time: "8:00pm", group: "Group A", venue: "Estadio Azteca", featured: true },
    { a: "ARG", b: "SEN", date: "Fri 12 Jun", time: "5:00pm", group: "Group C", venue: "MetLife Stadium" },
    { a: "USA", b: "NED", date: "Sat 13 Jun", time: "6:00pm", group: "Group D", venue: "SoFi Stadium" },
  ];

  // Kick-off target — opening match of the tournament.
  const KICKOFF = new Date("2026-06-11T20:00:00").getTime();

  function flagCss(t) {
    const team = typeof t === "string" ? TEAMS[t] : t;
    if (!team) return "#ccc";
    const c = team.bands;
    if (team.dir === "v") {
      const step = 100 / c.length;
      const stops = c.map((col, i) => `${col} ${i * step}% ${(i + 1) * step}%`).join(", ");
      return `linear-gradient(90deg, ${stops})`;
    }
    if (team.dir === "cross") {
      return `${c[1]} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='16'%3E%3Crect width='22' height='16' fill='${encodeURIComponent(c[0])}'/%3E%3Crect x='9' width='4' height='16' fill='${encodeURIComponent(c[1])}'/%3E%3Crect y='6' width='22' height='4' fill='${encodeURIComponent(c[1])}'/%3E%3C/svg%3E")`;
    }
    if (team.dir === "centre") {
      return `radial-gradient(circle at 50% 50%, ${c[1]} 0 30%, ${c[0]} 31%)`;
    }
    const step = 100 / c.length;
    const stops = c.map((col, i) => `${col} ${i * step}% ${(i + 1) * step}%`).join(", ");
    return `linear-gradient(180deg, ${stops})`;
  }

  window.WCHQ = { TEAMS, PEOPLE, TICKER, NEXTUP, KICKOFF, flagCss };
})();
