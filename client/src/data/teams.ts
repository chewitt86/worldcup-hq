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
  /* FIFA world ranking (from the real draw) */
  worldRanking?: number;
  /* true if this team is in the "worst" sweepstake pot (vs a "best" team) */
  worst?: boolean;
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
  /* optional resized photo (data URL); shown only on large avatars — small
     avatars always fall back to the coloured initials. */
  photo?: string | null;
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

/* ---- 27 returning nations (codes + bands/dir kept from the prototype;
   odds + tier updated to the real 2026 odds) ---- */
const BASE: Record<string, Team> = {
  BRA: { name: 'Brazil', bands: ['#2fe0c0', '#ffd23f', '#36a9ff'], dir: 'h', tier: 'Contender', odds: '11/1' },
  FRA: { name: 'France', bands: ['#36a9ff', '#fffdf3', '#ff5d5d'], dir: 'v', tier: 'Favourite', odds: '5/1' },
  ARG: { name: 'Argentina', bands: ['#8ad6ff', '#fffdf3', '#8ad6ff'], dir: 'h', tier: 'Contender', odds: '10/1' },
  ENG: { name: 'England', bands: ['#fffdf3', '#ff5d5d'], dir: 'cross', tier: 'Contender', odds: '8/1' },
  ESP: { name: 'Spain', bands: ['#ff5d5d', '#ffd23f', '#ff5d5d'], dir: 'h', tier: 'Favourite', odds: '9/2' },
  GER: { name: 'Germany', bands: ['#1b2a4a', '#ff5d5d', '#ffd23f'], dir: 'h', tier: 'Dark horse', odds: '16/1' },
  POR: { name: 'Portugal', bands: ['#46b94a', '#ff5d5d'], dir: 'v', tier: 'Contender', odds: '10/1' },
  NED: { name: 'Netherlands', bands: ['#ff9f1c', '#fffdf3', '#36a9ff'], dir: 'h', tier: 'Dark horse', odds: '22/1' },
  CRO: { name: 'Croatia', bands: ['#ff5d5d', '#fffdf3', '#36a9ff'], dir: 'h', tier: 'Outsider', odds: '40/1' },
  MAR: { name: 'Morocco', bands: ['#ff5d5d', '#46b94a'], dir: 'v', tier: 'Outsider', odds: '66/1' },
  USA: { name: 'USA', bands: ['#36a9ff', '#fffdf3', '#ff5d5d'], dir: 'h', tier: 'Host', odds: '55/1' },
  MEX: { name: 'Mexico', bands: ['#46b94a', '#fffdf3', '#ff5d5d'], dir: 'v', tier: 'Host', odds: '55/1' },
  CAN: { name: 'Canada', bands: ['#ff5d5d', '#fffdf3', '#ff5d5d'], dir: 'v', tier: 'Host', odds: '80/1' },
  JPN: { name: 'Japan', bands: ['#fffdf3', '#ff5d5d'], dir: 'centre', tier: 'Outsider', odds: '66/1' },
  SEN: { name: 'Senegal', bands: ['#46b94a', '#ffd23f', '#ff5d5d'], dir: 'v', tier: 'Outsider', odds: '66/1' },
  GHA: { name: 'Ghana', bands: ['#ff5d5d', '#ffd23f', '#46b94a'], dir: 'h', tier: 'Longshot', odds: '200/1' },
  BEL: { name: 'Belgium', bands: ['#1b2a4a', '#ffd23f', '#ff5d5d'], dir: 'v', tier: 'Outsider', odds: '45/1' },
  URU: { name: 'Uruguay', bands: ['#8ad6ff', '#fffdf3'], dir: 'h', tier: 'Longshot', odds: '80/1' },
  COL: { name: 'Colombia', bands: ['#ffd23f', '#36a9ff', '#ff5d5d'], dir: 'h', tier: 'Outsider', odds: '50/1' },
  SUI: { name: 'Switzerland', bands: ['#ff5d5d', '#fffdf3'], dir: 'centre', tier: 'Longshot', odds: '80/1' },
  KOR: { name: 'South Korea', bands: ['#fffdf3', '#ff5d5d', '#36a9ff'], dir: 'centre', tier: 'Longshot', odds: '150/1' },
  AUS: { name: 'Australia', bands: ['#1b2a4a', '#36a9ff'], dir: 'h', tier: 'Longshot', odds: '150/1' },
  NOR: { name: 'Norway', bands: ['#ff5d5d', '#fffdf3', '#36a9ff'], dir: 'cross', tier: 'Outsider', odds: '40/1' },
  EGY: { name: 'Egypt', bands: ['#ff5d5d', '#fffdf3', '#1b2a4a'], dir: 'h', tier: 'Longshot', odds: '150/1' },
  ECU: { name: 'Ecuador', bands: ['#ffd23f', '#36a9ff', '#ff5d5d'], dir: 'h', tier: 'Longshot', odds: '100/1' },
  IRN: { name: 'Iran', bands: ['#46b94a', '#fffdf3', '#ff5d5d'], dir: 'h', tier: 'Longshot', odds: '200/1' },
  TUR: { name: 'Türkiye', bands: ['#ff5d5d', '#fffdf3'], dir: 'centre', tier: 'Longshot', odds: '100/1' },
};

/* ---- 21 NEW nations for the real 2026 field. Bands are copyright-safe
   sticker-album colour bands using the project palette. All longshots. ---- */
const EXTRA: Record<string, Team> = {
  RSA: { name: 'South Africa', bands: ['#46b94a', '#ffd23f', '#1b2a4a'], dir: 'h', tier: 'Longshot', odds: '300/1' },
  CZE: { name: 'Czechia', bands: ['#1b2a4a', '#fffdf3', '#ff5d5d'], dir: 'h', tier: 'Longshot', odds: '150/1' },
  QAT: { name: 'Qatar', bands: ['#fffdf3', '#9b6cf0'], dir: 'v', tier: 'Longshot', odds: '250/1' },
  HAI: { name: 'Haiti', bands: ['#36a9ff', '#ff5d5d'], dir: 'h', tier: 'Longshot', odds: '500/1' },
  SCO: { name: 'Scotland', bands: ['#36a9ff', '#fffdf3'], dir: 'cross', tier: 'Longshot', odds: '200/1' },
  CUW: { name: 'Curaçao', bands: ['#36a9ff', '#ffd23f'], dir: 'h', tier: 'Longshot', odds: '500/1' },
  CIV: { name: 'Ivory Coast', bands: ['#ff9f1c', '#fffdf3', '#46b94a'], dir: 'v', tier: 'Longshot', odds: '125/1' },
  TUN: { name: 'Tunisia', bands: ['#ff5d5d', '#fffdf3'], dir: 'centre', tier: 'Longshot', odds: '250/1' },
  NZL: { name: 'New Zealand', bands: ['#1b2a4a', '#ff5d5d'], dir: 'h', tier: 'Longshot', odds: '500/1' },
  CPV: { name: 'Cape Verde', bands: ['#36a9ff', '#fffdf3', '#ff5d5d'], dir: 'h', tier: 'Longshot', odds: '500/1' },
  KSA: { name: 'Saudi Arabia', bands: ['#46b94a', '#fffdf3'], dir: 'h', tier: 'Longshot', odds: '250/1' },
  IRQ: { name: 'Iraq', bands: ['#ff5d5d', '#fffdf3', '#1b2a4a'], dir: 'h', tier: 'Longshot', odds: '350/1' },
  ALG: { name: 'Algeria', bands: ['#46b94a', '#fffdf3'], dir: 'v', tier: 'Longshot', odds: '150/1' },
  JOR: { name: 'Jordan', bands: ['#1b2a4a', '#fffdf3', '#46b94a'], dir: 'h', tier: 'Longshot', odds: '400/1' },
  UZB: { name: 'Uzbekistan', bands: ['#36a9ff', '#fffdf3', '#46b94a'], dir: 'h', tier: 'Longshot', odds: '300/1' },
  PAN: { name: 'Panama', bands: ['#fffdf3', '#ff5d5d', '#36a9ff'], dir: 'h', tier: 'Longshot', odds: '400/1' },
  PAR: { name: 'Paraguay', bands: ['#ff5d5d', '#fffdf3', '#36a9ff'], dir: 'h', tier: 'Longshot', odds: '200/1' },
  AUT: { name: 'Austria', bands: ['#ff5d5d', '#fffdf3', '#ff5d5d'], dir: 'h', tier: 'Longshot', odds: '80/1' },
  SWE: { name: 'Sweden', bands: ['#36a9ff', '#ffd23f'], dir: 'cross', tier: 'Longshot', odds: '80/1' },
  BIH: { name: 'Bosnia & Herzegovina', bands: ['#1b2a4a', '#ffd23f'], dir: 'h', tier: 'Longshot', odds: '250/1' },
  COD: { name: 'DR Congo', bands: ['#36a9ff', '#ff5d5d'], dir: 'h', tier: 'Longshot', odds: '200/1' },
};

/* ---- titles + fun facts (all 48) ---- */
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
  URU: { titles: '2× Winners', fact: 'Tiny nation, enormous footballing heart.' },
  COL: { titles: 'Los Cafeteros', fact: 'They dance every single goal.' },
  SUI: { titles: 'The Nati', fact: 'Reliable as a Swiss watch.' },
  KOR: { titles: 'Taeguk Warriors', fact: 'Never stop running, ever.' },
  AUS: { titles: 'The Socceroos', fact: 'Travel the furthest of anyone!' },
  ECU: { titles: 'La Tri', fact: 'Play half their games up a mountain.' },
  EGY: { titles: 'The Pharaohs', fact: 'Record 7-time African champions.' },
  NOR: { titles: 'Løvene', fact: 'A goal machine leads the line.' },
  TUR: { titles: 'Ay-Yıldızlılar', fact: 'Loud, proud and fearless.' },
  IRN: { titles: 'Team Melli', fact: "Asia's most regular qualifiers." },
  RSA: { titles: 'Bafana Bafana', fact: 'The rainbow nation brings the vuvuzelas!' },
  CZE: { titles: 'Euro 1976 Champs', fact: 'Clever passers from the heart of Europe.' },
  QAT: { titles: 'Asian Champions', fact: 'They hosted the whole World Cup last time!' },
  HAI: { titles: 'Les Grenadiers', fact: 'Back on the big stage after fifty years.' },
  SCO: { titles: 'The Tartan Army', fact: 'The loudest, friendliest fans in kilts.' },
  CUW: { titles: 'Caribbean Boys', fact: 'A tiny island with a huge footballing heart.' },
  CIV: { titles: 'The Elephants', fact: 'African champions who never stop charging.' },
  TUN: { titles: 'Eagles of Carthage', fact: 'Desert warriors with serious team spirit.' },
  NZL: { titles: 'The All Whites', fact: 'They travel further than anyone to play.' },
  CPV: { titles: 'Blue Sharks', fact: 'Ten little islands, one mighty team.' },
  KSA: { titles: 'Green Falcons', fact: 'Famously shocked Argentina back in 2022!' },
  IRQ: { titles: 'Lions of Mesopotamia', fact: 'Asian Cup winners who love to attack.' },
  ALG: { titles: 'Desert Foxes', fact: 'African champions with dazzling footwork.' },
  JOR: { titles: 'The Chivalrous', fact: 'Their very first World Cup — dreams come true!' },
  UZB: { titles: 'The White Wolves', fact: 'Central Asia at their first ever World Cup.' },
  PAN: { titles: 'Los Canaleros', fact: 'The brave boys from the famous canal.' },
  PAR: { titles: 'La Albirroja', fact: 'Red-and-white and ever so hard to beat.' },
  AUT: { titles: 'Das Team', fact: 'Quick, clever football from the Alps.' },
  SWE: { titles: 'Blågult', fact: 'Yellow-and-blue and brilliantly organised.' },
  BIH: { titles: 'Zmajevi', fact: 'The Dragons breathe fire up front.' },
  COD: { titles: 'The Leopards', fact: 'Lightning-fast and full of flair.' },
};

/* ---- FIFA 2026 squad page per team (slug is best-guess; editable in Admin) ---- */
const FIFA_BASE = 'https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/teams/';
const SQUAD_SLUG: Record<string, string> = {
  BRA: 'brazil', FRA: 'france', ARG: 'argentina', ENG: 'england', ESP: 'spain',
  GER: 'germany', POR: 'portugal', NED: 'netherlands', CRO: 'croatia', MAR: 'morocco',
  USA: 'usa', MEX: 'mexico', CAN: 'canada', JPN: 'japan', SEN: 'senegal', GHA: 'ghana',
  BEL: 'belgium', URU: 'uruguay', COL: 'colombia', SUI: 'switzerland',
  KOR: 'korea-republic', AUS: 'australia',
  ECU: 'ecuador', EGY: 'egypt', NOR: 'norway', TUR: 'turkiye', IRN: 'iran',
  RSA: 'south-africa', CZE: 'czechia', QAT: 'qatar', HAI: 'haiti', SCO: 'scotland',
  CUW: 'curacao', CIV: 'ivory-coast', TUN: 'tunisia', NZL: 'new-zealand', CPV: 'cape-verde',
  KSA: 'saudi-arabia', IRQ: 'iraq', ALG: 'algeria', JOR: 'jordan', UZB: 'uzbekistan',
  PAN: 'panama', PAR: 'paraguay', AUT: 'austria', SWE: 'sweden', BIH: 'bosnia-herzegovina',
  COD: 'congo-dr',
};

/* ---- real-draw extras: FIFA world ranking + the "worst" sweepstake pot ---- */
export const RANKING: Record<string, number> = {
  FRA: 1, ESP: 2, ARG: 3, ENG: 4, POR: 5, BRA: 6, NED: 7, MAR: 8, BEL: 9, GER: 10,
  CRO: 11, COL: 13, SEN: 14, MEX: 15, USA: 16, URU: 17, JPN: 18, SUI: 19, IRN: 21,
  TUR: 22, ECU: 23, AUT: 24, KOR: 25, AUS: 27, ALG: 28, EGY: 29, CAN: 30, NOR: 31,
  PAN: 33, CIV: 34, SWE: 38, PAR: 40, CZE: 41, SCO: 43, TUN: 44, COD: 46, UZB: 50,
  QAT: 55, IRQ: 57, RSA: 60, KSA: 61, JOR: 63, BIH: 65, CPV: 69, GHA: 74, CUW: 82,
  HAI: 83, NZL: 85,
};

/* The 24 "worst" teams (one per player); the other 24 are "best". */
export const WORST_TEAMS: string[] = [
  'ALG', 'BIH', 'CPV', 'CAN', 'CIV', 'CUW', 'CZE', 'COD', 'EGY', 'GHA', 'IRQ', 'JOR',
  'NZL', 'NOR', 'PAN', 'PAR', 'KSA', 'SCO', 'RSA', 'SWE', 'TUN', 'UZB', 'HAI', 'QAT',
];
export function isWorst(code: string): boolean {
  return WORST_TEAMS.includes(code);
}

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
    teams[code].worldRanking = RANKING[code];
    teams[code].worst = WORST_TEAMS.includes(code);
  }
  return teams;
}

export const TEAMS: Record<string, Team> = buildTeams();

/* ---- Sweepstake players — the real family draw (24 players × 2 teams = all 48).
   points start at 0; the stronger of each pair is listed first as `best`. ---- */
export const PEOPLE: Person[] = [
  { id: 'auntie-carly', name: 'Auntie Carly', initials: 'AC', colour: '#36a9ff', points: 0, teams: ['NED', 'KSA'], out: [], best: 'NED' },
  { id: 'auntie-marie', name: 'Auntie Marie', initials: 'AM', colour: '#ff5d5d', points: 0, teams: ['USA', 'UZB'], out: [], best: 'USA' },
  { id: 'caley', name: 'Caley', initials: 'CA', colour: '#46b94a', points: 0, teams: ['ENG', 'CPV'], out: [], best: 'ENG' },
  { id: 'charlie', name: 'Charlie', initials: 'CH', colour: '#9b6cf0', points: 0, teams: ['AUT', 'GHA'], out: [], best: 'AUT' },
  { id: 'chloe', name: 'Chloe', initials: 'CL', colour: '#ff9f1c', points: 0, teams: ['IRN', 'SCO'], out: [], best: 'IRN' },
  { id: 'connor', name: 'Connor', initials: 'CO', colour: '#2fe0c0', points: 0, teams: ['KOR', 'BIH'], out: [], best: 'KOR' },
  { id: 'david', name: 'David', initials: 'DA', colour: '#ff8fd0', points: 0, teams: ['URU', 'ALG'], out: [], best: 'URU' },
  { id: 'gary', name: 'Gary', initials: 'GA', colour: '#ffd23f', points: 0, teams: ['SUI', 'CZE'], out: [], best: 'SUI' },
  { id: 'grandad', name: 'Grandad', initials: 'GD', colour: '#8ad6ff', points: 0, teams: ['BEL', 'PAR'], out: [], best: 'BEL' },
  { id: 'grandma', name: 'Grandma', initials: 'GM', colour: '#f0653f', points: 0, teams: ['FRA', 'TUN'], out: [], best: 'FRA' },
  { id: 'jamie', name: 'Jamie', initials: 'JA', colour: '#7e57c2', points: 0, teams: ['ECU', 'NZL'], out: [], best: 'ECU' },
  { id: 'jodie', name: 'Jodie', initials: 'JO', colour: '#26c6da', points: 0, teams: ['CRO', 'EGY'], out: [], best: 'CRO' },
  { id: 'leah', name: 'Leah', initials: 'LH', colour: '#ff9f1c', points: 0, teams: ['JPN', 'COD'], out: [], best: 'JPN' },
  { id: 'leo', name: 'Leo', initials: 'LE', colour: '#36a9ff', points: 0, teams: ['TUR', 'CAN'], out: [], best: 'TUR' },
  { id: 'lou', name: 'Lou', initials: 'LO', colour: '#46b94a', points: 0, teams: ['AUS', 'CUW'], out: [], best: 'AUS' },
  { id: 'michelle', name: 'Michelle', initials: 'MI', colour: '#9b6cf0', points: 0, teams: ['MEX', 'RSA'], out: [], best: 'MEX' },
  { id: 'nana', name: 'Nana', initials: 'NA', colour: '#ff5d5d', points: 0, teams: ['POR', 'SWE'], out: [], best: 'POR' },
  { id: 'nanny-sonia', name: 'Nanny Sonia', initials: 'NS', colour: '#2fe0c0', points: 0, teams: ['SEN', 'IRQ'], out: [], best: 'SEN' },
  { id: 'poppy', name: 'Poppy', initials: 'PO', colour: '#ff8fd0', points: 0, teams: ['ESP', 'PAN'], out: [], best: 'ESP' },
  { id: 'silly-grandad', name: 'Silly Grandad', initials: 'SG', colour: '#ffd23f', points: 0, teams: ['BRA', 'NOR'], out: [], best: 'BRA' },
  { id: 'uncle-james', name: 'Uncle James', initials: 'UJ', colour: '#8ad6ff', points: 0, teams: ['COL', 'CIV'], out: [], best: 'COL' },
  { id: 'uncle-lee', name: 'Uncle Lee', initials: 'UL', colour: '#f0653f', points: 0, teams: ['MAR', 'HAI'], out: [], best: 'MAR' },
  { id: 'uncle-matt', name: 'Uncle Matt', initials: 'UM', colour: '#7e57c2', points: 0, teams: ['ARG', 'QAT'], out: [], best: 'ARG' },
  { id: 'uncle-rich', name: 'Uncle Rich', initials: 'UR', colour: '#26c6da', points: 0, teams: ['GER', 'JOR'], out: [], best: 'GER' },
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
