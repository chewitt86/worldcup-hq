/* World Cup HQ — MAP page: stage tabs + team/person filters over the
   geographic WorldMap (defined in world-map.tsx). Ported from the prototype's
   home/page-map.jsx. Team display data flows through selectTeams; stage routes,
   team games and knockout ties are derived from the store `results` so saved
   knockout scores drive advancement. */

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../app/context';
import { useStore, selectTeams } from '../store/store';
import { ELIMINATED, oddsNum } from '../data/tournament';
import { strength } from '../lib/bracket';
import {
  VENUES,
  stageRoutes,
  teamGames,
  koGame,
  type MapStage,
  type KoStage,
} from '../data/map';
import { Flag } from '../components/flag';
import { Avatar } from '../components/avatar';
import { PageTitle } from '../components/labels';
import { MatchPopup, type Match } from '../components/match-popup';
import { WorldMap } from '../components/world-map';
import { TeamPopup } from './teams';
import { OwnerIcons } from './groups';

const STAGES: { id: MapStage; label: string }[] = [
  { id: 'Groups', label: '⚽ Groups' },
  { id: 'R32', label: '🎲 Last 32' },
  { id: 'R16', label: '🎲 Last 16' },
  { id: 'QF', label: '🥊 Quarters' },
  { id: 'SF', label: '🔥 Semis' },
  { id: 'F', label: '🏆 Final' },
];

export function MapPage() {
  const app = useApp();
  const people = app.people;
  const wide = app.wide;
  const teams = useStore(selectTeams);
  const results = useStore((s) => s.results);
  const koLive = useStore((s) => s.koLive);
  const [stage, setStage] = useState<MapStage>('Groups');
  const [selected, setSelected] = useState<string | null>(null);
  const [personId, setPersonId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [popup, setPopup] = useState<string | null>(null);
  const [match, setMatch] = useState<Match | null>(null);

  // "View on map" from a team popup elsewhere → land focused on that team
  useEffect(() => {
    if (app.mapFocus) {
      setShowAll(false);
      setPersonId(null);
      setSelected(app.mapFocus);
      app.setMapFocus(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.mapFocus]);

  const sr = useMemo(() => stageRoutes(stage, results, teams, koLive), [stage, results, teams, koLive]);
  const pool = sr.teams.slice().sort((a, b) => oddsNum(a) - oddsNum(b));
  const person = people.find((p) => p.id === personId);
  const chipTeams = person ? person.teams.filter((c) => pool.includes(c)) : pool;

  const shownTeams = showAll ? pool
    : (selected && pool.includes(selected)) ? [selected]
    : person ? chipTeams
    : (stage === 'Groups' ? (pool.includes('BRA') ? ['BRA'] : pool.slice(0, 1)) : pool);

  const switchStage = (id: MapStage) => { setStage(id); setSelected(null); setShowAll(false); setPersonId(null); };
  const onVenue = (vid: string) => { const v = VENUES[vid]; app.ping(`📍 ${v.city}, ${v.host}`); };

  // fixtures strip content
  const single = shownTeams.length === 1 ? shownTeams[0] : null;
  const stripRef = useRef<HTMLDivElement | null>(null);
  // when a team is explicitly picked (chip or map pin), bring its games into view
  useEffect(() => {
    if (!selected || !stripRef.current) return;
    const sc = stripRef.current.closest('.wchq-scroll') as HTMLElement | null;
    if (!sc) return;
    const dy = stripRef.current.getBoundingClientRect().top - sc.getBoundingClientRect().top;
    sc.scrollTop = sc.scrollTop + dy - 90;
  }, [selected, stage]);

  return (
    <Fragment>
      <PageTitle sub="🛫 home → where they actually play · pinch to zoom" accent="var(--blue)">WORLD MAP</PageTitle>

      {/* stage tabs */}
      <div className="noscroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
        {STAGES.map((s) => (
          <div key={s.id} className={'navpill tap' + (stage === s.id ? ' active' : '')}
            style={{ fontSize: 13.5, flex: '0 0 auto' }} onClick={() => switchStage(s.id)}>{s.label}</div>
        ))}
      </div>

      {/* whose teams */}
      <div className="noscroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
        <div className={'navpill tap' + (!personId && !showAll && !selected ? ' active' : '')}
          style={{ fontSize: 12.5, flex: '0 0 auto' }}
          onClick={() => { setPersonId(null); setSelected(null); setShowAll(false); }}>🌍 Default</div>
        <div className={'navpill tap' + (showAll ? ' active' : '')} style={{ fontSize: 12.5, flex: '0 0 auto' }}
          onClick={() => { setShowAll((s) => !s); setSelected(null); setPersonId(null); }}>✨ Show all</div>
        {people.map((p) => (
          <div key={p.id} className={'navpill tap' + (personId === p.id ? ' active' : '')}
            style={{ fontSize: 12.5, flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => { setPersonId(personId === p.id ? null : p.id); setSelected(null); setShowAll(false); }}>
            <Avatar person={p} size={18} ring={false} />{p.name}</div>
        ))}
      </div>

      {/* team chips */}
      <div className="noscroll" style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 2 }}>
        {chipTeams.map((c) => {
          const dead = ELIMINATED.includes(c);
          const on = !showAll && selected === c;
          return (
            <div key={c} className="flagchip tap" style={{ flex: '0 0 auto', opacity: dead ? .6 : 1,
              background: on ? 'var(--sun)' : 'var(--cream)', borderWidth: on ? 3 : 2.5 }}
              onClick={() => { setShowAll(false); setSelected(selected === c ? null : c); }}>
              <Flag code={c} knocked={dead} />{c}</div>
          );
        })}
        {chipTeams.length === 0 && <span style={{ color: 'var(--cream)', fontWeight: 700, fontSize: 13, opacity: .7 }}>
          None of their teams reached this stage 😬</span>}
      </div>

      {/* the map */}
      <div className="sticker" style={{ padding: 6, overflow: 'hidden', height: wide ? '62vh' : '56vh',
        minHeight: 320 }}>
        <WorldMap pool={pool} routeOf={sr.routeOf} shownTeams={shownTeams}
          onTeam={(c) => { setShowAll(false); setPersonId(null); setSelected(c); }}
          onVenue={onVenue} motion={true} />
      </div>

      {/* legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
        {([['USA', '#36a9ff'], ['CANADA', '#ff5d5d'], ['MEXICO', '#46b94a']] as [string, string][]).map(([l, c]) => (
          <span key={l} className="head" style={{ display: 'flex', alignItems: 'center', gap: 6,
            color: 'var(--cream)', fontSize: 12 }}>
            <span style={{ width: 13, height: 13, borderRadius: '50%', background: c, border: '2px solid var(--ink)' }} />{l}</span>
        ))}
        <span className="head" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--cream)', fontSize: 12 }}>
          <span style={{ width: 20, height: 3, background: 'var(--sun)', borderRadius: 2 }} />JOURNEY</span>
      </div>

      {/* fixtures strip */}
      {single ? (
        <div ref={stripRef} className="sticker" style={{ padding: '13px 15px' }}>
          <div className="head" style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Flag code={single} style={{ width: 26, height: 18 }} />{teams[single].name.toUpperCase()}'S GAMES
            <span className="tap pill" onClick={() => setPopup(single)}
              style={{ marginLeft: 'auto', fontSize: 11, fontFamily: 'var(--head)', color: '#fff',
                background: 'var(--blue)', border: '2.5px solid var(--ink)', borderRadius: 999,
                padding: '4px 10px' }}>ⓘ TEAM INFO</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {teamGames(single, stage, results, koLive).map((gm, i) => {
              const resCol = ({ W: 'var(--grass2)', D: 'var(--orange)', L: 'var(--tomato)' } as Record<string, string>)[gm.result ?? ''];
              return (
                <div key={i} className="tap sticker-sm" style={{ background: 'var(--cream)', padding: '9px 12px',
                  display: 'flex', alignItems: 'center', gap: 9 }}
                  onClick={() => setMatch({ a: single, b: gm.opp, label: gm.label, played: gm.played,
                    score: gm.played ? (gm.score as [number, number]) : undefined, date: gm.date ?? undefined,
                    time: gm.time ?? undefined, city: gm.city, host: gm.host,
                    winner: (gm.played ? (gm.result === 'W' ? single : gm.result === 'L' ? gm.opp : null)
                      : (strength(single, teams) >= strength(gm.opp, teams) ? single : gm.opp)) ?? undefined })}>
                  <span style={{ fontSize: 11, fontWeight: 800, opacity: .5, width: 14 }}>v</span>
                  <Flag code={gm.opp} knocked={ELIMINATED.includes(gm.opp)} style={{ width: 28, height: 20 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="head" style={{ fontSize: 14, lineHeight: 1 }}>{teams[gm.opp].name}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, opacity: .6, marginTop: 2,
                      display: 'flex', alignItems: 'center', gap: 4 }}>
                      📍 {gm.city}{gm.date ? ` · ${gm.date}` : ''}</div>
                  </div>
                  <OwnerIcons code={gm.opp} people={people} size={16} max={1} />
                  {gm.played
                    ? <span className="head" style={{ fontSize: 16, color: resCol }}>{gm.score![0]}–{gm.score![1]}</span>
                    : gm.time
                      ? <span className="head" style={{ fontSize: 11, color: 'var(--tomato)' }}>{gm.time} BST</span>
                      : <span className="head" style={{ fontSize: 11, opacity: .5 }}>TBC</span>}
                </div>
              );
            })}
          </div>
        </div>
      ) : stage !== 'Groups' && (
        <div className="sticker" style={{ padding: '13px 15px' }}>
          <div className="head" style={{ fontSize: 15, marginBottom: 10 }}>
            {STAGES.find((s) => s.id === stage)!.label} · PROJECTED TIES</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sr.matches.map((m, i) => {
              const v = VENUES[m.venue!];
              const info = koGame(stage as KoStage, i, results);
              const winner = strength(m.a, teams) >= strength(m.b, teams) ? m.a : m.b;
              return (
                <div key={i} className="sticker-sm tap" onClick={() => setMatch({ a: m.a, b: m.b, label: info.label,
                  played: info.played, score: info.score ?? undefined, date: info.date, time: info.time, city: info.city, host: info.host, winner })}
                  style={{ background: 'var(--cream)', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Flag code={m.a} style={{ width: 24, height: 17 }} />
                  <span className="head" style={{ fontSize: 14 }}>{m.a}</span>
                  <OwnerIcons code={m.a} people={people} size={14} max={1} />
                  <span className="head" style={{ fontSize: 12, color: 'var(--tomato)' }}>v</span>
                  <OwnerIcons code={m.b} people={people} size={14} max={1} />
                  <span className="head" style={{ fontSize: 14 }}>{m.b}</span>
                  <Flag code={m.b} style={{ width: 24, height: 17 }} />
                  <span style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 700, opacity: .65 }}>📍 {v.city}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', color: 'var(--cream)', fontWeight: 700, fontSize: 12.5, opacity: .7 }}>
        Tap a flag pin to open the team · tap a venue pin for the city
      </div>

      {popup && <TeamPopup code={popup} onClose={() => setPopup(null)} onPerson={app.openPerson} />}
      {match && <MatchPopup match={match} people={people} onClose={() => setMatch(null)} />}
    </Fragment>
  );
}

export { STAGES };
