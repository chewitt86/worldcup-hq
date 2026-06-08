const { test } = require('node:test');
const assert = require('node:assert/strict');
const { teamId, probe, norm, classifyRound } = require('./fetcher');

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
