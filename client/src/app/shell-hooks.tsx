/* World Cup HQ — shell hooks: responsive breakpoint + persisted reminders.
   Ported from home/app.jsx (useWide + useReminders). British English throughout. */

import { useState, useEffect } from 'react';

/* responsive — true when the viewport is at least `bp` pixels wide */
export function useWide(bp = 760): boolean {
  const [wide, setWide] = useState(typeof window !== 'undefined' ? window.innerWidth >= bp : false);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width:${bp}px)`);
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [bp]);
  return wide;
}

/* persisted match reminders — a Set of match ids mirrored to localStorage */
export function useReminders(): [Set<string>, (id: string) => void] {
  const KEY = 'wchq.reminders';
  const [set, setSet] = useState<Set<string>>(() => {
    try {
      return new Set<string>(JSON.parse(localStorage.getItem(KEY) || '[]'));
    } catch {
      return new Set<string>();
    }
  });
  const toggle = (id: string) =>
    setSet((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      try {
        localStorage.setItem(KEY, JSON.stringify([...next]));
      } catch {
        /* ignore quota/availability errors */
      }
      return next;
    });
  return [set, toggle];
}
