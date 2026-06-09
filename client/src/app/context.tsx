/* World Cup HQ — app context: the contract every page/component consumes.
 * Ported from home/app-core.jsx (WCHQContext + useApp). The shell provides the
 * concrete value in Phase 5; here we only define the typed contract. */

import { createContext, useContext } from 'react';
import type { Person } from '../data/teams';

/* The shared app context value. Mirrors the members the prototype wired onto
 * WCHQContext, now fully typed for consumers. */
export interface AppContextValue {
  wide: boolean;
  page: string;
  go: (name: string) => void;
  ping: (msg: string) => void;
  burst: () => void;
  goalCelebrate: () => void;
  openPerson: (p: Person) => void;
  /* open the shared country/team popup (from any page) */
  openTeam: (code: string) => void;
  /* a team the Map should zoom to on its next render (set by "View on map") */
  mapFocus: string | null;
  setMapFocus: (code: string | null) => void;
  reminders: Set<string>;
  toggleReminder: (id: string) => void;
  adminAuthed: boolean;
  setAdminAuthed: (b: boolean) => void;
  settings: any;
  people: Person[];
}

export const WCHQContext = createContext<AppContextValue | null>(null);

/* Access the app context; throws if used outside the provider. */
export function useApp(): AppContextValue {
  const ctx = useContext(WCHQContext);
  if (!ctx) throw new Error('useApp must be used within a WCHQContext provider');
  return ctx;
}
