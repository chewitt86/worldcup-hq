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
import { Wobbles } from './components/mascot';
import type { Person } from './data/teams';
import { HomePage } from './pages/home';
import { SchedulePage } from './pages/schedule';
import { SweepstakePage } from './pages/sweepstake';
import { TeamsPage } from './pages/teams';
import { GroupsPage } from './pages/groups';
import { KnockoutPage } from './pages/knockout';
import { MapPage } from './pages/map';
import { AdminPage } from './pages/admin';

/* ----- Wobbles, the mascot ----- */
const CHEERS = ['GOAAAL! ⚽', "Let's gooo!", 'Up the family!', 'Wheee! 🎉',
  "Who's winning?!", 'Boing! 🏆', "C'mon Leo!", 'Sticker-tastic!'];

function Mascot({ onCelebrate, wide }: { onCelebrate?: () => void; wide: boolean }) {
  const [bouncing, setBouncing] = useState(false);
  const [bubble, setBubble] = useState<string | null>(null);
  const idx = useRef(0);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const size = wide ? 104 : 76;
  const poke = () => {
    setBouncing(false);
    requestAnimationFrame(() => setBouncing(true));
    const msg = CHEERS[idx.current % CHEERS.length]; idx.current++;
    setBubble(msg);
    onCelebrate && onCelebrate();
    clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setBubble(null), 1600);
  };
  return (
    <div style={{ position: 'absolute', right: wide ? 26 : 12, bottom: wide ? 22 : 12, zIndex: 55,
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      {bubble && (
        <div style={{ position: 'relative', fontFamily: 'var(--head)', fontSize: wide ? 17 : 14,
          color: 'var(--ink)', background: 'var(--cream)', border: '3px solid var(--ink)', borderRadius: 16,
          padding: '7px 13px', boxShadow: '3px 4px 0 rgba(27,42,74,.7)', whiteSpace: 'nowrap', marginRight: 6,
          transformOrigin: 'bottom right', animation: 'wchq-bubblepop .32s cubic-bezier(.3,.7,.3,1.4)' }}>
          {bubble}
          <span style={{ position: 'absolute', right: 18, bottom: -11, width: 0, height: 0,
            borderLeft: '9px solid transparent', borderRight: '9px solid transparent',
            borderTop: '12px solid var(--ink)' }} />
        </div>
      )}
      <div className={'tap ' + (bouncing ? 'anim-tapbounce' : 'anim-bob')} onClick={poke}
        onAnimationEnd={() => setBouncing(false)} title="Poke Wobbles!"
        style={{ filter: 'drop-shadow(3px 4px 0 rgba(27,42,74,.5))' }}>
        <Wobbles size={size} mood={bouncing ? 'cheer' : 'happy'} />
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
    try { history.replaceState(null, '', '#' + next); } catch { /* hash update is best-effort */ }
    if (scroller.current) scroller.current.scrollTop = 0;
    if (next !== 'Home') burst();
  };
  const openPerson = (p: Person) => setPerson(p);

  // welcome confetti
  useEffect(() => { const id = setTimeout(burst, 400); return () => clearTimeout(id); }, []);

  const ctx: AppContextValue = {
    wide, page, go, ping, burst, goalCelebrate, openPerson,
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

        <Mascot onCelebrate={goalCelebrate} wide={wide} />
        <Toast msg={toast ?? undefined} />
        <PersonPopup person={person} onClose={() => setPerson(null)} />
      </div>
    </WCHQContext.Provider>
  );
}

export default App;
