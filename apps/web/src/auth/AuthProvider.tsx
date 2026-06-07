// SPDX-License-Identifier: AGPL-3.0-or-later
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api, setAuthRefresher, type AuthState, type Claims } from '../lib/api';
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
  // Rafraîchissement single-flight : les 401 concurrents partagent la même promesse
  // (sinon la rotation côté serveur invaliderait les refresh tokens en course).
  const refreshing = useRef<Promise<AuthState | null> | null>(null);

  // Enregistre le rafraîchisseur transparent pour le client API (rejeu après 401).
  useEffect(() => {
    setAuthRefresher(async (current) => {
      if (!refreshing.current) {
        refreshing.current = (async () => {
          try {
            const tokens = await api.refresh(current.tenantSlug, current.refreshToken);
            const next: AuthState = {
              token: tokens.accessToken,
              refreshToken: tokens.refreshToken,
              tenantSlug: current.tenantSlug,
            };
            storage.set(STORAGE_KEY, JSON.stringify(next));
            setAuth(next);
            return next;
          } catch {
            storage.remove(STORAGE_KEY);
            setAuth(null);
            return null;
          } finally {
            refreshing.current = null;
          }
        })();
      }
      return refreshing.current;
    });
    return () => setAuthRefresher(null);
  }, []);

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
        const next: AuthState = {
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tenantSlug,
        };
        storage.set(STORAGE_KEY, JSON.stringify(next));
        setAuth(next);
      },
      logout() {
        // Révoque le refresh token côté serveur (best-effort) avant de purger la session locale.
        if (auth) void api.logout(auth).catch(() => undefined);
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
