/* World Cup HQ — App shell: router, shared chrome, context provider.
   Ported byte-for-byte from the prototype's home/app.jsx. The shell wires the
   WCHQContext value from the store (settings/people) plus local UI state
   (toast/person/confetti/goal/adminAuthed) and persisted reminders, then renders
   the dark backdrop, confetti, goal flash, top nav, the current page, Wobbles the
   mascot, the toast and the person popup. The built pages are wired into the
   registry; Map/Admin fall back to a playful "still building" toast. */

import { useState, useEffect, useRef, type FC } from 'react';
import { WCHQContext, type AppContextValue } from './app/context';
import { useWide, useReminders } from './app/shell-hooks';
import { useStore } from './store/store';
import { Backdrop } from './components/backdrop';
import { Confetti } from './components/confetti';
import { Toast } from './components/toast';
import { PersonPopup } from './components/person-popup';
import { TopNav } from './components/top-nav';
import { Wobbles, type WobblesMood } from './components/mascot';
import { KeepyUppy } from './components/keepy-uppy';
import type { Person } from './data/teams';
import { HomePage } from './pages/home';
import { SchedulePage } from './pages/schedule';
import { SweepstakePage } from './pages/sweepstake';
import { TeamsPage, TeamPopup } from './pages/teams';
import { GroupsPage } from './pages/groups';
import { KnockoutPage } from './pages/knockout';
import { MapPage } from './pages/map';
import { AdminPage } from './pages/admin';

/* ----- Wobbles, the mascot ----- */
const CHEERS = ['GOAAAL! ⚽', "Let's gooo!", 'Up the family!', 'Wheee! 🎉',
  "Who's winning?!", 'Boing! 🏆', "C'mon Leo!", 'Sticker-tastic!', 'Wobble wobble!',
  'Top bins! 🥅', 'Back of the net!', 'Nutmeg! 😎', 'To the final! 🏆', 'Yesss! 🙌',
  'Olé olé! 💃', 'Tekkers! ✨', 'Worldies only!', 'Hat-trick hero!', 'Boooing!', 'Wheee, dizzy! 😵'];

/* each poke randomly picks one of these: a CSS animation, a Wobbles face, and an
   effect (a confetti burst, the big GOAL! flash, or nothing extra). */
type Reaction = { anim: string; mood: WobblesMood; fx: 'goal' | 'confetti' | 'none' };
const REACTIONS: Reaction[] = [
  { anim: 'anim-tapbounce', mood: 'cheer', fx: 'confetti' },
  { anim: 'anim-jump', mood: 'cheer', fx: 'goal' },
  { anim: 'anim-flip', mood: 'wow', fx: 'goal' },
  { anim: 'anim-spin360', mood: 'wow', fx: 'confetti' },
  { anim: 'anim-shake', mood: 'wow', fx: 'none' },
  { anim: 'anim-wiggle', mood: 'wink', fx: 'none' },
  { anim: 'anim-tapbounce', mood: 'love', fx: 'confetti' },
  { anim: 'anim-jump', mood: 'cool', fx: 'confetti' },
  { anim: 'anim-wiggle', mood: 'cheer', fx: 'none' },
  { anim: 'anim-spin360', mood: 'love', fx: 'goal' },
];

const SECRET_CHANCE = 0.12; // chance a poke reveals the hidden keepy-uppy game

function Mascot({ burst, goalCelebrate, onSecret, wide }:
  { burst: () => void; goalCelebrate: () => void; onSecret: () => void; wide: boolean }) {
  const [react, setReact] = useState<Reaction | null>(null);
  const [bubble, setBubble] = useState<string | null>(null);
  const [secret, setSecret] = useState(false);
  const lastR = useRef(-1);
  const lastC = useRef(-1);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const size = wide ? 104 : 76;

  // pick a random index, but never the same one twice in a row
  const pick = (n: number, prev: { current: number }) => {
    let i = Math.floor(Math.random() * n);
    if (n > 1 && i === prev.current) i = (i + 1) % n;
    prev.current = i;
    return i;
  };

  const poke = () => {
    const r = REACTIONS[pick(REACTIONS.length, lastR)];
    setReact(null);
    requestAnimationFrame(() => setReact(r));
    clearTimeout(bubbleTimer.current);
    if (Math.random() < SECRET_CHANCE) {
      // the secret: tap the bubble to drop into the keepy-uppy game
      setSecret(true);
      setBubble('Keepy uppies?! 👀');
      burst();
      bubbleTimer.current = setTimeout(() => { setBubble(null); setSecret(false); }, 2600);
    } else {
      setSecret(false);
      setBubble(CHEERS[pick(CHEERS.length, lastC)]);
      if (r.fx === 'goal') goalCelebrate();
      else if (r.fx === 'confetti') burst();
      bubbleTimer.current = setTimeout(() => setBubble(null), 1600);
    }
  };
  return (
    <div style={{ position: 'absolute', right: wide ? 26 : 12, bottom: wide ? 22 : 12, zIndex: 55,
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      {bubble && (
        <div className={secret ? 'tap' : undefined}
          onClick={secret ? () => { clearTimeout(bubbleTimer.current); setBubble(null); setSecret(false); onSecret(); } : undefined}
          style={{ position: 'relative', fontFamily: 'var(--head)', fontSize: wide ? 17 : 14,
          color: 'var(--ink)', background: secret ? 'var(--sun)' : 'var(--cream)',
          border: '3px solid var(--ink)', borderRadius: 16, cursor: secret ? 'pointer' : 'default',
          padding: '7px 13px', boxShadow: '3px 4px 0 rgba(27,42,74,.7)', whiteSpace: 'nowrap', marginRight: 6,
          transformOrigin: 'bottom right', animation: secret
            ? 'wchq-bubblepop .32s cubic-bezier(.3,.7,.3,1.4), wchq-secretpulse 1.1s ease-in-out .4s infinite'
            : 'wchq-bubblepop .32s cubic-bezier(.3,.7,.3,1.4)' }}>
          {bubble}
          <span style={{ position: 'absolute', right: 18, bottom: -11, width: 0, height: 0,
            borderLeft: '9px solid transparent', borderRight: '9px solid transparent',
            borderTop: '12px solid var(--ink)' }} />
        </div>
      )}
      <div className={'tap ' + (react ? react.anim : 'anim-bob')} onClick={poke}
        onAnimationEnd={() => setReact(null)} title="Poke Wobbles!"
        style={{ filter: 'drop-shadow(3px 4px 0 rgba(27,42,74,.5))' }}>
        <Wobbles size={size} mood={react ? react.mood : 'happy'} />
      </div>
    </div>
  );
}

/* ----- GOAL! flash ----- */
function GoalFlash({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 45, pointerEvents: 'none' }}>
      <div className="head" style={{ position: 'absolute', left: '50%', top: '42%',
        transform: 'translate(-50%,-50%)', fontSize: 'clamp(54px,14vw,150px)', color: 'var(--sun)',
        WebkitTextStroke: '5px var(--ink)', paintOrder: 'stroke fill',
        textShadow: '0 0 28px rgba(255,210,63,.8), 6px 8px 0 rgba(27,42,74,.45)',
        animation: 'wchq-goalflash 1.1s ease-out forwards', whiteSpace: 'nowrap' }}>GOAL!</div>
    </div>
  );
}

/* Page registry — only the built pages are wired. Map/Admin are added in later
   phases; until then go() falls back to a playful "still building" toast. */
const PAGES: Record<string, FC> = {
  Home: HomePage, Schedule: SchedulePage, Sweepstake: SweepstakePage, Teams: TeamsPage,
  Groups: GroupsPage, Knockout: KnockoutPage, Map: MapPage, Admin: AdminPage,
};

function App() {
  const wide = useWide();
  const mobile = !wide;
  const settings = useStore((s) => s.settings);
  const people = useStore((s) => s.people);
  const [page, setPage] = useState<string>(() => {
    const h = (location.hash || '').replace('#', '');
    return PAGES[h] ? h : 'Home';
  });
  const [toast, setToast] = useState<string | null>(null);
  const [person, setPerson] = useState<Person | null>(null);
  const [confetti, setConfetti] = useState(false);
  const [goal, setGoal] = useState(false);
  const [teamCode, setTeamCode] = useState<string | null>(null);
  const [mapFocus, setMapFocus] = useState<string | null>(null);
  const [game, setGame] = useState(false);
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [reminders, toggleReminder] = useReminders();
  const scroller = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const confTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const goalTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const ping = (msg: string) => {
    setToast(msg); clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };
  const burst = () => {
    setConfetti(false); requestAnimationFrame(() => setConfetti(true));
    clearTimeout(confTimer.current); confTimer.current = setTimeout(() => setConfetti(false), 2600);
  };
  const goalCelebrate = () => {
    burst(); setGoal(false); requestAnimationFrame(() => setGoal(true));
    clearTimeout(goalTimer.current); goalTimer.current = setTimeout(() => setGoal(false), 1200);
  };
  const go = (next: string) => {
    if (!PAGES[next]) { ping(`🚧 Wobbles is still building ${next}!`); return; }
    setPage(next);
    try { if (location.hash.replace('#', '') !== next) location.hash = next; } catch { /* best-effort */ }
    if (scroller.current) scroller.current.scrollTop = 0;
    if (next !== 'Home') burst();
  };
  const openPerson = (p: Person) => setPerson(p);
  const openTeam = (code: string) => setTeamCode(code);

  // respond to hash changes (browser back/forward + direct #Page links)
  useEffect(() => {
    const onHash = () => {
      const h = (location.hash || '').replace('#', '');
      if (PAGES[h]) { setPage(h); if (scroller.current) scroller.current.scrollTop = 0; }
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // welcome confetti
  useEffect(() => { const id = setTimeout(burst, 400); return () => clearTimeout(id); }, []);

  // close any open popup when the section changes (e.g. browser back/forward)
  useEffect(() => { setPerson(null); setTeamCode(null); }, [page]);

  const ctx: AppContextValue = {
    wide, page, go, ping, burst, goalCelebrate, openPerson, openTeam,
    mapFocus, setMapFocus,
    reminders, toggleReminder, adminAuthed, setAdminAuthed,
    settings, people,
  };

  const Current = PAGES[page] || HomePage;

  return (
    <WCHQContext.Provider value={ctx}>
      <div className="wchq-screen">
        <Backdrop dark sun={false} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: 'radial-gradient(120% 60% at 20% -10%, rgba(54,169,255,.35), transparent 60%), radial-gradient(120% 60% at 80% -10%, rgba(255,210,63,.3), transparent 60%)' }} />
        <Confetti show={confetti} count={36} />
        <GoalFlash show={goal} />

        <div ref={scroller} className="noscroll wchq-scroll" style={{ position: 'relative', zIndex: 1,
          height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
          <div className="wchq-stack" style={{
            padding: mobile ? '16px 16px 110px' : '22px 34px 72px',
            gap: mobile ? 18 : 22, maxWidth: mobile ? 'none' : 1120, margin: '0 auto', minHeight: '100%' }}>
            <TopNav active={page} device={mobile ? 'mobile' : 'desktop'} dark
              onNav={go} onLogo={goalCelebrate} onAdmin={() => go('Admin')} />
            <Current />
          </div>
        </div>

        <Mascot burst={burst} goalCelebrate={goalCelebrate} onSecret={() => setGame(true)} wide={wide} />
        {game && <KeepyUppy onClose={() => setGame(false)} wide={wide} />}
        <Toast msg={toast ?? undefined} />
        <PersonPopup person={person} onClose={() => setPerson(null)} />
        <TeamPopup code={teamCode} onClose={() => setTeamCode(null)} onPerson={openPerson} />
      </div>
    </WCHQContext.Provider>
  );
}

export default App;
