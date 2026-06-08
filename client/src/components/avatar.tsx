import type { Person } from '../data/teams';

/* ---------- Person avatar ---------- */
/* Circular initials avatar with the navy ring + hard shadow. */
export function Avatar({
  person,
  size = 44,
  ring = true,
}: {
  person: Person;
  size?: number;
  ring?: boolean;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: person.colour,
        border: ring ? '3px solid var(--ink)' : 'none',
        boxShadow: ring ? '2px 2px 0 rgba(27,42,74,.85)' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--head)',
        color: '#fff',
        fontSize: size * 0.36,
        letterSpacing: '1px',
        flex: '0 0 auto',
        textShadow: '0 2px 0 rgba(27,42,74,.4)',
      }}
    >
      {person.initials}
    </div>
  );
}
