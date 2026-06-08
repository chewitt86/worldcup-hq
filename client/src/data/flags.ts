/* World Cup HQ — sticker-album flag CSS.
   Ported verbatim from the prototype's flagCss (data.js), typed.
   Builds a CSS background value from a team's colour bands + orientation. */

import { TEAMS } from './teams';
import type { Team } from './teams';

export function flagCss(t: string | Team): string {
  const team = typeof t === 'string' ? TEAMS[t] : t;
  if (!team) return '#ccc';
  const c = team.bands;
  if (team.dir === 'v') {
    const step = 100 / c.length;
    const stops = c.map((col, i) => `${col} ${i * step}% ${(i + 1) * step}%`).join(', ');
    return `linear-gradient(90deg, ${stops})`;
  }
  if (team.dir === 'cross') {
    return `${c[1]} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='16'%3E%3Crect width='22' height='16' fill='${encodeURIComponent(c[0])}'/%3E%3Crect x='9' width='4' height='16' fill='${encodeURIComponent(c[1])}'/%3E%3Crect y='6' width='22' height='4' fill='${encodeURIComponent(c[1])}'/%3E%3C/svg%3E")`;
  }
  if (team.dir === 'centre') {
    return `radial-gradient(circle at 50% 50%, ${c[1]} 0 30%, ${c[0]} 31%)`;
  }
  const step = 100 / c.length;
  const stops = c.map((col, i) => `${col} ${i * step}% ${(i + 1) * step}%`).join(', ');
  return `linear-gradient(180deg, ${stops})`;
}
