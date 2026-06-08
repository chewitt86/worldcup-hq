/* World Cup HQ — app core: context, store hook, shared page chrome */

const WCHQContext = React.createContext(null);
function useApp() { return React.useContext(WCHQContext); }

/* Subscribe to the mutable store; re-render on any change. */
function useStoreState() {
  const [, force] = React.useState(0);
  React.useEffect(() => window.WCHQStore.subscribe(() => force((n) => n + 1)), []);
  return window.WCHQStore.get();
}

/* Big outlined page title used at the top of each section. */
function PageTitle({ children, sub, accent = "var(--sun)" }) {
  return (
    <div style={{ margin: "2px 0 2px" }}>
      <h1 className="head" style={{ color: "var(--cream)", fontSize: "clamp(30px,8vw,52px)",
        lineHeight: .92, letterSpacing: "1px",
        WebkitTextStroke: "4px var(--ink)", paintOrder: "stroke fill",
        textShadow: "0 5px 0 var(--ink), 4px 8px 0 rgba(27,42,74,.3)" }}>
        {children}
      </h1>
      {sub && (
        <div className="head" style={{ display: "inline-block", marginTop: 10,
          background: accent, color: "var(--ink)", fontSize: 14, letterSpacing: ".5px",
          padding: "5px 14px", borderRadius: 999, border: "3px solid var(--ink)",
          boxShadow: "2px 3px 0 rgba(27,42,74,.7)" }}>{sub}</div>
      )}
    </div>
  );
}

/* Tier badge (Favourite / Contender / Dark horse / Host / Outsider / Longshot) */
const TIER_COLOUR = {
  "Favourite": "var(--sun)",
  "Contender": "var(--mint)",
  "Dark horse": "var(--grape)",
  "Host": "var(--blue)",
  "Outsider": "var(--orange)",
  "Longshot": "var(--pink)",
};
function TierBadge({ tier, small }) {
  return (
    <span className="head" style={{ background: TIER_COLOUR[tier] || "var(--cream2)",
      color: "var(--ink)", fontSize: small ? 10 : 12, letterSpacing: ".5px",
      padding: small ? "2px 8px" : "3px 10px", borderRadius: 999,
      border: "2.5px solid var(--ink)", whiteSpace: "nowrap",
      boxShadow: "1.5px 2px 0 rgba(27,42,74,.7)" }}>{tier}</span>
  );
}

/* Odds pill — playful, never betting-styled */
function OddsPill({ code, label = "to win" }) {
  const odds = window.WCHQ.TEAMS[code]?.odds || "—";
  return (
    <span className="head" style={{ display: "inline-flex", alignItems: "center", gap: 6,
      background: "var(--ink)", color: "var(--sun)", fontSize: 13, padding: "4px 11px",
      borderRadius: 999, border: "2.5px solid var(--ink)" }}>
      <span style={{ fontSize: 14 }}>{odds}</span>
      <span style={{ fontSize: 9, color: "var(--cream)", opacity: .75 }}>{label}</span>
    </span>
  );
}

/* Mini stack of backer avatars */
function Backers({ code, people, max = 5, onPerson }) {
  const list = window.WCHQ.backers(code, people);
  if (!list.length) return <span style={{ fontSize: 12, fontWeight: 700, opacity: .55 }}>Nobody yet</span>;
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {list.slice(0, max).map((p, i) => (
        <div key={p.id} className={onPerson ? "tap" : ""} onClick={onPerson ? () => onPerson(p) : undefined}
          style={{ marginLeft: i ? -10 : 0, zIndex: max - i }}>
          <Avatar person={p} size={28} />
        </div>
      ))}
      {list.length > max && (
        <span style={{ marginLeft: 6, fontFamily: "var(--head)", fontSize: 13 }}>+{list.length - max}</span>
      )}
    </div>
  );
}

Object.assign(window, { WCHQContext, useApp, useStoreState, PageTitle, TierBadge, OddsPill, Backers, TIER_COLOUR });
