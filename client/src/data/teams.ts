/* World Cup HQ — teams, people, ticker, next-up and kick-off data.
   Ported from the prototype's data.js + data-tournament.js into one typed module.
   All values, logic and numbers are identical to the prototype. */

export type Dir = 'v' | 'h' | 'cross' | 'centre';

export interface Team {
  name: string;
  bands: string[];
  dir: Dir;
  tier: string;
  odds: string;
  titles?: string;
  fact?: string;
  squad?: string;
}

export interface Person {
  id: string;
  name: string;
  initials: string;
  colour: string;
  points: number;
  teams: string[];
  out: string[];
  best: string;
}

export interface TickerResult {
  type: 'result';
  a: string;
  b: string;
  as: number;
  bs: number;
  tag: string;
}

export interface TickerSoon {
  type: 'soon';
  a: string;
  b: string;
  when: string;
  tag: string;
}

export type TickerItem = TickerResult | TickerSoon;

export interface NextUpItem {
  a: string;
  b: string;
  date: string;
  time: string;
  group: string;
  venue: string;
  featured?: boolean;
}

/* ---- 16 base teams (from data.js) ---- */
const BASE: Record<string, Team> = {
  BRA: { name: 'Brazil', bands: ['#2fe0c0', '#ffd23f', '#36a9ff'], dir: 'h', tier: 'Favourite', odds: '5/1' },
  FRA: { name: 'France', bands: ['#36a9ff', '#fffdf3', '#ff5d5d'], dir: 'v', tier: 'Favourite', odds: '6/1' },
  ARG: { name: 'Argentina', bands: ['#8ad6ff', '#fffdf3', '#8ad6ff'], dir: 'h', tier: 'Favourite', odds: '6/1' },
  ENG: { name: 'England', bands: ['#fffdf3', '#ff5d5d'], dir: 'cross', tier: 'Contender', odds: '8/1' },
  ESP: { name: 'Spain', bands: ['#ff5d5d', '#ffd23f', '#ff5d5d'], dir: 'h', tier: 'Contender', odds: '9/1' },
  GER: { name: 'Germany', bands: ['#1b2a4a', '#ff5d5d', '#ffd23f'], dir: 'h', tier: 'Contender', odds: '10/1' },
  POR: { name: 'Portugal', bands: ['#46b94a', '#ff5d5d'], dir: 'v', tier: 'Contender', odds: '11/1' },
  NED: { name: 'Netherlands', bands: ['#ff9f1c', '#fffdf3', '#36a9ff'], dir: 'h', tier: 'Dark horse', odds: '14/1' },
  CRO: { name: 'Croatia', bands: ['#ff5d5d', '#fffdf3', '#36a9ff'], dir: 'h', tier: 'Dark horse', odds: '22/1' },
  MAR: { name: 'Morocco', bands: ['#ff5d5d', '#46b94a'], dir: 'v', tier: 'Dark horse', odds: '28/1' },
  USA: { name: 'USA', bands: ['#36a9ff', '#fffdf3', '#ff5d5d'], dir: 'h', tier: 'Host', odds: '16/1' },
  MEX: { name: 'Mexico', bands: ['#46b94a', '#fffdf3', '#ff5d5d'], dir: 'v', tier: 'Host', odds: '18/1' },
  CAN: { name: 'Canada', bands: ['#ff5d5d', '#fffdf3', '#ff5d5d'], dir: 'v', tier: 'Host', odds: '40/1' },
  JPN: { name: 'Japan', bands: ['#fffdf3', '#ff5d5d'], dir: 'centre', tier: 'Outsider', odds: '50/1' },
  SEN: { name: 'Senegal', bands: ['#46b94a', '#ffd23f', '#ff5d5d'], dir: 'v', tier: 'Longshot', odds: '66/1' },
  GHA: { name: 'Ghana', bands: ['#ff5d5d', '#ffd23f', '#46b94a'], dir: 'h', tier: 'Longshot', odds: '90/1' },
};

/* ---- 16 EXTRA nations (from data-tournament.js) ---- */
const EXTRA: Record<string, Team> = {
  BEL: { name: 'Belgium', bands: ['#1b2a4a', '#ffd23f', '#ff5d5d'], dir: 'v', tier: 'Contender', odds: '12/1' },
  ITA: { name: 'Italy', bands: ['#46b94a', '#fffdf3', '#ff5d5d'], dir: 'v', tier: 'Contender', odds: '12/1' },
  URU: { name: 'Uruguay', bands: ['#8ad6ff', '#fffdf3'], dir: 'h', tier: 'Dark horse', odds: '16/1' },
  COL: { name: 'Colombia', bands: ['#ffd23f', '#36a9ff', '#ff5d5d'], dir: 'h', tier: 'Dark horse', odds: '20/1' },
  SUI: { name: 'Switzerland', bands: ['#ff5d5d', '#fffdf3'], dir: 'centre', tier: 'Outsider', odds: '40/1' },
  DEN: { name: 'Denmark', bands: ['#ff5d5d', '#fffdf3'], dir: 'cross', tier: 'Dark horse', odds: '33/1' },
  KOR: { name: 'South Korea', bands: ['#fffdf3', '#ff5d5d', '#36a9ff'], dir: 'centre', tier: 'Longshot', odds: '60/1' },
  AUS: { name: 'Australia', bands: ['#1b2a4a', '#36a9ff'], dir: 'h', tier: 'Longshot', odds: '80/1' },
  POL: { name: 'Poland', bands: ['#fffdf3', '#ff5d5d'], dir: 'h', tier: 'Outsider', odds: '50/1' },
  SRB: { name: 'Serbia', bands: ['#ff5d5d', '#36a9ff', '#fffdf3'], dir: 'h', tier: 'Outsider', odds: '50/1' },
  ECU: { name: 'Ecuador', bands: ['#ffd23f', '#36a9ff', '#ff5d5d'], dir: 'h', tier: 'Longshot', odds: '80/1' },
  NGA: { name: 'Nigeria', bands: ['#46b94a', '#fffdf3', '#46b94a'], dir: 'v', tier: 'Longshot', odds: '66/1' },
  EGY: { name: 'Egypt', bands: ['#ff5d5d', '#fffdf3', '#1b2a4a'], dir: 'h', tier: 'Longshot', odds: '90/1' },
  NOR: { name: 'Norway', bands: ['#ff5d5d', '#fffdf3', '#36a9ff'], dir: 'cross', tier: 'Outsider', odds: '40/1' },
  TUR: { name: 'Turkey', bands: ['#ff5d5d', '#fffdf3'], dir: 'centre', tier: 'Outsider', odds: '45/1' },
  IRN: { name: 'Iran', bands: ['#46b94a', '#fffdf3', '#ff5d5d'], dir: 'h', tier: 'Longshot', odds: '100/1' },
};

/* ---- titles + fun facts (all 32) ---- */
export const META: Record<string, { titles: string; fact: string }> = {
  BRA: { titles: '5× Winners', fact: 'Famous for samba football and the golden shirt.' },
  FRA: { titles: '2× Winners', fact: 'Love a stylish, lightning counter-attack.' },
  ARG: { titles: '3× Winners', fact: 'The sky-blue stripes never, ever give up.' },
  ENG: { titles: '1× Winners', fact: "It's coming home… probably… maybe?" },
  ESP: { titles: '1× Winners', fact: 'Pass, pass, pass — then pass again.' },
  GER: { titles: '4× Winners', fact: 'Super organised, like a footballing machine.' },
  POR: { titles: 'Euro Champions', fact: 'Counter-attacks at warp speed.' },
  NED: { titles: '3× Finalists', fact: "Invented 'Total Football' — and the orange kit." },
  CRO: { titles: '2018 Finalists', fact: 'Tiny country, absolutely giant midfield.' },
  MAR: { titles: '2022 Semis', fact: "Africa's record-breaking history makers." },
  USA: { titles: 'Co-Hosts 2026', fact: 'Big home crowds cheering them on!' },
  MEX: { titles: 'Co-Hosts 2026', fact: 'The green wave brings ALL the noise.' },
  CAN: { titles: 'Co-Hosts 2026', fact: 'Their very first home World Cup.' },
  JPN: { titles: 'Samurai Blue', fact: 'Tidy passing and the tidiest fans around.' },
  SEN: { titles: 'Africa Champs', fact: 'The Lions of Teranga love a roar.' },
  GHA: { titles: 'Black Stars', fact: 'Always, always full of flair.' },
  BEL: { titles: 'Red Devils', fact: 'A whole golden generation of stars.' },
  ITA: { titles: '4× Winners', fact: 'Defending is basically an art form.' },
  URU: { titles: '2× Winners', fact: 'Tiny nation, enormous footballing heart.' },
  COL: { titles: 'Los Cafeteros', fact: 'They dance every single goal.' },
  SUI: { titles: 'The Nati', fact: 'Reliable as a Swiss watch.' },
  DEN: { titles: 'Danish Dynamite', fact: "Shock winners of Euro '92." },
  KOR: { titles: 'Taeguk Warriors', fact: 'Never stop running, ever.' },
  AUS: { titles: 'The Socceroos', fact: 'Travel the furthest of anyone!' },
  POL: { titles: 'Biało-czerwoni', fact: 'A proper goal-scoring number 9.' },
  SRB: { titles: 'The Eagles', fact: 'Towering, powerful and direct.' },
  ECU: { titles: 'La Tri', fact: 'Play half their games up a mountain.' },
  NGA: { titles: 'Super Eagles', fact: 'The coolest kits at the whole cup.' },
  EGY: { titles: 'The Pharaohs', fact: 'Record 7-time African champions.' },
  NOR: { titles: 'Løvene', fact: 'A goal machine leads the line.' },
  TUR: { titles: 'Ay-Yıldızlılar', fact: 'Loud, proud and fearless.' },
  IRN: { titles: 'Team Melli', fact: "Asia's most regular qualifiers." },
};

/* ---- FIFA 2026 squad page per team (slug is best-guess; editable in Admin) ---- */
const FIFA_BASE = 'https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/teams/';
const SQUAD_SLUG: Record<string, string> = {
  BRA: 'brazil', FRA: 'france', ARG: 'argentina', ENG: 'england', ESP: 'spain',
  GER: 'germany', POR: 'portugal', NED: 'netherlands', CRO: 'croatia', MAR: 'morocco',
  USA: 'usa', MEX: 'mexico', CAN: 'canada', JPN: 'japan', SEN: 'senegal', GHA: 'ghana',
  BEL: 'belgium', ITA: 'italy', URU: 'uruguay', COL: 'colombia', SUI: 'switzerland',
  DEN: 'denmark', KOR: 'korea-republic', AUS: 'australia', POL: 'poland', SRB: 'serbia',
  ECU: 'ecuador', NGA: 'nigeria', EGY: 'egypt', NOR: 'norway', TUR: 'turkiye', IRN: 'iran',
};

/* Merge base + extra, apply META (titles/fact) and the FIFA squad-URL logic.
   Mirrors the prototype's Object.assign + forEach steps exactly. */
function buildTeams(): Record<string, Team> {
  const teams: Record<string, Team> = {};
  for (const [code, t] of Object.entries({ ...BASE, ...EXTRA })) {
    teams[code] = { ...t };
  }
  for (const code of Object.keys(META)) {
    if (teams[code]) {
      teams[code].titles = META[code].titles;
      teams[code].fact = META[code].fact;
    }
  }
  for (const code of Object.keys(teams)) {
    if (!teams[code].squad) {
      const slug = SQUAD_SLUG[code] || teams[code].name.toLowerCase().replace(/\s+/g, '-');
      teams[code].squad = FIFA_BASE + slug + '/squad';
    }
  }
  return teams;
}

export const TEAMS: Record<string, Team> = buildTeams();

/* ---- Sweepstake players (the family). points = fun score so far. ---- */
export const PEOPLE: Person[] = [
  { id: 'leo', name: 'Leo', initials: 'LE', colour: '#36a9ff', points: 38, teams: ['BRA', 'NED', 'JPN'], out: ['JPN'], best: 'BRA' },
  { id: 'gp', name: 'Grandad', initials: 'GP', colour: '#9b6cf0', points: 34, teams: ['FRA', 'MAR', 'GHA'], out: ['GHA'], best: 'FRA' },
  { id: 'mum', name: 'Mum', initials: 'MU', colour: '#ff8fd0', points: 31, teams: ['ARG', 'USA', 'SEN'], out: [], best: 'ARG' },
  { id: 'dad', name: 'Dad', initials: 'DA', colour: '#ff9f1c', points: 27, teams: ['ESP', 'CRO', 'CAN'], out: ['CAN'], best: 'ESP' },
  { id: 'sam', name: 'Auntie Sam', initials: 'SA', colour: '#2fe0c0', points: 22, teams: ['ENG', 'MEX'], out: [], best: 'ENG' },
  { id: 'rob', name: 'Uncle Rob', initials: 'RO', colour: '#ff5d5d', points: 12, teams: ['GER', 'POR'], out: ['GER', 'POR'], best: 'POR' },
];

/* ---- Match ticker — mix of warm-up results and upcoming kick-offs. ---- */
export const TICKER: TickerItem[] = [
  { type: 'result', a: 'BRA', b: 'JPN', as: 3, bs: 1, tag: 'Warm-up' },
  { type: 'soon', a: 'MEX', b: 'CRO', when: 'Thu 8:00pm', tag: 'Group A' },
  { type: 'result', a: 'FRA', b: 'CAN', as: 2, bs: 0, tag: 'Warm-up' },
  { type: 'soon', a: 'ARG', b: 'SEN', when: 'Fri 5:00pm', tag: 'Group C' },
  { type: 'soon', a: 'ESP', b: 'GHA', when: 'Fri 8:00pm', tag: 'Group H' },
  { type: 'result', a: 'ENG', b: 'MAR', as: 1, bs: 1, tag: 'Warm-up' },
  { type: 'soon', a: 'USA', b: 'NED', when: 'Sat 6:00pm', tag: 'Group D' },
  { type: 'soon', a: 'POR', b: 'GER', when: 'Sat 9:00pm', tag: 'Group F' },
];

/* ---- Next-up match cards. ---- */
export const NEXTUP: NextUpItem[] = [
  { a: 'MEX', b: 'CRO', date: 'Thu 11 Jun', time: '8:00pm', group: 'Group A', venue: 'Estadio Azteca', featured: true },
  { a: 'ARG', b: 'SEN', date: 'Fri 12 Jun', time: '5:00pm', group: 'Group C', venue: 'MetLife Stadium' },
  { a: 'USA', b: 'NED', date: 'Sat 13 Jun', time: '6:00pm', group: 'Group D', venue: 'SoFi Stadium' },
];

/* ---- Kick-off target — opening match of the tournament. ---- */
export const KICKOFF = new Date('2026-06-11T20:00:00').getTime();
