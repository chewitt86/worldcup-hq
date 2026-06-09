/* World Cup HQ — shared modal backdrop.
   Rendered through a portal to <body> so it covers (and blurs) the WHOLE
   viewport regardless of how far the page has scrolled or how tall it is, and
   sits above every other layer (nav, mascot, toast). It deliberately does NOT
   close on a backdrop click — only the card's × button or the Escape key
   dismiss it — and, being outside the scroll container, it also stops the page
   scrolling behind it while the card keeps its own internal scroll. */

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function ModalOverlay({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(27,42,74,.5)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18,
      animation: 'wchq-fade .18s ease-out' }}>
      {children}
    </div>,
    document.body,
  );
}
