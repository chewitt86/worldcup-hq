/* World Cup HQ — hidden "keepy-uppy" mini-game (the mascot easter egg).
   Footballs fall from the top; tap one to bounce it back up. Balls drip in so
   there's always one to juggle, but each round is time-limited (kept gentle for
   kids). Score = total keepy-uppies; a personal best is saved to localStorage.

   ALL game state (timing, accumulators, the loop) lives inside one effect
   instance, so React StrictMode / HMR remounts can't leave duplicate loops
   fighting over shared refs. `bounce`/`replay` are exposed via refs for the
   render. Balls move by mutating their transform; only score/timer/phase use
   React state, so there's no per-frame re-render. */

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

/* ---- tunable feel ---- */
const SIZE = 50;            // ball size (px)
const GRAVITY = 520;        // px/s²
const BOUNCE = 640;         // upward kick on tap (px/s)
const POOL = 16;            // max balls on screen
const BATCH = 5;            // active at kick-off
const DRIP_EVERY = 2.2;     // a new ball every N seconds…
const ROUND = 60;           // …for a 60-second round
const GRASS = 64;           // grass strip height (the floor)
const BEST_KEY = 'wchq.keepy.best';

interface Ball { x: number; y: number; vx: number; vy: number; active: boolean; pop: number; el: HTMLDivElement | null; }

function Football() {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 60 60" style={{ display: 'block',
      filter: 'drop-shadow(1px 3px 0 rgba(27,42,74,.4))' }}>
      <circle cx="30" cy="30" r="27" fill="#fffdf3" stroke="#1b2a4a" strokeWidth="3" />
      <polygon points="30,17 39,24 35,35 25,35 21,24" fill="#1b2a4a" />
      <polygon points="13,30 20,25 26,31 22,40 14,38" fill="#1b2a4a" opacity=".9" />
      <polygon points="47,30 40,25 34,31 38,40 46,38" fill="#1b2a4a" opacity=".9" />
      <polygon points="24,45 36,45 33,53 27,53" fill="#1b2a4a" opacity=".85" />
    </svg>
  );
}

function readBest(): number {
  try { return parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0; } catch { return 0; }
}

export function KeepyUppy({ onClose }: { onClose: () => void }) {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const balls = useRef<Ball[]>(
    Array.from({ length: POOL }, (): Ball => ({ x: 0, y: 0, vx: 0, vy: 0, active: false, pop: 0, el: null })),
  );
  const bounceRef = useRef<(i: number) => void>(() => {});
  const replayRef = useRef<() => void>(() => {});

  const [score, setScore] = useState(0);
  const [time, setTime] = useState(ROUND);
  const [phase, setPhase] = useState<'play' | 'over'>('play');
  const [best, setBest] = useState(readBest);

  useEffect(() => {
    let alive = true;
    let frame = 0;
    let last = performance.now();
    let elapsed = 0, dripT = 0, running = false, shown = ROUND, scoreV = 0;
    const arr = balls.current;

    const spawn = (b: Ball) => {
      const w = sceneRef.current?.clientWidth ?? 360;
      b.x = 30 + Math.random() * Math.max(1, w - 60 - SIZE);
      b.y = -SIZE - Math.random() * 60;
      b.vx = (Math.random() - 0.5) * 110;
      b.vy = 40 + Math.random() * 40;
      b.pop = 0; b.active = true;
    };

    const startRound = () => {
      scoreV = 0; setScore(0);
      elapsed = 0; dripT = 0; shown = ROUND; setTime(ROUND); setPhase('play');
      for (const b of arr) { b.active = false; b.pop = 0; if (b.el) b.el.style.display = 'none'; }
      for (let i = 0; i < BATCH && i < arr.length; i++) spawn(arr[i]);
      last = performance.now(); running = true;
    };

    const bounce = (i: number) => {
      const b = arr[i];
      if (!b || !b.active || !running) return;
      b.vy = -BOUNCE; b.vx += (Math.random() - 0.5) * 150; b.pop = 1;
      scoreV += 1; setScore(scoreV);
    };

    const loop = (now: number) => {
      if (!alive) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (running) {
        elapsed += dt; dripT += dt;
        if (dripT >= DRIP_EVERY) {
          dripT = 0;
          const free = arr.find((b) => !b.active);
          if (free) spawn(free);
        }
        const left = Math.max(0, Math.ceil(ROUND - elapsed));
        if (left !== shown) { shown = left; setTime(left); }
        if (elapsed >= ROUND) {
          running = false;
          setPhase('over');
          setBest((prev) => {
            const nb = Math.max(prev, scoreV);
            try { localStorage.setItem(BEST_KEY, String(nb)); } catch { /* ignore */ }
            return nb;
          });
        } else {
          const scene = sceneRef.current;
          const w = scene?.clientWidth ?? 360;
          const floor = (scene?.clientHeight ?? 640) - GRASS + SIZE * 0.2;
          for (const b of arr) {
            if (!b.active) { if (b.el) b.el.style.display = 'none'; continue; }
            b.vy += GRAVITY * dt; b.x += b.vx * dt; b.y += b.vy * dt;
            if (b.x < 0) { b.x = 0; b.vx = Math.abs(b.vx) * 0.9; }
            else if (b.x > w - SIZE) { b.x = w - SIZE; b.vx = -Math.abs(b.vx) * 0.9; }
            if (b.y > floor) b.active = false;
            if (b.pop > 0) b.pop = Math.max(0, b.pop - dt * 5);
            if (b.el) {
              b.el.style.display = b.active ? 'block' : 'none';
              b.el.style.transform = `translate3d(${b.x}px,${b.y}px,0) scale(${1 + 0.28 * b.pop})`;
            }
          }
        }
      }
      frame = requestAnimationFrame(loop);
    };

    bounceRef.current = bounce;
    replayRef.current = startRound;
    startRound();
    frame = requestAnimationFrame(loop);
    const onVis = () => { last = performance.now(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const btn = (bg: string, fg = 'var(--ink)'): CSSProperties => ({
    fontFamily: 'var(--head)', fontSize: 15, background: bg, color: fg, border: '3px solid var(--ink)',
    borderRadius: 13, padding: '11px 20px', cursor: 'pointer', boxShadow: '3px 4px 0 rgba(27,42,74,.6)' });

  return createPortal(
    <div ref={sceneRef} style={{ position: 'fixed', inset: 0, zIndex: 210, overflow: 'hidden',
      background: 'radial-gradient(120% 80% at 50% 0%, #2a4a86, #0c1838 70%)', touchAction: 'manipulation',
      userSelect: 'none' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: GRASS,
        background: 'linear-gradient(180deg,#46b94a,#37953b)', borderTop: '4px solid #1b2a4a' }} />

      <div style={{ position: 'absolute', top: 14, left: 14, right: 14, display: 'flex',
        alignItems: 'center', justifyContent: 'space-between', gap: 10, pointerEvents: 'none' }}>
        <div className="head pill" style={{ background: 'var(--sun)', color: 'var(--ink)', fontSize: 18,
          padding: '8px 14px', borderRadius: 999, border: '3px solid var(--ink)',
          boxShadow: '2px 3px 0 rgba(27,42,74,.6)' }}>⚽ {score}</div>
        <div className="head pill" style={{ background: time <= 10 ? 'var(--tomato)' : 'var(--cream)',
          color: time <= 10 ? '#fff' : 'var(--ink)', fontSize: 16, padding: '8px 14px', borderRadius: 999,
          border: '3px solid var(--ink)', boxShadow: '2px 3px 0 rgba(27,42,74,.6)' }}>⏱ {time}s</div>
        <div className="tap" onClick={onClose} title="Close" style={{ pointerEvents: 'auto',
          fontFamily: 'var(--head)', fontSize: 22, width: 38, height: 38, borderRadius: '50%',
          border: '3px solid var(--cream)', color: 'var(--cream)', display: 'flex', alignItems: 'center',
          justifyContent: 'center' }}>×</div>
      </div>

      {phase === 'play' && score === 0 && (
        <div className="head" style={{ position: 'absolute', top: '40%', left: 0, right: 0, textAlign: 'center',
          color: '#cdd8ee', fontSize: 16, pointerEvents: 'none', opacity: .85 }}>Tap the footballs to keep them up! 👆</div>
      )}

      {Array.from({ length: POOL }).map((_, i) => (
        <div key={i} ref={(el) => { const b = balls.current[i]; if (b) b.el = el; }}
          onClick={() => bounceRef.current(i)}
          style={{ position: 'absolute', left: 0, top: 0, width: SIZE, height: SIZE, display: 'none',
            willChange: 'transform', cursor: 'pointer' }}>
          <Football />
        </div>
      ))}

      {phase === 'over' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 5, display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: 20, background: 'rgba(12,24,56,.55)', backdropFilter: 'blur(3px)' }}>
          <div className="sticker" style={{ width: '100%', maxWidth: 320, padding: 22, textAlign: 'center',
            animation: 'wchq-pop .32s ease-out' }}>
            <div style={{ fontSize: 44 }}>⚽</div>
            <div className="head" style={{ fontSize: 24, marginTop: 4 }}>Well played!</div>
            <div className="head" style={{ fontSize: 40, color: 'var(--tomato)', marginTop: 8 }}>{score}</div>
            <div style={{ fontWeight: 700, fontSize: 13, opacity: .65 }}>keepy-uppies</div>
            <div className="head pill" style={{ display: 'inline-flex', marginTop: 12, background: 'var(--sun)',
              color: 'var(--ink)', fontSize: 14, padding: '6px 14px', borderRadius: 999,
              border: '2.5px solid var(--ink)' }}>🏅 Best: {best}</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'center' }}>
              <button onClick={() => replayRef.current()} style={btn('var(--grass)')}>↻ Play again</button>
              <button onClick={onClose} style={btn('var(--cream)')}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
