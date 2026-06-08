/* World Cup HQ — person detail popup modal.
   Ported byte-for-byte from the prototype's home/widgets.jsx.
   The prototype's 'wchq-pop' entrance keeps the visible end-state as the base
   style, so no extra base styling is needed beyond the animation. */

import type { Person } from '../data/teams';
import { TEAMS } from '../data/teams';
import { Avatar } from './avatar';
import { Flag, FlagChip } from './flag';

/* ---------- Person detail popup ---------- */
export function PersonPopup({ person, onClose }: { person?: Person | null; onClose?: () => void }) {
  if (!person) return null;
  const T = TEAMS;
  const stillIn = person.teams.filter((c) => !person.out.includes(c));
  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, zIndex: 80,
      background: "rgba(27,42,74,.45)", display: "flex", alignItems: "center",
      justifyContent: "center", padding: 18, backdropFilter: "blur(2px)" }}>
      <div onClick={(e) => e.stopPropagation()} className="sticker"
        style={{ width: "100%", maxWidth: 320, padding: 20, animation: "wchq-pop .32s ease-out" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar person={person} size={56} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--head)", fontSize: 22, lineHeight: 1 }}>{person.name}</div>
            <div style={{ fontWeight: 700, fontSize: 13, opacity: .7, marginTop: 3 }}>{person.points} points</div>
          </div>
          <div className="tap" onClick={onClose} style={{ fontFamily: "var(--head)", fontSize: 20,
            width: 32, height: 32, borderRadius: "50%", border: "3px solid var(--ink)",
            display: "flex", alignItems: "center", justifyContent: "center" }}>×</div>
        </div>
        <div style={{ display: "flex", gap: 8, margin: "16px 0 6px" }}>
          <div style={{ flex: 1, textAlign: "center", padding: "8px 0", borderRadius: 12,
            border: "3px solid var(--ink)", background: "var(--grass)" }}>
            <div style={{ fontFamily: "var(--head)", fontSize: 24 }}>{stillIn.length}</div>
            <div style={{ fontFamily: "var(--head)", fontSize: 10 }}>✅ STILL IN</div>
          </div>
          <div style={{ flex: 1, textAlign: "center", padding: "8px 0", borderRadius: 12,
            border: "3px solid var(--ink)", background: "var(--tomato)" }}>
            <div style={{ fontFamily: "var(--head)", fontSize: 24 }}>{person.out.length}</div>
            <div style={{ fontFamily: "var(--head)", fontSize: 10 }}>❌ OUT</div>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 12 }}>
          {person.teams.map((c) => <FlagChip key={c} code={c} knocked={person.out.includes(c)} />)}
        </div>
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8,
          background: "var(--cream2)", border: "3px solid var(--ink)", borderRadius: 14, padding: "8px 12px" }}>
          <span style={{ fontSize: 20 }}>⭐</span>
          <span style={{ fontWeight: 700, fontSize: 13 }}>Best shot:</span>
          <Flag code={person.best} style={{ width: 24, height: 17 }} />
          <span style={{ fontFamily: "var(--head)", fontSize: 14 }}>{T[person.best]?.name}</span>
          <span style={{ marginLeft: "auto", fontFamily: "var(--head)", fontSize: 13, color: "var(--tomato)" }}>{T[person.best]?.odds}</span>
        </div>
      </div>
    </div>
  );
}
