// SPDX-License-Identifier: AGPL-3.0-or-later
const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

export interface Claims {
  sub: string;
  tid: string;
  role: 'super_admin' | 'admin_of' | 'formateur' | 'apprenant' | 'referent_handicap';
  mfa: boolean;
}

export interface AuthState {
  token: string;
  tenantSlug: string;
}

export interface Creneau {
  id: string;
  sessionId: string;
  date: string;
  periode: 'matin' | 'apres_midi';
  heureDebut: string;
  heureFin: string;
  lieu: string | null;
  formationIntitule: string;
  signatureOuverte: boolean;
  monStatut: 'en_attente' | 'signe' | 'refuse' | 'absent';
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: AuthState;
  tenantSlug?: string;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const tenant = opts.tenantSlug ?? opts.auth?.tenantSlug;
  if (tenant) headers['x-tenant-slug'] = tenant;
  if (opts.auth) headers.Authorization = `Bearer ${opts.auth.token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
  });

  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    try {
      const data = (await res.json()) as { message?: string };
      if (data.message) message = data.message;
    } catch {
      /* corps non JSON */
    }
    throw new ApiError(message, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  login(tenantSlug: string, email: string, password: string, totp?: string) {
    return request<{ accessToken: string; refreshToken: string }>('/auth/login', {
      method: 'POST',
      tenantSlug,
      body: { email, password, ...(totp ? { totp } : {}) },
    });
  },
  me(auth: AuthState) {
    return request<Claims>('/auth/me', { auth });
  },
  mesCreneaux(auth: AuthState) {
    return request<Creneau[]>('/me/creneaux', { auth });
  },
  signer(auth: AuthState, creneauId: string, methode: 'code' | 'manuscrite', code?: string) {
    return request<{ verificationToken: string; statut: string }>(`/creneaux/${creneauId}/signer`, {
      method: 'POST',
      auth,
      body: { methode, ...(code ? { code } : {}) },
    });
  },
  ouvrirSignature(auth: AuthState, creneauId: string) {
    return request<{ code: string }>(`/creneaux/${creneauId}/signature/ouvrir`, {
      method: 'POST',
      auth,
    });
  },
  fermerSignature(auth: AuthState, creneauId: string) {
    return request<void>(`/creneaux/${creneauId}/signature/fermer`, { method: 'POST', auth });
  },
  etatCreneau(auth: AuthState, creneauId: string) {
    return request<{
      completude: { complet: boolean; manquants: string[]; apprenantsSignes: number };
      apprenants: { nom: string; statut: string }[];
      formateur: { statut: string };
    }>(`/creneaux/${creneauId}/emargement`, { auth });
  },
  verifier(tenantSlug: string, token: string) {
    return request<{
      authentique: boolean;
      signatureLevel: string;
      timestampServeur: string | null;
      creneau: { date: string; periode: string };
    }>(`/verification/${token}`, { tenantSlug });
  },
};

export { API_URL };
