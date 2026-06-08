const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  teamId, probe, norm, classifyRound,
  allGroupFixtures, normaliseGroupResults,
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
