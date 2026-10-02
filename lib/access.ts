'use client';
import { CONFIG } from './config';
import { rpc } from './odoo';

let cache: Promise<Set<string>> | null = null;
const KEY = (uid: number) => `otm.access.${uid}`;
const uidNow = () => {
  try { const m = document.cookie.split('; ').find((c) => c.startsWith('otm_user=')); return m ? JSON.parse(decodeURIComponent(m.split('=')[1])).uid : 0; } catch { return 0; }
};

/** Last known access list for this user, so the menu renders instantly and correctly on refresh. */
export function cachedAccess(): Set<string> | null {
  try { const v = localStorage.getItem(KEY(uidNow())); return v ? new Set(JSON.parse(v)) : null; } catch { return null; }
}

/** Models the signed-in user may read (Odoo's own access rights decide). Always re-checked once per page load. */
export function loadAccess(): Promise<Set<string>> {
  if (!cache) {
    cache = Promise.all(CONFIG.map(async (c) => {
      try { return (await rpc<boolean>(c.model, 'has_access', [[], 'read'])) ? c.model : null; } catch { return null; }
    })).then((r) => {
      const set = new Set(r.filter(Boolean) as string[]);
      try { localStorage.setItem(KEY(uidNow()), JSON.stringify([...set])); } catch { /* ignore */ }
      return set;
    });
  }
  return cache;
}
export const resetAccess = () => {
  cache = null;
  try { localStorage.removeItem(KEY(uidNow())); } catch { /* ignore */ }
};
