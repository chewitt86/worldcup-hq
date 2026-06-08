/* World Cup HQ — PanZoom: a fixed-size content canvas that fits its viewport,
   pans on drag, and zooms with mouse-wheel or two-finger pinch. */

function PanZoom({ width, height, minScale = 0.25, maxScale = 3.2, padding = 16, onReady, children }) {
  const vpRef = React.useRef(null);
  const [tf, setTf] = React.useState({ k: 1, x: 0, y: 0 });
  const pointers = React.useRef(new Map());
  const pan = React.useRef(null);
  const pinch = React.useRef(null);

  const clampK = (k) => Math.max(minScale, Math.min(maxScale, k));

  const fit = React.useCallback(() => {
    const vp = vpRef.current; if (!vp) return;
    const vw = vp.clientWidth, vh = vp.clientHeight;
    const k = Math.min((vw - padding * 2) / width, (vh - padding * 2) / height);
    setTf({ k, x: (vw - width * k) / 2, y: (vh - height * k) / 2 });
  }, [width, height, padding]);

  React.useEffect(() => { fit(); }, [fit]);

  // imperative: centre a content point at a given zoom (for “jump to team”)
  const focusTo = React.useCallback((cx, cy, k = 1.7) => {
    const vp = vpRef.current; if (!vp) return;
    const kk = clampK(k);
    setTf({ k: kk, x: vp.clientWidth / 2 - cx * kk, y: vp.clientHeight / 2 - cy * kk });
  }, [minScale, maxScale]);
  React.useEffect(() => { if (onReady) onReady({ focusTo, fit }); }, [onReady, focusTo, fit]);
  React.useEffect(() => {
    const onR = () => fit();
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, [fit]);

  // zoom keeping a screen-point fixed
  const zoomAt = (factor, sx, sy) => setTf((t) => {
    const k = clampK(t.k * factor);
    const cx = (sx - t.x) / t.k, cy = (sy - t.y) / t.k;
    return { k, x: sx - cx * k, y: sy - cy * k };
  });

  // wheel (native, non-passive so we can preventDefault)
  React.useEffect(() => {
    const vp = vpRef.current; if (!vp) return;
    const onWheel = (e) => {
      e.preventDefault();
      const r = vp.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.14 : 1 / 1.14, e.clientX - r.left, e.clientY - r.top);
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, []);

  const rel = (e) => { const r = vpRef.current.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

  const onPointerDown = (e) => {
    pointers.current.set(e.pointerId, rel(e));
    try { vpRef.current.setPointerCapture(e.pointerId); } catch (x) {}
    if (pointers.current.size === 1) {
      const p = rel(e);
      pan.current = { sx: p.x, sy: p.y, x: tf.x, y: tf.y };
      pinch.current = null;
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const c = { x: (mid.x - tf.x) / tf.k, y: (mid.y - tf.y) / tf.k };
      pinch.current = { dist0: dist, k0: tf.k, c };
      pan.current = null;
    }
  };
  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, rel(e));
    const pk = pinch.current, pc = pan.current;
    if (pointers.current.size >= 2 && pk) {
      const [a, b] = [...pointers.current.values()];
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const k = clampK(pk.k0 * dist / pk.dist0);
      setTf({ k, x: mid.x - pk.c.x * k, y: mid.y - pk.c.y * k });
    } else if (pc) {
      const p = rel(e);
      setTf((t) => ({ ...t, x: pc.x + (p.x - pc.sx), y: pc.y + (p.y - pc.sy) }));
    }
  };
  const onPointerUp = (e) => {
    pointers.current.delete(e.pointerId);
    try { vpRef.current.releasePointerCapture(e.pointerId); } catch (x) {}
    pinch.current = null;
    if (pointers.current.size === 1) {
      const [p] = [...pointers.current.values()];
      pan.current = { sx: p.x, sy: p.y, x: tf.x, y: tf.y };
    } else if (pointers.current.size === 0) {
      pan.current = null;
    }
  };

  const btn = { width: 38, height: 38, borderRadius: 11, border: "3px solid var(--ink)",
    background: "var(--cream)", fontFamily: "var(--head)", fontSize: 20, cursor: "pointer",
    boxShadow: "2px 3px 0 rgba(27,42,74,.7)", lineHeight: 1 };

  return (
    <div ref={vpRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove}
      onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
      style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden",
        touchAction: "none", cursor: pan.current ? "grabbing" : "grab", userSelect: "none" }}>
      <div style={{ position: "absolute", top: 0, left: 0, width, height,
        transformOrigin: "0 0", transform: `translate(${tf.x}px,${tf.y}px) scale(${tf.k})` }}>
        {children}
      </div>
      <div style={{ position: "absolute", right: 10, bottom: 10, display: "flex", flexDirection: "column", gap: 7 }}>
        <button style={btn} onClick={() => { const r = vpRef.current.getBoundingClientRect(); zoomAt(1.4, r.width / 2, r.height / 2); }}>+</button>
        <button style={btn} onClick={() => { const r = vpRef.current.getBoundingClientRect(); zoomAt(1 / 1.4, r.width / 2, r.height / 2); }}>−</button>
        <button style={{ ...btn, fontSize: 16 }} onClick={fit} title="Fit">⟲</button>
      </div>
    </div>
  );
}

Object.assign(window, { PanZoom });
