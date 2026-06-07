// SPDX-License-Identifier: AGPL-3.0-or-later
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type AuthState, type Claims } from '../lib/api';
import { storage } from '../lib/storage';
import { flushQueue } from '../lib/offline';

interface AuthContextValue {
  auth: AuthState | null;
  claims: Claims | null;
  login: (tenantSlug: string, email: string, password: string, totp?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = 'humanix.auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState | null>(() => {
    const raw = storage.get(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthState) : null;
  });
  const [claims, setClaims] = useState<Claims | null>(null);

  useEffect(() => {
    if (!auth) {
      setClaims(null);
      return;
    }
    api
      .me(auth)
      .then(setClaims)
      .catch(() => {
        // Jeton invalide/expiré : on réinitialise la session.
        storage.remove(STORAGE_KEY);
        setAuth(null);
      });
  }, [auth]);

  // Synchronise la file d'émargement hors-ligne au montage puis à chaque reconnexion réseau.
  useEffect(() => {
    if (!auth) return;
    const flush = () => {
      void flushQueue((item) => api.signer(auth, item.creneauId, item.body).then(() => undefined));
    };
    flush();
    window.addEventListener('online', flush);
    return () => window.removeEventListener('online', flush);
  }, [auth]);

  const value = useMemo<AuthContextValue>(
    () => ({
      auth,
      claims,
      async login(tenantSlug, email, password, totp) {
        const tokens = await api.login(tenantSlug, email, password, totp);
        const next: AuthState = { token: tokens.accessToken, tenantSlug };
        storage.set(STORAGE_KEY, JSON.stringify(next));
        setAuth(next);
      },
      logout() {
        storage.remove(STORAGE_KEY);
        setAuth(null);
      },
    }),
    [auth, claims],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth hors AuthProvider.');
  return ctx;
}
