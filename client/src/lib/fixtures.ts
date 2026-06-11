/* World Cup HQ — home-page fixture selectors + BST formatting (pure, no state).

   The shared board's `fixtures` (real kick-off timestamps / scores / venues,
   supplied by the live feed) are the single source of truth for the schedule.
   These helpers slice that list for the Home page — the next upcoming games, the
   latest results, and the LED ticker — and adapt a Fixture to the NextUpItem the
   card renders. The Schedule page imports the same BST formatters so there is one
   copy of the time logic. */

import type { Fixture } from '../store/types';
import type { NextUpItem, TickerItem } from '../data/teams';

const LONDON = 'Europe/London';

/* An unplayed fixture older than this before `now` is treated as stale data (the
   feed should have marked it played) and dropped from "next up"; anything more
   recent — including a game that has just kicked off — still counts as upcoming. */
const STALE_MS = 6 * 3_600_000;

/* human day, e.g. "Thu 11 Jun" (BST). */
export function dayLabel(ts: number): string {
  return new Date(ts)
    .toLocaleDateString('en-GB', { timeZone: LONDON, weekday: 'short', day: 'numeric', month: 'short' })
    .replace(',', '');
}

/* 24-hour BST kick-off time, e.g. "20:00". */
export function kickTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-GB', {
    timeZone: LONDON, hour: '2-digit', minute: '2-digit',
  });
}

/* compact label for the ticker, e.g. "Thu 8:00pm" (BST). */
export function shortWhen(ts: number): string {
  const day = new Date(ts).toLocaleDateString('en-GB', { timeZone: LONDON, weekday: 'short' });
  const time = new Date(ts)
    .toLocaleTimeString('en-GB', { timeZone: LONDON, hour: 'numeric', minute: '2-digit', hour12: true })
    .replace(/\s+/g, '')
    .toLowerCase();
  return `${day} ${time}`;
}

/* a fixture is "decided" once both sides are known (knockout slots fill late). */
function decided(f: Fixture): boolean {
  return !!f.a && !!f.b;
}

/* The next `n` upcoming games: decided, not played, not stale, soonest first. */
export function nextUp(fixtures: Fixture[], now: number, n = 2): Fixture[] {
  return fixtures
    .filter((f) => decided(f) && !f.played && f.ts >= now - STALE_MS)
    .slice()
    .sort((x, y) => x.ts - y.ts)
    .slice(0, n);
}

/* The most recent `n` finished games, newest first. */
export function latestResults(fixtures: Fixture[], n = 3): Fixture[] {
  return fixtures
    .filter((f) => f.played)
    .slice()
    .sort((x, y) => y.ts - x.ts)
    .slice(0, n);
}

/* LED-ticker entries: recent results interleaved with upcoming kick-offs. */
export function tickerItems(fixtures: Fixture[], now: number): TickerItem[] {
  const results: TickerItem[] = latestResults(fixtures, 4).map((f) => ({
    type: 'result', a: f.a, b: f.b, as: f.as ?? 0, bs: f.bs ?? 0, tag: f.label,
  }));
  const soon: TickerItem[] = nextUp(fixtures, now, 4).map((f) => ({
    type: 'soon', a: f.a, b: f.b, when: shortWhen(f.ts), tag: f.label,
  }));
  const out: TickerItem[] = [];
  for (let i = 0; i < Math.max(results.length, soon.length); i++) {
    if (results[i]) out.push(results[i]);
    if (soon[i]) out.push(soon[i]);
  }
  return out;
}

/* Adapt a Fixture to the NextUpItem the existing card renders. Reminders are
   keyed by the fixture id at the call site, not by this item. */
export function fixtureToNextUp(f: Fixture): NextUpItem {
  return { a: f.a, b: f.b, date: dayLabel(f.ts), time: kickTime(f.ts), group: f.label, venue: f.venue };
}
