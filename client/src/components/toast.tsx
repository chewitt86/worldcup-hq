/* World Cup HQ — transient toast message.
   Ported byte-for-byte from the prototype's home/widgets.jsx. */

/* ---------- Toast ---------- */
export function Toast({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <div className="pill" style={{ position: "absolute", left: "50%", bottom: 22, transform: "translateX(-50%)",
      zIndex: 60, background: "var(--ink)", color: "var(--cream)", fontFamily: "var(--head)",
      fontSize: 14, padding: "10px 18px", borderRadius: 999, border: "3px solid var(--cream)",
      boxShadow: "0 6px 0 rgba(27,42,74,.35)", whiteSpace: "nowrap",
      animation: "wchq-pop .3s ease-out" }}>{msg}</div>
  );
}
