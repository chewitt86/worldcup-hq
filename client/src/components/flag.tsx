/* World Cup HQ — flag chip components.
   Ported byte-for-byte from the prototype's home/components.jsx. */

import type { CSSProperties } from 'react';
import { flagCss } from '../data/flags';

/* ---------- Flag chip ---------- */
export function Flag({
  code,
  knocked,
  style,
}: {
  code: string;
  knocked?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span
      className={'flag' + (knocked ? ' knocked' : '')}
      style={{ background: flagCss(code), ...style }}
    />
  );
}

export function FlagChip({
  code,
  knocked,
  onClick,
}: {
  code: string;
  knocked?: boolean;
  onClick?: () => void;
}) {
  return (
    <span
      className={'flagchip tap' + (knocked ? '' : '')}
      onClick={onClick}
      style={{
        opacity: knocked ? 0.6 : 1,
        textDecoration: knocked ? 'line-through' : 'none',
      }}
    >
      <Flag code={code} knocked={knocked} />
      {code}
    </span>
  );
}
