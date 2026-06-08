/* World Cup HQ — TEAMS page: nation grid + tier filter + detail popup.
   Ported from home/page-teams.jsx. Team display data is read through the
   store's `selectTeams` selector so admin team-edits propagate live. */

import { Fragment, useState } from 'react';
import { useApp } from '../app/context';
import { useStore, selectTeams } from '../store/store';
import type { Person } from '../data/teams';
import {
  ELIMINATED,
  groupOf,
  STANDINGS,
  GROUP_RESULTS,
  backers,
  oddsNum,
} from '../data/tournament';
import { Flag } from '../components/flag';
import { Avatar } from '../components/avatar';
import { PageTitle, TierBadge, OddsPill, Backers } from '../components/labels';

function TeamCard({
  code,
  onOpen,
  people,
}: {
  code: string;
  onOpen: (code: string) => void;
  people: Person[];
  wide: boolean;
}) {
  const teams = useStore(selectTeams);
  const t = teams[code];
  const dead = ELIMINATED.includes(code);
  return (
    <div className="sticker stickcard tap" onClick={() => onOpen(code)}
      style={{ padding: 14, position: "relative", overflow: "hidden",
        background: dead ? "#f3ede0" : "var(--cream)" }}>
      {dead && (
        <div className="head" style={{ position: "absolute", top: 16, right: -38, width: 132,
          textAlign: "center", transform: "rotate(45deg)", transformOrigin: "center",
          background: "var(--ink)", color: "#fff", fontSize: 10, padding: "3px 0",
          letterSpacing: "2px", borderTop: "2px solid rgba(255,255,255,.25)", zIndex: 2,
          boxShadow: "0 1px 4px rgba(0,0,0,.35)" }}>OUT</div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 11, opacity: dead ? .6 : 1 }}>
        <Flag code={code} knocked={dead} style={{ width: 52, height: 37, borderRadius: 7,
          boxShadow: "2px 2px 0 rgba(27,42,74,.5)" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="head" style={{ fontSize: 18, lineHeight: 1 }}>{t.name}</div>
          <div style={{ fontSize: 11, fontWeight: 700, opacity: .6, marginTop: 2 }}>{t.titles}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 8, marginTop: 12, opacity: dead ? .6 : 1 }}>
        <TierBadge tier={t.tier} small />
        <OddsPill code={code} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 11,
        paddingTop: 10, borderTop: "2px dashed rgba(27,42,74,.18)" }}>
        <span style={{ fontSize: 11, fontWeight: 700, opacity: .6 }}>Backed by</span>
        <Backers code={code} people={people} max={4} />
      </div>
    </div>
  );
}

function TeamPopup({
  code,
  onClose,
  onPerson,
}: {
  code: string | null;
  onClose: () => void;
  onPerson?: (p: Person) => void;
}) {
  const teams = useStore(selectTeams);
  const { people } = useApp();
  if (!code) return null;
  const t = teams[code];
  const g = groupOf(code) as string;
  const st = STANDINGS[code];
  const dead = ELIMINATED.includes(code);
  const results = (GROUP_RESULTS[g] || []).filter((r) => r.a === code || r.b === code);

  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, zIndex: 80,
      background: "rgba(27,42,74,.5)", display: "flex", alignItems: "center",
      justifyContent: "center", padding: 18, backdropFilter: "blur(2px)" }}>
      <div onClick={(e) => e.stopPropagation()} className="sticker noscroll"
        style={{ width: "100%", maxWidth: 360, padding: 0, overflow: "hidden",
          maxHeight: "88%", overflowY: "auto", animation: "wchq-pop .32s ease-out" }}>
        {/* header */}
        <div style={{ position: "relative", padding: "18px 18px 16px",
          background: "linear-gradient(180deg,#13204a,#1b2a4a)" }}>
          <div className="tap" onClick={onClose} style={{ position: "absolute", top: 12, right: 12,
            fontFamily: "var(--head)", fontSize: 20, width: 32, height: 32, borderRadius: "50%",
            border: "3px solid var(--cream)", color: "var(--cream)", display: "flex",
            alignItems: "center", justifyContent: "center" }}>×</div>
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <Flag code={code} knocked={dead} style={{ width: 64, height: 46, borderRadius: 8,
              boxShadow: "2px 3px 0 rgba(0,0,0,.4)" }} />
            <div>
              <div className="head" style={{ color: "var(--cream)", fontSize: 26, lineHeight: 1 }}>{t.name}</div>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#7fa8e6", marginTop: 3 }}>{t.titles}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 13 }}>
            <TierBadge tier={t.tier} />
            <OddsPill code={code} />
            <span className="head" style={{ background: "var(--blue)", color: "#fff", fontSize: 12,
              padding: "4px 11px", borderRadius: 999, border: "2.5px solid var(--ink)" }}>GROUP {g}</span>
          </div>
        </div>

        <div style={{ padding: 18 }}>
          {/* fun fact */}
          <div style={{ display: "flex", gap: 9, alignItems: "flex-start", background: "var(--cream2)",
            border: "3px solid var(--ink)", borderRadius: 14, padding: "10px 13px" }}>
            <span style={{ fontSize: 20 }}>💡</span>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{t.fact}</span>
          </div>

          {/* group form */}
          <div className="head" style={{ fontSize: 14, margin: "16px 0 8px", letterSpacing: ".5px" }}>📊 GROUP {g} FORM</div>
          <div style={{ display: "flex", gap: 8 }}>
            {([["Played", st.p], ["Won", st.w], ["Drawn", st.d], ["Lost", st.l], ["Pts", st.pts]] as [string, number][]).map(([k, v], i) => (
              <div key={k} style={{ flex: 1, textAlign: "center", border: "3px solid var(--ink)",
                borderRadius: 11, padding: "7px 0", background: i === 4 ? "var(--sun)" : "var(--cream)" }}>
                <div className="head" style={{ fontSize: 20 }}>{v}</div>
                <div style={{ fontSize: 9, fontWeight: 700, opacity: .6 }}>{k}</div>
              </div>
            ))}
          </div>

          {/* results */}
          {results.length > 0 && (
            <Fragment>
              <div className="head" style={{ fontSize: 14, margin: "16px 0 8px", letterSpacing: ".5px" }}>⚽ RESULTS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {results.map((r, i) => {
                  const win = (r.a === code && r.as > r.bs) || (r.b === code && r.bs > r.as);
                  const draw = r.as === r.bs;
                  return (
                    <div key={i} className="sticker-sm" style={{ display: "flex", alignItems: "center",
                      gap: 8, padding: "8px 12px", background: "var(--cream)" }}>
                      <Flag code={r.a} style={{ width: 26, height: 18 }} />
                      <span className="head" style={{ fontSize: 14, flex: 1 }}>{r.a}</span>
                      <span className="head" style={{ fontSize: 18 }}>{r.as}–{r.bs}</span>
                      <span className="head" style={{ fontSize: 14, flex: 1, textAlign: "right" }}>{r.b}</span>
                      <Flag code={r.b} style={{ width: 26, height: 18 }} />
                      <span className="head" style={{ fontSize: 11, width: 34, textAlign: "center",
                        color: win ? "var(--grass2)" : draw ? "var(--orange)" : "var(--tomato)" }}>
                        {win ? "WIN" : draw ? "DRAW" : "LOSS"}</span>
                    </div>
                  );
                })}
              </div>
            </Fragment>
          )}

          {/* backers */}
          <div className="head" style={{ fontSize: 14, margin: "16px 0 8px", letterSpacing: ".5px" }}>👀 WHO'S BACKING THEM</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {backers(code, people).map((p) => (
              <div key={p.id} className="flagchip tap" onClick={() => { onClose(); onPerson && onPerson(p); }}
                style={{ paddingLeft: 4 }}>
                <Avatar person={p} size={20} ring={false} />{p.name}
              </div>
            ))}
            {backers(code, people).length === 0 && (
              <span style={{ fontSize: 13, fontWeight: 700, opacity: .55 }}>Nobody picked them — bargain!</span>
            )}
          </div>

          {/* FIFA squad link */}
          {t.squad && (
            <a href={t.squad} target="_blank" rel="noopener noreferrer"
              className="head tap" style={{ display: "flex", alignItems: "center", justifyContent: "center",
                gap: 8, marginTop: 18, textDecoration: "none", background: "var(--blue)", color: "#fff",
                fontSize: 14, padding: "11px", borderRadius: 14, border: "3px solid var(--ink)",
                boxShadow: "3px 4px 0 rgba(27,42,74,.7)" }}>
              👥 VIEW SQUAD ON FIFA.COM →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function TeamsPage() {
  const app = useApp();
  const { people } = app;
  const wide = app.wide;
  const teams = useStore(selectTeams);
  const [open, setOpen] = useState<string | null>(null);
  const [tier, setTier] = useState("All");
  const tiers = ["All", "Favourite", "Contender", "Dark horse", "Host", "Outsider", "Longshot"];
  const codes = Object.keys(teams).filter((c) => tier === "All" || teams[c].tier === tier)
    .sort((a, b) => oddsNum(a) - oddsNum(b));

  return (
    <Fragment>
      <PageTitle sub={`${Object.keys(teams).length} nations · ${ELIMINATED.length} already out`}>TEAMS</PageTitle>

      {/* tier filter */}
      <div className="noscroll" style={{ display: "flex", gap: 8, overflowX: "auto", padding: "2px 0" }}>
        {tiers.map((tr) => (
          <div key={tr} className={"navpill tap" + (tr === tier ? " active" : "")}
            onClick={() => setTier(tr)} style={{ fontSize: 13, flex: "0 0 auto" }}>{tr}</div>
        ))}
      </div>

      <div style={{ display: "grid", gap: 13,
        gridTemplateColumns: wide ? "1fr 1fr 1fr" : "1fr 1fr" }}>
        {codes.map((c) => (
          <TeamCard key={c} code={c} people={people} onOpen={setOpen} wide={wide} />
        ))}
      </div>

      {open && <TeamPopup code={open} onClose={() => setOpen(null)} onPerson={app.openPerson} />}
    </Fragment>
  );
}

export { TeamCard, TeamPopup };
