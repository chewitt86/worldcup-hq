/* World Cup HQ — App shell: router, shared chrome, context provider */

const { useState, useEffect, useRef, useMemo } = React;

/* responsive */
function useWide(bp = 760) {
  const [wide, setWide] = useState(typeof window !== "undefined" ? window.innerWidth >= bp : false);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width:${bp}px)`);
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [bp]);
  return wide;
}

/* persisted match reminders */
function useReminders() {
  const KEY = "wchq.reminders";
  const [set, setSet] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { return new Set(); }
  });
  const toggle = (id) => setSet((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    try { localStorage.setItem(KEY, JSON.stringify([...next])); } catch {}
    return next;
  });
  return [set, toggle];
}

/* ----- Wobbles, the mascot ----- */
const CHEERS = ["GOAAAL! ⚽", "Let's gooo!", "Up the family!", "Wheee! 🎉",
  "Who's winning?!", "Boing! 🏆", "C'mon Leo!", "Sticker-tastic!"];
function Mascot({ onCelebrate, wide }) {
  const [bouncing, setBouncing] = useState(false);
  const [bubble, setBubble] = useState(null);
  const idx = useRef(0);
  const size = wide ? 104 : 76;
  const poke = () => {
    setBouncing(false);
    requestAnimationFrame(() => setBouncing(true));
    const msg = CHEERS[idx.current % CHEERS.length]; idx.current++;
    setBubble(msg);
    onCelebrate && onCelebrate();
    clearTimeout(window.__wmb);
    window.__wmb = setTimeout(() => setBubble(null), 1600);
  };
  return (
    <div style={{ position: "absolute", right: wide ? 26 : 12, bottom: wide ? 22 : 12, zIndex: 55,
      display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      {bubble && (
        <div style={{ position: "relative", fontFamily: "var(--head)", fontSize: wide ? 17 : 14,
          color: "var(--ink)", background: "var(--cream)", border: "3px solid var(--ink)", borderRadius: 16,
          padding: "7px 13px", boxShadow: "3px 4px 0 rgba(27,42,74,.7)", whiteSpace: "nowrap", marginRight: 6,
          transformOrigin: "bottom right", animation: "wchq-bubblepop .32s cubic-bezier(.3,.7,.3,1.4)" }}>
          {bubble}
          <span style={{ position: "absolute", right: 18, bottom: -11, width: 0, height: 0,
            borderLeft: "9px solid transparent", borderRight: "9px solid transparent",
            borderTop: "12px solid var(--ink)" }} />
        </div>
      )}
      <div className={"tap " + (bouncing ? "anim-tapbounce" : "anim-bob")} onClick={poke}
        onAnimationEnd={() => setBouncing(false)} title="Poke Wobbles!"
        style={{ filter: "drop-shadow(3px 4px 0 rgba(27,42,74,.5))" }}>
        <Wobbles size={size} mood={bouncing ? "cheer" : "happy"} />
      </div>
    </div>
  );
}

/* ----- GOAL! flash ----- */
function GoalFlash({ show }) {
  if (!show) return null;
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 45, pointerEvents: "none" }}>
      <div className="head" style={{ position: "absolute", left: "50%", top: "42%",
        transform: "translate(-50%,-50%)", fontSize: "clamp(54px,14vw,150px)", color: "var(--sun)",
        WebkitTextStroke: "5px var(--ink)", paintOrder: "stroke fill",
        textShadow: "0 0 28px rgba(255,210,63,.8), 6px 8px 0 rgba(27,42,74,.45)",
        animation: "wchq-goalflash 1.1s ease-out forwards", whiteSpace: "nowrap" }}>GOAL!</div>
    </div>
  );
}

const PAGES = {
  Home: HomePage, Sweepstake: SweepstakePage, Teams: TeamsPage,
  Groups: GroupsPage, Knockout: KnockoutPage, Map: MapPage, Admin: AdminPage,
};

function App() {
  const wide = useWide();
  const mobile = !wide;
  const store = useStoreState();
  const [page, setPage] = useState(() => {
    const h = (location.hash || "").replace("#", "");
    return PAGES[h] ? h : "Home";
  });
  const [toast, setToast] = useState(null);
  const [person, setPerson] = useState(null);
  const [confetti, setConfetti] = useState(false);
  const [goal, setGoal] = useState(false);
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [reminders, toggleReminder] = useReminders();
  const scroller = useRef(null);
  const confTimer = useRef();
  const goalTimer = useRef();

  const ping = (msg) => {
    setToast(msg); clearTimeout(window.__wb);
    window.__wb = setTimeout(() => setToast(null), 2200);
  };
  const burst = () => {
    setConfetti(false); requestAnimationFrame(() => setConfetti(true));
    clearTimeout(confTimer.current); confTimer.current = setTimeout(() => setConfetti(false), 2600);
  };
  const goalCelebrate = () => {
    burst(); setGoal(false); requestAnimationFrame(() => setGoal(true));
    clearTimeout(goalTimer.current); goalTimer.current = setTimeout(() => setGoal(false), 1200);
  };
  const go = (next) => {
    if (!PAGES[next]) { ping(`🚧 Wobbles is still building ${next}!`); return; }
    setPage(next);
    try { history.replaceState(null, "", "#" + next); } catch {}
    if (scroller.current) scroller.current.scrollTop = 0;
    if (next !== "Home") burst();
  };
  const openPerson = (p) => setPerson(p);

  // welcome confetti
  useEffect(() => { const id = setTimeout(burst, 400); return () => clearTimeout(id); }, []);

  const ctx = {
    wide, page, go, ping, burst, goalCelebrate, openPerson,
    reminders, toggleReminder, adminAuthed, setAdminAuthed,
    settings: store.settings, people: store.people,
  };

  const Current = PAGES[page] || HomePage;

  return (
    <WCHQContext.Provider value={ctx}>
      <div className="wchq-screen">
        <Backdrop dark sun={false} />
        <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
          background: "radial-gradient(120% 60% at 20% -10%, rgba(54,169,255,.35), transparent 60%), radial-gradient(120% 60% at 80% -10%, rgba(255,210,63,.3), transparent 60%)" }} />
        <Confetti show={confetti} count={36} />
        <GoalFlash show={goal} />

        <div ref={scroller} className="noscroll wchq-scroll" style={{ position: "relative", zIndex: 1,
          height: "100%", overflowY: "auto", overflowX: "hidden" }}>
          <div className="wchq-stack" style={{
            padding: mobile ? "16px 16px 110px" : "22px 34px 72px",
            gap: mobile ? 18 : 22, maxWidth: mobile ? "none" : 1120, margin: "0 auto", minHeight: "100%" }}>
            <TopNav active={page} device={mobile ? "mobile" : "desktop"} dark
              onNav={go} onLogo={goalCelebrate} onAdmin={() => go("Admin")} />
            <Current />
          </div>
        </div>

        <Mascot onCelebrate={goalCelebrate} wide={wide} />
        <Toast msg={toast} />
        <PersonPopup person={person} onClose={() => setPerson(null)} />
      </div>
    </WCHQContext.Provider>
  );
}

Object.assign(window, { App, useWide, useReminders, Mascot, GoalFlash });
