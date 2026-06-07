// SPDX-License-Identifier: AGPL-3.0-or-later
// Accès au stockage local tolérant : certains contextes (webview Capacitor, navigation
// privée, environnement de test) n'exposent pas localStorage. On dégrade sans planter.

function backend(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export const storage = {
  get(key: string): string | null {
    try {
      return backend()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      backend()?.setItem(key, value);
    } catch {
      /* stockage indisponible : on ignore */
    }
  },
  remove(key: string): void {
    try {
      backend()?.removeItem(key);
    } catch {
      /* idem */
    }
  },
};
