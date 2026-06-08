/* World Cup HQ — SCHEDULE page: a day-by-day diary of the whole tournament.
   Reads feed-supplied fixtures from the store (AppState.fixtures) and groups them
   by calendar day in BST (Europe/London), with a filter pill row (All / Upcoming
   / Results / My players). Each fixture is a sticker-sm row showing the round, the
   BST kick-off time, the venue city, flag-VS-flag with team names, the score (if
   played, winner highlighted) or the kick-off time (if upcoming), the two owners'
   avatars, and a 🔔 Remind me toggle for upcoming games. Tapping a row opens the
   shared MatchPopup. When no fixtures are loaded, a friendly empty state nudges to
   Admin and previews the known group matchups from GROUP_FIXTURES. */

import { useMemo, useState, type MouseEvent } from 'react';
import { useApp } from '../app/context';
import { useStore, selectTeams } from '../store/store';
import type { Fixture } from '../store/types';
import { GROUPS, GROUP_FIXTURES, backers } from '../data/tournament';
import type { Person, Team } from '../data/teams';
import { Flag } from '../components/flag';
import { Avatar } from '../components/avatar';
import { PageTitle } from '../components/labels';
import { MatchPopup, type Match } from '../components/match-popup';

const LONDON = 'Europe/London';

/* a stable sort key for the calendar day a fixture falls on (BST). */
function dayKey(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', {
    timeZone: LONDON, year: 'numeric', month: '2-digit', day: '2-digit',
  });
}

/* human day header, e.g. "Thu 11 Jun". */
function dayLabel(ts: number): string {
  return new Date(ts)
    .toLocaleDateString('en-GB', { timeZone: LONDON, weekday: 'short', day: 'numeric', month: 'short' })
    .replace(',', '');
}

/* BST kick-off time, e.g. "20:00". */
function kickTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-GB', {
    timeZone: LONDON, hour: '2-digit', minute: '2-digit',
  });
}

type FilterId = 'all' | 'upcoming' | 'results' | 'mine';
const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'results', label: 'Results' },
  { id: 'mine', label: 'My players' },
];

/* Stacked owner avatars for one team (mirrors the per-page helper used elsewhere). */
function OwnerIcons({ code, people, size = 15, max = 2 }: {
  code: string; people: Person[]; size?: number; max?: number;
}) {
  if (!code) return null;
  const list = backers(code, people);
  if (!list.length) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', flex: '0 0 auto' }}>
      {list.slice(0, max).map((p, i) => (
        <div key={p.id} style={{ marginLeft: i ? -6 : 0 }} title={p.name}>
          <Avatar person={p} size={size} ring={false} />
        </div>
      ))}
      {list.length > max && (
        <span className="head" style={{ marginLeft: 2, fontSize: 9, color: 'var(--ink-soft)' }}>+{list.length - max}</span>
      )}
    </div>
  );
}

/* One side of a fixture: flag + code + owners (or a neutral TBD slot). */
function TeamSide({ code, teams, people, win, align }: {
  code: string; teams: Record<string, Team>; people: Person[]; win: boolean; align: 'left' | 'right';
}) {
  const right = align === 'right';
  const name = code ? (teams[code]?.name ?? code) : 'TBD';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 0,
      flexDirection: right ? 'row-reverse' : 'row', justifyContent: right ? 'flex-start' : 'flex-start' }}>
      {code ? (
        <Flag code={code} style={{ width: 28, height: 20, borderRadius: 4, flex: '0 0 auto' }} />
      ) : (
        <span className="head" style={{ width: 28, height: 20, borderRadius: 4, flex: '0 0 auto',
          background: 'var(--cream2)', border: '2px solid var(--ink)', fontSize: 11,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>?</span>
      )}
      <span className="head" style={{ fontSize: 14, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis',
        whiteSpace: 'nowrap', opacity: win ? 1 : code ? 0.92 : 0.55 }}>
        {name}
      </span>
      <OwnerIcons code={code} people={people} size={14} max={1} />
    </div>
  );
}

/* A single diary row for one fixture. */
function FixtureRow({ f, teams, people, onMatch }: {
  f: Fixture; teams: Record<string, Team>; people: Person[]; onMatch: (m: Match) => void;
}) {
  const app = useApp();
  const decided = !!f.a && !!f.b;
  const aWin = f.played && f.as != null && f.bs != null && f.as > f.bs;
  const bWin = f.played && f.as != null && f.bs != null && f.bs > f.as;
  const isReminded = app.reminders.has(f.id);

  const openPopup = () => {
    if (!decided) return; // MatchPopup can't render an undecided (TBD) tie
    const score: [number, number] | undefined =
      f.played && f.as != null && f.bs != null ? [f.as, f.bs] : undefined;
    onMatch({
      a: f.a, b: f.b, label: f.label, played: f.played, score,
      date: dayLabel(f.ts), time: kickTime(f.ts), city: f.venue || undefined,
      winner: aWin ? f.a : bWin ? f.b : undefined,
    });
  };

  const toggleRemind = (e: MouseEvent) => {
    e.stopPropagation();
    const has = app.reminders.has(f.id);
    app.toggleReminder(f.id);
    const name = (c: string) => (c ? (teams[c]?.name ?? c) : 'TBD');
    app.ping(has ? `🔕 Reminder off for ${name(f.a)} v ${name(f.b)}`
      : `🔔 Reminder set for ${name(f.a)} v ${name(f.b)}!`);
  };

  return (
    <div className={'sticker-sm' + (decided ? ' tap' : '')} onClick={openPopup}
      style={{ background: 'var(--cream)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* header: round chip + score/time badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="head" style={{ background: f.played ? 'var(--grass)' : 'var(--grape)', color: '#fff',
          fontSize: 11, padding: '3px 10px', borderRadius: 999, border: '2px solid var(--ink)', whiteSpace: 'nowrap' }}>
          {f.label}
        </span>
        <span style={{ marginLeft: 'auto' }}>
          {f.played && f.as != null && f.bs != null ? (
            <span className="head" style={{ fontSize: 18, color: 'var(--ink)' }}>{f.as}–{f.bs}</span>
          ) : (
            <span className="head" style={{ fontSize: 14, color: 'var(--ink)' }}>
              {kickTime(f.ts)}<span style={{ color: 'var(--tomato)', fontSize: 11 }}> BST</span>
            </span>
          )}
        </span>
      </div>

      {/* teams */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <TeamSide code={f.a} teams={teams} people={people} win={aWin} align="left" />
        <span className="head" style={{ fontSize: 13, color: 'var(--tomato)', flex: '0 0 auto' }}>
          {f.played ? '·' : 'v'}
        </span>
        <TeamSide code={f.b} teams={teams} people={people} win={bWin} align="right" />
      </div>

      {/* footer: venue + remind toggle (upcoming only) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {f.venue && (
          <span style={{ fontSize: 11.5, fontWeight: 700, opacity: 0.6, minWidth: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {f.venue}</span>
        )}
        {!f.played && (
          <div className="tap" onClick={toggleRemind} style={{ marginLeft: 'auto', fontFamily: 'var(--head)',
            fontSize: 11, background: isReminded ? 'var(--grass)' : 'var(--sun)', border: '2.5px solid var(--ink)',
            borderRadius: 999, padding: '4px 11px', boxShadow: '2px 2px 0 rgba(27,42,74,.8)', whiteSpace: 'nowrap' }}>
            {isReminded ? '✅ Reminded' : '🔔 Remind me'}
          </div>
        )}
      </div>
    </div>
  );
}

/* The empty state: a nudge to Admin + a preview of the known group matchups. */
function EmptyState({ teams }: { teams: Record<string, Team> }) {
  const app = useApp();
  return (
    <>
      <div className="sticker" style={{ padding: '20px 18px', textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 40 }}>📅</div>
        <div className="head" style={{ fontSize: 19, lineHeight: 1.1 }}>
          Connect API-Football in Admin to see the full schedule
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.7, maxWidth: 320 }}>
          Once a feed is connected, every match appears here as a day-by-day diary with
          kick-off times and live scores.
        </div>
        <div className="head tap" onClick={() => app.go('Admin')} style={{ background: 'var(--sun)',
          color: 'var(--ink)', fontSize: 14, padding: '8px 18px', borderRadius: 999,
          border: '3px solid var(--ink)', boxShadow: '2px 3px 0 rgba(27,42,74,.8)' }}>
          ⚙️ Open Admin
        </div>
      </div>

      <div className="head" style={{ color: 'var(--cream)', fontSize: 16, marginTop: 4,
        textShadow: '0 2px 0 rgba(0,0,0,.3)' }}>SNEAK PEEK · GROUP MATCH-UPS</div>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: app.wide ? '1fr 1fr' : '1fr' }}>
        {Object.keys(GROUPS).map((g) => (
          <div key={g} className="sticker-sm" style={{ background: 'var(--cream)', padding: '10px 12px' }}>
            <div className="head" style={{ fontSize: 14, marginBottom: 8 }}>Group {g}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {GROUP_FIXTURES[g].map((fx) => (
                <div key={fx.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700 }}>
                  <Flag code={fx.a} style={{ width: 22, height: 15, borderRadius: 3, flex: '0 0 auto' }} />
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {teams[fx.a]?.name ?? fx.a}</span>
                  <span style={{ color: 'var(--tomato)', fontFamily: 'var(--head)', flex: '0 0 auto' }}>v</span>
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {teams[fx.b]?.name ?? fx.b}</span>
                  <Flag code={fx.b} style={{ width: 22, height: 15, borderRadius: 3, flex: '0 0 auto', marginLeft: 'auto' }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function SchedulePage() {
  const app = useApp();
  const wide = app.wide;
  const people = app.people;
  const teams = useStore(selectTeams);
  const fixtures = useStore((s) => s.fixtures);
  const [filter, setFilter] = useState<FilterId>('all');
  const [match, setMatch] = useState<Match | null>(null);

  /* codes any sweepstake player owns — for the "My players" filter. */
  const owned = useMemo(() => new Set(people.flatMap((p) => p.teams)), [people]);

  /* filter, then group by calendar day (BST), keeping days + rows in time order. */
  const days = useMemo(() => {
    const pass = (f: Fixture) => {
      if (filter === 'upcoming') return !f.played;
      if (filter === 'results') return f.played;
      if (filter === 'mine') return owned.has(f.a) || owned.has(f.b);
      return true;
    };
    const list = fixtures.filter(pass).slice().sort((x, y) => x.ts - y.ts);
    const order: string[] = [];
    const byDay = new Map<string, Fixture[]>();
    for (const f of list) {
      const key = dayKey(f.ts);
      let bucket = byDay.get(key);
      if (!bucket) { bucket = []; byDay.set(key, bucket); order.push(key); }
      bucket.push(f);
    }
    return order.map((key) => ({ key, label: dayLabel(byDay.get(key)![0].ts), rows: byDay.get(key)! }));
  }, [fixtures, filter, owned]);

  const total = fixtures.length;
  const shown = days.reduce((n, d) => n + d.rows.length, 0);
  const sub = total === 0 ? 'No fixtures yet'
    : filter === 'all' ? `${total} matches`
    : `${shown} of ${total} matches`;

  return (
    <>
      <PageTitle sub={sub} accent="var(--blue)">SCHEDULE</PageTitle>

      {total === 0 ? (
        <EmptyState teams={teams} />
      ) : (
        <>
          {/* filter pills */}
          <div className="noscroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '2px 0' }}>
            {FILTERS.map((fl) => (
              <div key={fl.id} className={'navpill tap' + (fl.id === filter ? ' active' : '')}
                onClick={() => setFilter(fl.id)} style={{ flex: '0 0 auto' }}>{fl.label}</div>
            ))}
          </div>

          {shown === 0 ? (
            <div className="sticker" style={{ padding: '18px', textAlign: 'center' }}>
              <div className="head" style={{ fontSize: 16 }}>Nothing here yet</div>
              <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.7, marginTop: 6 }}>
                No matches match this filter. Try “All”.
              </div>
            </div>
          ) : (
            days.map((d) => (
              <div key={d.key} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="head" style={{ display: 'inline-flex', alignSelf: 'flex-start',
                  alignItems: 'center', gap: 8, background: 'var(--ink)', color: 'var(--cream)',
                  fontSize: 14, padding: '5px 14px', borderRadius: 999, border: '3px solid var(--ink)',
                  boxShadow: '2px 3px 0 rgba(27,42,74,.5)' }}>
                  📅 {d.label}
                  <span style={{ fontSize: 11, opacity: 0.7 }}>{d.rows.length}</span>
                </div>
                <div style={{ display: 'grid', gap: 10, gridTemplateColumns: wide ? '1fr 1fr' : '1fr' }}>
                  {d.rows.map((f) => (
                    <FixtureRow key={f.id} f={f} teams={teams} people={people} onMatch={setMatch} />
                  ))}
                </div>
              </div>
            ))
          )}
        </>
      )}

      {match && (
        <MatchPopup match={match} people={people} onClose={() => setMatch(null)} />
      )}
    </>
  );
}
