/* Tests for the home-page fixture selectors + BST formatting helpers. The
   selection logic is asserted precisely; locale-formatted strings are checked
   loosely (their exact form depends on the ICU build). */

import { describe, test, expect } from 'vitest';
import type { Fixture } from '../store/types';
import {
  nextUp, latestResults, tickerItems, fixtureToNextUp,
  dayLabel, kickTime, shortWhen,
} from './fixtures';

/* A Fixture builder — sensible defaults, override what a case cares about. */
function fx(over: Partial<Fixture>): Fixture {
  return {
    id: 'x', ts: 0, stage: 'A', label: 'Group A', venue: '',
    a: 'BRA', b: 'ARG', as: null, bs: null, played: false, ...over,
  };
}

const NOW = 1_000_000_000_000; // arbitrary fixed "now" for deterministic tests
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

describe('nextUp', () => {
  test('returns the soonest decided, unplayed fixtures in time order', () => {
    const fixtures = [
      fx({ id: 'c', ts: NOW + 3 * HOUR }),
      fx({ id: 'a', ts: NOW + 1 * HOUR }),
      fx({ id: 'b', ts: NOW + 2 * HOUR }),
    ];
    expect(nextUp(fixtures, NOW, 2).map((f) => f.id)).toEqual(['a', 'b']);
  });

  test('excludes played fixtures', () => {
    const fixtures = [
      fx({ id: 'played', ts: NOW + 1 * HOUR, played: true, as: 1, bs: 0 }),
      fx({ id: 'next', ts: NOW + 2 * HOUR }),
    ];
    expect(nextUp(fixtures, NOW).map((f) => f.id)).toEqual(['next']);
  });

  test('excludes undecided knockout slots (missing a or b)', () => {
    const fixtures = [
      fx({ id: 'tbd', ts: NOW + 1 * HOUR, a: '', b: 'ENG' }),
      fx({ id: 'real', ts: NOW + 2 * HOUR }),
    ];
    expect(nextUp(fixtures, NOW).map((f) => f.id)).toEqual(['real']);
  });

  test('keeps an in-progress game (just kicked off) but drops a stale one', () => {
    const fixtures = [
      fx({ id: 'stale', ts: NOW - DAY }),
      fx({ id: 'live', ts: NOW - 1 * HOUR }),
      fx({ id: 'soon', ts: NOW + 1 * HOUR }),
    ];
    expect(nextUp(fixtures, NOW, 5).map((f) => f.id)).toEqual(['live', 'soon']);
  });

  test('honours the limit', () => {
    const fixtures = [0, 1, 2, 3].map((i) => fx({ id: String(i), ts: NOW + i * HOUR }));
    expect(nextUp(fixtures, NOW, 2)).toHaveLength(2);
  });
});

describe('latestResults', () => {
  test('returns played fixtures, most recent first', () => {
    const fixtures = [
      fx({ id: 'old', ts: NOW - 3 * DAY, played: true, as: 1, bs: 1 }),
      fx({ id: 'new', ts: NOW - 1 * HOUR, played: true, as: 2, bs: 0 }),
      fx({ id: 'mid', ts: NOW - 1 * DAY, played: true, as: 0, bs: 0 }),
    ];
    expect(latestResults(fixtures).map((f) => f.id)).toEqual(['new', 'mid', 'old']);
  });

  test('excludes unplayed fixtures', () => {
    const fixtures = [
      fx({ id: 'upcoming', ts: NOW + 1 * HOUR }),
      fx({ id: 'done', ts: NOW - 1 * HOUR, played: true, as: 3, bs: 1 }),
    ];
    expect(latestResults(fixtures).map((f) => f.id)).toEqual(['done']);
  });

  test('honours the limit', () => {
    const fixtures = [0, 1, 2, 3].map((i) =>
      fx({ id: String(i), ts: NOW - i * HOUR, played: true, as: 1, bs: 0 }));
    expect(latestResults(fixtures, 2)).toHaveLength(2);
  });
});

describe('tickerItems', () => {
  test('builds result + soon entries with the right shapes', () => {
    const fixtures = [
      fx({ id: 'r', ts: NOW - 1 * HOUR, played: true, as: 2, bs: 1, label: 'Group A', a: 'BRA', b: 'ARG' }),
      fx({ id: 's', ts: NOW + 1 * HOUR, label: 'Group B', a: 'ENG', b: 'FRA' }),
    ];
    const items = tickerItems(fixtures, NOW);
    const result = items.find((i) => i.type === 'result');
    const soon = items.find((i) => i.type === 'soon');
    expect(result).toMatchObject({ type: 'result', a: 'BRA', b: 'ARG', as: 2, bs: 1, tag: 'Group A' });
    expect(soon).toMatchObject({ type: 'soon', a: 'ENG', b: 'FRA', tag: 'Group B' });
    expect(typeof (soon as { when: string }).when).toBe('string');
  });

  test('is empty when there are no fixtures', () => {
    expect(tickerItems([], NOW)).toEqual([]);
  });
});

describe('fixtureToNextUp', () => {
  test('maps a fixture onto the NextUpItem the card renders', () => {
    const f = fx({ a: 'BRA', b: 'ARG', label: 'Group C', venue: 'Estadio Azteca', ts: NOW });
    const item = fixtureToNextUp(f);
    expect(item).toMatchObject({ a: 'BRA', b: 'ARG', group: 'Group C', venue: 'Estadio Azteca' });
    expect(typeof item.date).toBe('string');
    expect(typeof item.time).toBe('string');
    expect(item.featured).toBeUndefined();
  });
});

describe('BST formatting helpers', () => {
  // 2026-06-11T12:00:00Z → 13:00 BST, still the 11th.
  const TS = Date.parse('2026-06-11T12:00:00Z');

  test('dayLabel gives a short weekday + day + month', () => {
    const label = dayLabel(TS);
    expect(label).toContain('Jun');
    expect(label).toContain('11');
  });

  test('kickTime gives a 24-hour HH:MM string', () => {
    expect(kickTime(TS)).toMatch(/^\d{2}:\d{2}$/);
  });

  test('shortWhen gives a non-empty compact label', () => {
    expect(shortWhen(TS).length).toBeGreaterThan(0);
  });
});
