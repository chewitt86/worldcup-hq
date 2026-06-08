const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  teamId, teamCode, probe, norm, classifyRound,
  allGroupFixtures, normaliseGroupResults, normaliseKnockout, normaliseFixtures,
} = require('./fetcher');

/* Build an API-Football-shaped fixture object for the tests. */
function fixture(home, away, hg, ag, { round = 'Group A', short = 'FT' } = {}) {
  return {
    fixture: { status: { short } },
    league: { round },
    teams: { home: { name: home }, away: { name: away } },
    goals: { home: hg, away: ag },
  };
}

/* A richer knockout-shaped fixture: lets a test set timestamp, penalties and the
 * teams.*.winner flag the way API-Football reports them. */
function koFixture(home, away, hg, ag, {
  round = 'Round of 32', short = 'FT', timestamp = 0,
  penHome = null, penAway = null, winner = null,
} = {}) {
  return {
    fixture: { status: { short }, timestamp },
    league: { round },
    teams: {
      home: { name: home, winner: winner === 'home' ? true : winner === 'away' ? false : null },
      away: { name: away, winner: winner === 'away' ? true : winner === 'home' ? false : null },
    },
    goals: { home: hg, away: ag },
    score: { penalty: { home: penHome, away: penAway } },
  };
}

test('teamId resolves an alias (USA -> United States)', () => {
  assert.notEqual(teamId('USA'), null);
  assert.equal(teamId('USA'), teamId('United States'));
});

test('teamId resolves an alias (Korea Republic -> South Korea)', () => {
  assert.notEqual(teamId('Korea Republic'), null);
  assert.equal(teamId('Korea Republic'), teamId('South Korea'));
});

test('teamId returns null for an unknown name', () => {
  assert.equal(teamId('Atlantis'), null);
});

test('norm strips accents and punctuation', () => {
  assert.equal(norm('Türkiye'), 'turkiye');
  assert.equal(norm('Bosnia & Herz.'), 'bosnia and herz');
});

test('classifyRound maps feed rounds to our stages', () => {
  assert.equal(classifyRound('Group A'), 'group');
  assert.equal(classifyRound('Round of 32'), 'R32');
  assert.equal(classifyRound('Quarter-finals'), 'QF');
  assert.equal(classifyRound('Final'), 'Final');
});

test('probe with no key returns a clean failure', async () => {
  const res = await probe({ name: 'API-Football', baseUrl: 'https://example.com', authHeader: 'x-key' });
  assert.equal(res.ok, false);
  assert.equal(typeof res.reason, 'string');
  assert.ok(res.reason.length > 0);
});

test('fetchLive with no key returns a clean failure', async () => {
  const { fetchLive } = require('./fetcher');
  const res = await fetchLive({ name: 'API-Football', baseUrl: 'https://example.com' });
  assert.equal(res.ok, false);
  assert.equal(typeof res.reason, 'string');
});

/* ----------------------------- group model -------------------------------- */

test('allGroupFixtures yields 72 fixtures with the round-robin draw order', () => {
  const fx = allGroupFixtures();
  assert.equal(fx.length, 72); // 12 groups × 6 round-robin matches
  const a0 = fx.find((f) => f.key === 'A:0');
  assert.deepEqual([a0.aName, a0.bName], ['Mexico', 'South Africa']);
  const a4 = fx.find((f) => f.key === 'A:4');
  assert.deepEqual([a4.aName, a4.bName], ['Mexico', 'Czechia']); // RR[4] = [0,3]
});

/* --------------------------- normaliseGroupResults ------------------------ */

test('normaliseGroupResults maps a finished group game to its <group>:<index> key', () => {
  const { results, applied } = normaliseGroupResults([
    fixture('Mexico', 'South Africa', 2, 1),
  ]);
  assert.deepEqual(results['A:0'], { score: [2, 1], played: true });
  assert.deepEqual(applied, ['A:0']);
});

test('normaliseGroupResults orients the score to the fixture (aName,bName) order', () => {
  // Feed lists South Africa as home, but A:0 is Mexico(a) v South Africa(b),
  // so a 0-3 home result must become score [3, 0] for (Mexico, South Africa).
  const { results } = normaliseGroupResults([
    fixture('South Africa', 'Mexico', 0, 3, { round: 'Group A' }),
  ]);
  assert.deepEqual(results['A:0'], { score: [3, 0], played: true });
});

test('normaliseGroupResults resolves tricky feed names via aliases', () => {
  const { results } = normaliseGroupResults([
    fixture('Korea Republic', 'Czech Republic', 1, 1, { round: 'Group A' }), // A:1
    fixture('USA', 'Turkey', 2, 0, { round: 'Group D' }),                    // D:4
    fixture('Bosnia and Herzegovina', 'Canada', 0, 0, { round: 'Group B' }), // B:0 (reversed)
    fixture('IR Iran', 'New Zealand', 3, 1, { round: 'Group G' }),           // G:1
  ]);
  assert.deepEqual(results['A:1'], { score: [1, 1], played: true }); // S.Korea v Czechia
  assert.deepEqual(results['D:4'], { score: [2, 0], played: true }); // USA v Türkiye
  assert.deepEqual(results['B:0'], { score: [0, 0], played: true }); // Canada v Bosnia, oriented
  // Group G [Belgium, Egypt, Iran, New Zealand]; Iran(2) v New Zealand(3) = G:1.
  assert.deepEqual(results['G:1'], { score: [3, 1], played: true });
});

test('normaliseGroupResults skips knockout + unfinished games and reports unmatched', () => {
  const { results, applied, unmatched } = normaliseGroupResults([
    fixture('Mexico', 'South Africa', 1, 0, { round: 'Round of 32' }), // knockout → skip
    fixture('Mexico', 'South Korea', 1, 0, { short: 'NS' }),            // not finished → skip
    fixture('Atlantis', 'Mexico', 2, 2, { round: 'Group A' }),          // unknown team
  ]);
  assert.deepEqual(applied, []);
  assert.equal(Object.keys(results).length, 0);
  assert.ok(unmatched.includes('Atlantis'));
});

/* ------------------------------- team codes ------------------------------- */

test('teamCode maps a feed name (and alias) to our 3-letter code', () => {
  assert.equal(teamCode('Brazil'), 'BRA');
  assert.equal(teamCode('Korea Republic'), 'KOR'); // alias → South Korea → KOR
  assert.equal(teamCode('USA'), 'USA');
  assert.equal(teamCode('Atlantis'), null);
});

/* ----------------------------- normaliseKnockout -------------------------- */

test('normaliseKnockout maps a played R32 tie to codes/scores/played', () => {
  const ko = normaliseKnockout([
    koFixture('Brazil', 'Morocco', 2, 1, { round: 'Round of 32', timestamp: 100 }),
  ]);
  assert.deepEqual(ko.R32, [{ a: 'BRA', b: 'MAR', as: 2, bs: 1, played: true, pen: null }]);
  // rounds with no ties are omitted entirely
  assert.equal(ko.R16, undefined);
  assert.equal(ko.QF, undefined);
});

test('normaliseKnockout records a penalty winner from score.penalty', () => {
  const ko = normaliseKnockout([
    koFixture('Spain', 'France', 1, 1, { round: 'Round of 16', penHome: 4, penAway: 2 }),
  ]);
  assert.deepEqual(ko.R16, [{ a: 'ESP', b: 'FRA', as: 1, bs: 1, played: true, pen: 'ESP' }]);
});

test('normaliseKnockout falls back to a teams.*.winner flag for penalties', () => {
  const ko = normaliseKnockout([
    // a drawn, finished tie with no penalty score, but the away side flagged winner
    koFixture('Germany', 'England', 0, 0, { round: 'Quarter-finals', winner: 'away' }),
  ]);
  assert.deepEqual(ko.QF, [{ a: 'GER', b: 'ENG', as: 0, bs: 0, played: true, pen: 'ENG' }]);
});

test('normaliseKnockout keeps an unplayed SF with null scores', () => {
  const ko = normaliseKnockout([
    koFixture('Argentina', 'Portugal', null, null, { round: 'Semi-finals', short: 'NS' }),
  ]);
  assert.deepEqual(ko.SF, [{ a: 'ARG', b: 'POR', as: null, bs: null, played: false, pen: null }]);
});

test('normaliseKnockout orders each round by fixture timestamp', () => {
  const ko = normaliseKnockout([
    koFixture('Brazil', 'Morocco', 1, 0, { round: 'Round of 32', timestamp: 300 }),
    koFixture('Spain', 'France', 2, 0, { round: 'Round of 32', timestamp: 100 }),
    koFixture('England', 'Croatia', 3, 1, { round: 'Round of 32', timestamp: 200 }),
  ]);
  assert.deepEqual(ko.R32.map((t) => t.a), ['ESP', 'ENG', 'BRA']);
});

test('normaliseKnockout returns null when there are no knockout ties', () => {
  assert.equal(normaliseKnockout([fixture('Mexico', 'South Africa', 2, 1)]), null);
  assert.equal(normaliseKnockout([]), null);
  // 3rd-place is ignored for now
  assert.equal(
    normaliseKnockout([koFixture('Brazil', 'Spain', 1, 0, { round: '3rd Place Final' })]),
    null,
  );
});

/* ----------------------------- normaliseFixtures ------------------------- */

/* A full-schedule-shaped fixture: id, timestamp (seconds), venue + status. */
function schedFixture({
  id, home, away, hg = null, ag = null, round = 'Group A',
  short = 'NS', timestamp = 0, city = '', name = '',
}) {
  return {
    fixture: { id, timestamp, status: { short }, venue: { city, name } },
    league: { round },
    teams: { home: { name: home }, away: { name: away } },
    goals: { home: hg, away: ag },
  };
}

test('normaliseFixtures maps a finished group game to a Fixture', () => {
  const [fx] = normaliseFixtures([
    schedFixture({ id: 11, home: 'Mexico', away: 'South Africa', hg: 2, ag: 1, round: 'Group A', short: 'FT', timestamp: 1000, city: 'Mexico City' }),
  ]);
  assert.deepEqual(fx, {
    id: '11', ts: 1000000, stage: 'A', label: 'Group A', venue: 'Mexico City',
    a: 'MEX', b: 'RSA', as: 2, bs: 1, played: true,
  });
});

test('normaliseFixtures keeps an upcoming group game with null scores, played:false', () => {
  const [fx] = normaliseFixtures([
    schedFixture({ id: 22, home: 'Canada', away: 'Switzerland', round: 'Group B', short: 'NS', timestamp: 2000, city: 'Toronto' }),
  ]);
  assert.deepEqual(fx, {
    id: '22', ts: 2000000, stage: 'B', label: 'Group B', venue: 'Toronto',
    a: 'CAN', b: 'SUI', as: null, bs: null, played: false,
  });
});

test('normaliseFixtures uses "" for an undecided knockout side (TBD)', () => {
  const [fx] = normaliseFixtures([
    schedFixture({ id: 33, home: 'Brazil', away: 'Winner Group X', round: 'Round of 32', short: 'NS', timestamp: 500, city: 'New York' }),
  ]);
  assert.deepEqual(fx, {
    id: '33', ts: 500000, stage: 'R32', label: 'Round of 32', venue: 'New York',
    a: 'BRA', b: '', as: null, bs: null, played: false,
  });
});

test('normaliseFixtures returns a mixed schedule sorted by ts ascending', () => {
  const fixtures = normaliseFixtures([
    schedFixture({ id: 22, home: 'Canada', away: 'Switzerland', round: 'Group B', short: 'NS', timestamp: 2000, city: 'Toronto' }),
    schedFixture({ id: 11, home: 'Mexico', away: 'South Africa', hg: 2, ag: 1, round: 'Group A', short: 'FT', timestamp: 1000, city: 'Mexico City' }),
    schedFixture({ id: 33, home: 'Brazil', away: 'Winner Group X', round: 'Round of 32', short: 'NS', timestamp: 500, city: 'New York' }),
  ]);
  assert.deepEqual(fixtures.map((f) => f.id), ['33', '11', '22']);
  assert.deepEqual(fixtures.map((f) => f.ts), [500000, 1000000, 2000000]);
  assert.deepEqual(fixtures.map((f) => f.stage), ['R32', 'A', 'B']);
});

test('normaliseFixtures falls back to venue.name when no city, and Date.parse when no timestamp', () => {
  const [fx] = normaliseFixtures([
    {
      fixture: { id: 44, date: '2026-06-12T19:00:00+00:00', status: { short: 'NS' }, venue: { name: 'MetLife Stadium' } },
      league: { round: 'Final' },
      teams: { home: { name: 'Argentina' }, away: { name: 'France' } },
      goals: { home: null, away: null },
    },
  ]);
  assert.equal(fx.venue, 'MetLife Stadium');
  assert.equal(fx.stage, 'Final');
  assert.equal(fx.label, 'Final');
  assert.equal(fx.ts, Date.parse('2026-06-12T19:00:00+00:00'));
  assert.deepEqual([fx.a, fx.b], ['ARG', 'FRA']);
});

test('normaliseFixtures returns [] when there are no placeable fixtures', () => {
  assert.deepEqual(normaliseFixtures([]), []);
  assert.deepEqual(normaliseFixtures(null), []);
  // an unclassifiable round can't be placed on the schedule
  assert.deepEqual(normaliseFixtures([schedFixture({ id: 9, home: 'Brazil', away: 'Spain', round: 'Friendly' })]), []);
});

test('group and knockout normalise independently from the same response', () => {
  const response = [
    fixture('Mexico', 'South Africa', 2, 1, { round: 'Group A' }),
    koFixture('Brazil', 'Morocco', 3, 0, { round: 'Round of 32', timestamp: 10 }),
  ];
  // group normaliser sees only the group game…
  const { results, applied } = normaliseGroupResults(response);
  assert.deepEqual(applied, ['A:0']);
  assert.deepEqual(results['A:0'], { score: [2, 1], played: true });
  // …and the knockout normaliser sees only the KO tie.
  const ko = normaliseKnockout(response);
  assert.deepEqual(Object.keys(ko), ['R32']);
  assert.deepEqual(ko.R32[0], { a: 'BRA', b: 'MAR', as: 3, bs: 0, played: true, pen: null });
});
