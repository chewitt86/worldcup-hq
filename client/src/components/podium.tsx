/* World Cup HQ — sweepstake podium (top 3).
   Ported byte-for-byte from the prototype's home/widgets.jsx. */

import type { Person } from '../data/teams';
import { Avatar } from './avatar';

/* ---------- Sweepstake podium (top 3) ---------- */
export function Podium({ people, onPerson }: { people: Person[]; onPerson?: (p: Person) => void }) {
  const top = [...people].sort((a, b) => b.points - a.points).slice(0, 3);
  // order on stand: 2nd, 1st, 3rd
  const order = [top[1], top[0], top[2]];
  const meta: Record<number, { h: number; medal: string; col: string; rank: number }> = {
    0: { h: 70, medal: "🥈", col: "#d7dde6", rank: 2 },
    1: { h: 100, medal: "🥇", col: "var(--sun)", rank: 1 },
    2: { h: 50, medal: "🥉", col: "#f0b173", rank: 3 },
  };
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 12 }}>
      {order.map((p, i) => {
        const m = meta[i];
        return (
          <div key={p.id} className="tap" onClick={() => onPerson && onPerson(p)}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1, maxWidth: 96 }}>
            <div style={{ fontSize: i === 1 ? 26 : 20 }}>{m.medal}</div>
            <div className={i === 1 ? "anim-bob" : ""}><Avatar person={p} size={i === 1 ? 54 : 44} /></div>
            <div style={{ fontFamily: "var(--head)", fontSize: 13, lineHeight: 1 }}>{p.name}</div>
            <div className="sticker-sm" style={{ width: "100%", height: m.h, background: m.col,
              borderTopLeftRadius: 10, borderTopRightRadius: 10, borderBottom: "none",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start",
              paddingTop: 8, gap: 0 }}>
              <span style={{ fontFamily: "var(--head)", fontSize: 22, color: "var(--ink)" }}>{p.points}</span>
              <span style={{ fontFamily: "var(--head)", fontSize: 10, opacity: .65 }}>PTS</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
