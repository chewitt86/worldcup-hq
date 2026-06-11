/* World Cup HQ — HOME page (Jumbotron). Content-only; chrome lives in App.
   Ported byte-for-byte from the prototype's home/page-home.jsx (HomeLeaders +
   HomePage). Display data flows through useApp (settings/people/reminders) and
   the shared component library; the Jumbotron drives a live countdown off
   settings.kickoff and fires goalCelebrate() when the big screen is tapped. */

import { useState, useMemo, type ReactNode } from 'react';
import { useApp } from '../app/context';
import { Avatar } from '../components/avatar';
import { Ticker } from '../components/ticker';
import { NextUpCard } from '../components/next-up-card';
import { ResultCard } from '../components/result-card';
import { Jumbotron } from '../components/jumbotron';
import { TeamSpotlight } from '../components/team-spotlight';
import { useStore, selectTeams } from '../store/store';
import { computeStandings } from '../data/tournament';
import { buildBracket, deepestRound, ROUND_LABEL } from '../lib/bracket';
import { bestOfWorst, teamPoints, started, playerTotal, rankPlayers, type ScoreCtx } from '../lib/scoring';
import { nextUp, latestResults, tickerItems, fixtureToNextUp } from '../lib/fixtures';
import { WORST_TEAMS, type Person } from '../data/teams';
import type { Fixture } from '../store/types';

/* ---------- Live leaders board (tap to expand top-3 ↔ full ranked table) ---------- */
function HomeLeaders({
  people,
  ctx,
  onPerson,
  onOpenSweepstake,
  wide,
}: {
  people: Person[];
  ctx: ScoreCtx;
  onPerson: (p: Person) => void;
  onOpenSweepstake: () => void;
  wide: boolean;
}) {
  const [open, setOpen] = useState(false);
  // Rank + score live from the shared results, so each data sync updates the
  // board (the static Person.points field is never recomputed — see scoring.ts).
  const ranked = useMemo(() => rankPlayers(people, ctx), [people, ctx]);
  const top = ranked.slice(0, 3);
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div style={{ borderRadius: 18, overflow: 'hidden', border: '4px solid var(--ink)',
      boxShadow: '5px 6px 0 rgba(27,42,74,.4)' }}>
      <div className="head tap" onClick={() => setOpen((o) => !o)}
        style={{ background: 'var(--tomato)', color: '#fff', padding: '9px 14px',
          fontSize: 16, letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#fff',
          animation: 'wchq-ledpulse 1.1s infinite', display: 'inline-block' }} />
        LIVE LEADERS
        <span style={{ marginLeft: 'auto', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          {open ? 'TOP 3' : 'ALL ' + people.length}
          <span style={{ display: 'inline-block', transition: 'transform .2s',
            transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
        </span>
      </div>
      <div style={{ display: 'flex', background: '#0c1838' }}>
        {top.map((p, i) => (
          <div key={p.id} className="tap" onClick={() => onPerson(p)}
            style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 5, borderRight: i < 2 ? '2px solid #1b2a4a' : 'none',
              background: i === 0 ? 'rgba(255,210,63,.12)' : 'transparent' }}>
            <div style={{ fontSize: 18 }}>{medals[i]}</div>
            <div className={i === 0 ? 'anim-bob' : ''}><Avatar person={p} size={wide ? 48 : 42} /></div>
            <div className="head" style={{ color: '#fff', fontSize: 13 }}>{p.name}</div>
            <div className="head" style={{ color: '#ffd23f', fontSize: 19,
              textShadow: '0 0 10px rgba(255,210,63,.6)' }}>{playerTotal(p, ctx)}
              <span style={{ fontSize: 9, color: '#7fa8e6' }}> PTS</span></div>
          </div>
        ))}
      </div>
      {open && (
        <div style={{ background: '#0a1330', borderTop: '2px solid #1b2a4a', animation: 'wchq-pop .25s ease-out' }}>
          {ranked.slice(3).map((p, i) => {
            const stillIn = p.teams.length - p.out.length;
            return (
              <div key={p.id} className="tap" onClick={() => onPerson(p)}
                style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 14px',
                  borderTop: '1px solid #16244c' }}>
                <div className="head" style={{ width: 22, textAlign: 'center', fontSize: 16, color: '#7fa8e6' }}>{i + 4}</div>
                <Avatar person={p} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="head" style={{ color: '#fff', fontSize: 14 }}>{p.name}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#7fa8e6', marginTop: 1 }}>
                    ✅ {stillIn} in · ❌ {p.out.length} out</div>
                </div>
                <div className="head" style={{ color: '#ffd23f', fontSize: 17 }}>{playerTotal(p, ctx)}</div>
              </div>
            );
          })}
          <div className="tap head" onClick={onOpenSweepstake}
            style={{ textAlign: 'center', color: '#0c1838', background: 'var(--sun)', padding: '10px',
              fontSize: 14, letterSpacing: '.5px', borderTop: '3px solid var(--ink)' }}>
            SEE FULL SWEEPSTAKE →</div>
        </div>
      )}
    </div>
  );
}

/* ---------- Home page ---------- */
export function HomePage() {
  const app = useApp();
  const { settings, people } = app;
  const wide = app.wide;
  const mobile = !wide;
  const reminders = app.reminders;
  const [poke, setPoke] = useState(0);

  // "Best of the Worst": the worst-pot team furthest in the competition
  const teams = useStore(selectTeams);
  const results = useStore((s) => s.results);
  const koLive = useStore((s) => s.koLive);
  const standings = useMemo(() => computeStandings(results), [results]);
  const bracket = useMemo(() => buildBracket({ results, teams, koLive }), [results, teams, koLive]);
  const ctx = { teams, standings, bracket };
  const isStarted = started(results, settings.kickoff);
  const bowCode = bestOfWorst(WORST_TEAMS, ctx, isStarted);
  const BestWorst = (
    <TeamSpotlight title="🐐 BEST OF THE WORST" accent="var(--mint)" code={bowCode}
      subtitle={bowCode ? `${ROUND_LABEL[deepestRound(bowCode, bracket)]} · ${teamPoints(bowCode, ctx)} pts` : undefined} />
  );

  // Real schedule (live feed) drives Next Up, Latest Results and the ticker.
  const fixtures = useStore((s) => s.fixtures);
  const now = Date.now();
  const upcoming = nextUp(fixtures, now);
  const recent = latestResults(fixtures);
  const tick = tickerItems(fixtures, now);
  const hasFixtures = fixtures.length > 0;

  const onFixtureReminder = (f: Fixture) => {
    const has = app.reminders.has(f.id);
    app.toggleReminder(f.id);
    const nm = (c: string) => teams[c]?.name ?? c;
    app.ping(has ? `🔕 Reminder off for ${nm(f.a)} v ${nm(f.b)}`
      : `🔔 Reminder set for ${nm(f.a)} v ${nm(f.b)}!`);
  };

  const LEDTicker = tick.length ? (
    <div style={{ background: '#0a1330', border: '4px solid var(--ink)', borderRadius: 12,
      padding: '9px 0', overflow: 'hidden', boxShadow: 'inset 0 0 18px rgba(255,210,63,.08)',
      display: 'flex', alignItems: 'center' }}>
      <span className="head" style={{ background: '#ff5d5d', color: '#fff', fontSize: 12,
        padding: '5px 10px', margin: '0 8px', borderRadius: 7, flex: '0 0 auto',
        boxShadow: '0 0 10px rgba(255,93,93,.6)' }}>⚽ SCORES</span>
      <div style={{ flex: 1, minWidth: 0 }}><Ticker items={tick} led speed={30} /></div>
    </div>
  ) : null;

  const jumbo = (
    <div className="tap" title="Tap the big screen!"
      onClick={() => { setPoke((n) => n + 1); app.goalCelebrate(); }}>
      <Jumbotron key={poke} big={wide} title={settings.title} />
    </div>
  );

  const cardsGrid = (children: ReactNode) => (
    <div style={{ display: mobile ? 'flex' : 'grid', flexDirection: 'column',
      gridTemplateColumns: mobile ? undefined : '1fr 1fr', gap: 14 }}>{children}</div>
  );

  const heading = (text: string) => (
    <div className="head" style={{ color: '#fff', fontSize: wide ? 20 : 18, letterSpacing: '.5px',
      display: 'flex', alignItems: 'center', gap: 8, textShadow: '0 2px 0 rgba(0,0,0,.3)' }}>{text}</div>
  );

  const note = (text: string) => (
    <div className="sticker" style={{ padding: '14px', textAlign: 'center' }}>
      <div style={{ fontSize: 13, fontWeight: 700, opacity: .7 }}>{text}</div>
    </div>
  );

  const emptyFixtures = (
    <div className="sticker" style={{ padding: '18px', textAlign: 'center', display: 'flex',
      flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ fontSize: 32 }}>📅</div>
      <div className="head" style={{ fontSize: 16, lineHeight: 1.15 }}>
        Fixtures load once the live feed is connected</div>
      <div style={{ fontSize: 12.5, fontWeight: 700, opacity: .7, maxWidth: 300 }}>
        Connect API-Football in Admin and the next games and latest results show up here.</div>
      <div className="head tap pill" onClick={() => app.go('Admin')} style={{ background: 'var(--sun)',
        color: 'var(--ink)', fontSize: 13, padding: '7px 16px', borderRadius: 999,
        border: '3px solid var(--ink)', boxShadow: '2px 3px 0 rgba(27,42,74,.8)' }}>⚙️ Open Admin</div>
    </div>
  );

  /* Next Up + Latest Results, shared between the mobile stack and the wide column. */
  const fixturesArea = !hasFixtures ? emptyFixtures : (
    <>
      {heading('⚽ NEXT UP')}
      {upcoming.length
        ? cardsGrid(upcoming.map((f) => (
            <NextUpCard key={f.id} m={fixtureToNextUp(f)}
              reminded={reminders.has(f.id)} onReminder={() => onFixtureReminder(f)} />
          )))
        : note('No upcoming matches right now — see the Schedule for the full diary.')}
      {recent.length > 0 && (
        <>
          {heading('🏁 LATEST RESULTS')}
          {cardsGrid(recent.map((f) => <ResultCard key={f.id} f={f} teams={teams} />))}
        </>
      )}
    </>
  );

  if (mobile) {
    return (
      <>
        {jumbo}
        {LEDTicker}
        <HomeLeaders people={people} ctx={ctx} onPerson={app.openPerson}
          onOpenSweepstake={() => app.go('Sweepstake')} wide={false} />
        {fixturesArea}
        {BestWorst}
      </>
    );
  }
  return (
    <>
      {jumbo}
      {LEDTicker}
      <div style={{ display: 'grid', gridTemplateColumns: '.9fr 1.1fr', gap: 24, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <HomeLeaders people={people} ctx={ctx} onPerson={app.openPerson}
            onOpenSweepstake={() => app.go('Sweepstake')} wide />
          {BestWorst}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {fixturesArea}
        </div>
      </div>
    </>
  );
}
