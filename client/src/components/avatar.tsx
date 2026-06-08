import type { Person } from '../data/teams';

/* Photos only show on large avatars; smaller ones keep the coloured initials. */
const PHOTO_MIN_SIZE = 40;

/* ---------- Person avatar ---------- */
/* Circular avatar with the navy ring + hard shadow. Shows the player's photo
   when one is set AND the avatar is large (>= PHOTO_MIN_SIZE); otherwise the
   coloured initials. */
export function Avatar({
  person,
  size = 44,
  ring = true,
}: {
  person: Person;
  size?: number;
  ring?: boolean;
}) {
  const showPhoto = !!person.photo && size >= PHOTO_MIN_SIZE;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: showPhoto
          ? `center / cover no-repeat url(${JSON.stringify(person.photo)})`
          : person.colour,
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
        overflow: 'hidden',
      }}
    >
      {showPhoto ? '' : person.initials}
    </div>
  );
}
