/* World Cup HQ — HOME page (Jumbotron). Content-only; chrome lives in App.
   Ported byte-for-byte from the prototype's home/page-home.jsx (HomeLeaders +
   HomePage). Display data flows through useApp (settings/people/reminders) and
   the shared component library; the Jumbotron drives a live countdown off
   settings.kickoff and fires goalCelebrate() when the big screen is tapped. */

import { useState, useMemo } from 'react';
import { useApp } from '../app/context';
import { useCountdown } from '../components/countdown';
import { Avatar } from '../components/avatar';
import { Ticker } from '../components/ticker';
import { NextUpCard } from '../components/next-up-card';
import { Jumbotron } from '../components/jumbotron';
import { TeamSpotlight } from '../components/team-spotlight';
import { useStore, selectTeams } from '../store/store';
import { computeStandings } from '../data/tournament';
import { buildBracket, deepestRound, ROUND_LABEL } from '../lib/bracket';
import { bestOfWorst, teamPoints, started } from '../lib/scoring';
import { TICKER, NEXTUP, WORST_TEAMS, type Person, type NextUpItem } from '../data/teams';

/* ---------- Live leaders board (tap to expand top-3 ↔ full ranked table) ---------- */
function HomeLeaders({
  people,
  onPerson,
  onOpenSweepstake,
  wide,
}: {
  people: Person[];
  onPerson: (p: Person) => void;
  onOpenSweepstake: () => void;
  wide: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ranked = useMemo(() => [...people].sort((a, b) => b.points - a.points), [people]);
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
              textShadow: '0 0 10px rgba(255,210,63,.6)' }}>{p.points}
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
                <div className="head" style={{ color: '#ffd23f', fontSize: 17 }}>{p.points}</div>
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
  const t = useCountdown(settings.kickoff);
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

  const onReminder = (m: NextUpItem) => {
    const id = `${m.a}-${m.b}`;
    const has = app.reminders.has(id);
    app.toggleReminder(id);
    app.ping(has ? `🔕 Reminder off for ${m.a} v ${m.b}` : `🔔 Reminder set for ${m.a} v ${m.b}!`);
  };

  const LEDTicker = (
    <div style={{ background: '#0a1330', border: '4px solid var(--ink)', borderRadius: 12,
      padding: '9px 0', overflow: 'hidden', boxShadow: 'inset 0 0 18px rgba(255,210,63,.08)',
      display: 'flex', alignItems: 'center' }}>
      <span className="head" style={{ background: '#ff5d5d', color: '#fff', fontSize: 12,
        padding: '5px 10px', margin: '0 8px', borderRadius: 7, flex: '0 0 auto',
        boxShadow: '0 0 10px rgba(255,93,93,.6)' }}>⚽ SCORES</span>
      <div style={{ flex: 1, minWidth: 0 }}><Ticker items={TICKER} led speed={30} /></div>
    </div>
  );

  const jumbo = (
    <div className="tap" title="Tap the big screen!"
      onClick={() => { setPoke((n) => n + 1); app.goalCelebrate(); }}>
      <Jumbotron key={poke} t={t} big={wide} title={settings.title} />
    </div>
  );

  const NextUp = (
    <div style={{ display: mobile ? 'flex' : 'grid', flexDirection: 'column',
      gridTemplateColumns: mobile ? undefined : '1fr 1fr', gap: 14 }}>
      {NEXTUP.slice(0, 2).map((m, i) => (
        <NextUpCard key={i} m={m} reminded={reminders.has(`${m.a}-${m.b}`)} onReminder={onReminder} />
      ))}
    </div>
  );

  const NextUpHeading = (
    <div className="head" style={{ color: '#fff', fontSize: wide ? 20 : 18, letterSpacing: '.5px',
      display: 'flex', alignItems: 'center', gap: 8, textShadow: '0 2px 0 rgba(0,0,0,.3)' }}>⚽ NEXT UP</div>
  );

  if (mobile) {
    return (
      <>
        {jumbo}
        {LEDTicker}
        <HomeLeaders people={people} onPerson={app.openPerson}
          onOpenSweepstake={() => app.go('Sweepstake')} wide={false} />
        {NextUpHeading}
        {NextUp}
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
          <HomeLeaders people={people} onPerson={app.openPerson}
            onOpenSweepstake={() => app.go('Sweepstake')} wide />
          {BestWorst}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {NextUpHeading}
          {NextUp}
        </div>
      </div>
    </>
  );
}
