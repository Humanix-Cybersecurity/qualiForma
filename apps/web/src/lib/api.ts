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
  refreshToken: string;
  tenantSlug: string;
}

/**
 * Rafraîchisseur de session enregistré par l'AuthProvider. Sur 401, `request` l'invoque
 * pour obtenir un nouvel `AuthState` (rotation du refresh token) puis rejoue la requête une fois.
 * Renvoie `null` si la session ne peut être renouvelée (déconnexion).
 */
let authRefresher: ((auth: AuthState) => Promise<AuthState | null>) | null = null;
export function setAuthRefresher(fn: ((auth: AuthState) => Promise<AuthState | null>) | null): void {
  authRefresher = fn;
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

export interface Profile {
  id: string;
  email: string;
  prenom: string | null;
  nom: string | null;
  role: Claims['role'];
  mfaEnabled: boolean;
  handicapAdaptations: string | null;
  createdAt: string;
}

export interface FormationRow {
  id: string;
  intitule: string;
  dureeHeures: string;
  tarifCents: number | null;
  actif: boolean;
  indicateursQualiopi: string[];
  _count: { sessions: number };
}

export interface SessionRow {
  id: string;
  intitule: string | null;
  formation: string;
  dateDebut: string;
  dateFin: string;
  statut: string;
  lieu: string | null;
  creneaux: number;
  inscrits: number;
}

export interface InscriptionRow {
  id: string;
  statut: string;
  formation: string;
  session: string | null;
  dateDebut: string;
  dateFin: string;
  certificat: { id: string; statut: string; numero: string } | null;
}

export interface QuestionnaireMine {
  id: string;
  type: string;
  titre: string;
  dejaSoumis: boolean;
  questions: { id: string; libelle: string; type: string; options: unknown; obligatoire: boolean }[];
}

export interface TenantRow {
  id: string;
  slug: string;
  name: string;
  status: string;
  utilisateurs: number;
  sessions: number;
  plan: string | null;
}

export interface PlanRow {
  id: string;
  code: string;
  name: string;
  priceCents: number;
  maxUsers: number | null;
}

export interface DevisRow {
  id: string;
  numero: string;
  statut: string;
  financeur: string | null;
  dateDevis: string;
  validiteJours: number;
  totalTtcCents: number;
  factureId: string | null;
}

export interface FactureRow {
  id: string;
  numero: string;
  statut: string;
  financeur: string | null;
  dateEmission: string;
  dateEcheance: string | null;
  totalTtcCents: number;
  payeCents: number;
  resteCents: number;
}

export interface Bpf {
  annee: number;
  produits: Record<string, { ht: number; ttc: number; nb: number }>;
  totalHtCents: number;
  totalTtcCents: number;
  nbSessions: number;
  heuresFormation: number;
  nbInscriptions: number;
  nbStagiairesDistincts: number;
  financeurLabels: Record<string, string>;
}

export interface LeconAdmin { id: string; titre: string; type: 'texte' | 'video' | 'pdf'; contenu: string | null; ordre: number }
export interface ModuleAdmin {
  id: string;
  formationId: string;
  titre: string;
  description: string | null;
  publie: boolean;
  lecons: LeconAdmin[];
  _count: { lecons: number };
}
export interface MonModule {
  id: string;
  titre: string;
  description: string | null;
  total: number;
  faits: number;
  progression: number;
  lecons: { id: string; titre: string; type: 'texte' | 'video' | 'pdf'; contenu: string | null; fait: boolean }[];
}

export interface PublicCatalogue {
  organisme: string;
  formations: {
    id: string;
    intitule: string;
    objectifs: string | null;
    prerequis: string | null;
    dureeHeures: number;
    tarifCents: number | null;
    modalitesAccesHandicap: string | null;
    sessions: { id: string; intitule: string | null; dateDebut: string; dateFin: string; lieu: string | null }[];
  }[];
}

export interface DemandeRow {
  id: string;
  sessionId: string | null;
  formationId: string | null;
  nom: string;
  prenom: string | null;
  email: string;
  telephone: string | null;
  message: string | null;
  statut: string;
  createdAt: string;
}

export interface AgendaItem {
  id: string;
  date: string;
  periode: 'matin' | 'apres_midi';
  heureDebut: string;
  heureFin: string;
  lieu: string | null;
  visioUrl: string | null;
  sessionId: string;
  formation: string;
  formateur: string | null;
  signatureOuverte: boolean;
  conflits: { type: 'formateur' | 'lieu'; avecCreneauId: string }[];
}
export interface AgendaResult {
  from: string;
  to: string;
  items: AgendaItem[];
  nbConflits: number;
}

export interface QualiopiIndicateur {
  numero: number;
  critere: number;
  critereLibelle: string;
  libelle: string;
  alternance: boolean;
  autoConforme: boolean | null;
  statut: 'conforme' | 'a_completer' | 'non_applicable';
  notes: string | null;
  documentId: string | null;
}
export interface QualiopiDashboard {
  criteres: Record<string, string>;
  indicateurs: QualiopiIndicateur[];
  score: number;
  conformes: number;
  applicables: number;
  total: number;
}

export interface DashboardStats {
  formationsActives: number;
  sessionsTotal: number;
  sessions: Record<string, number>;
  sessionsActives: number;
  inscriptionsActives: number;
  apprenants: number;
  heuresProgrammees: number;
  conventions: Record<string, { nb: number; montantCents: number }>;
  caSigneCents: number;
  reclamationsOuvertes: number;
  aCloturer: { id: string; intitule: string; dateFin: string }[];
  prochainesSessions: { id: string; intitule: string; dateDebut: string; inscrits: number }[];
}

export interface ConventionRow {
  id: string;
  numero: string;
  statut: string;
  montantCents: number | null;
  entreprise: string | null;
  formation: string | null;
  sessionId: string | null;
}

export interface CreneauRow {
  id: string;
  date: string;
  periode: 'matin' | 'apres_midi';
  heureDebut: string;
  heureFin: string;
  lieu: string | null;
  signatureOuverte: boolean;
  nbEmargements: number;
  scelle: boolean;
}

export interface InscritRow {
  inscriptionId: string;
  statut: string;
  apprenant: { id: string; email: string; prenom: string | null; nom: string | null };
  certificat: { id: string; statut: string; numero: string } | null;
}

export interface DocumentRow {
  id: string;
  type: string;
  scope: string;
  nomFichier: string;
  mimeType: string;
  tailleOctets: number;
  createdAt: string;
}

export interface UserRow {
  id: string;
  email: string;
  prenom: string | null;
  nom: string | null;
  role: 'apprenant' | 'formateur' | 'referent_handicap';
  isActive?: boolean;
}

export interface SessionCompletude {
  sessionId: string;
  intitule: string;
  statut: string;
  attendus: number;
  creneaux: {
    id: string;
    date: string;
    periode: 'matin' | 'apres_midi';
    apprenantsResolus: number;
    attendus: number;
    formateurSigne: boolean;
    scelle: boolean;
    horodatageQualifie: boolean;
  }[];
  alertes: string[];
  avertissements: string[];
  pret: boolean;
}

export interface ReclamationRow {
  id: string;
  objet: string;
  description: string;
  statut: string;
  createdAt: string;
  actions: { id: string; description: string }[];
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
  /** Interne : empêche une boucle de rafraîchissement (un seul rejeu après 401). */
  _retried?: boolean;
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

  // Access token expiré : on tente un rafraîchissement transparent puis on rejoue une fois.
  if (res.status === 401 && opts.auth && !opts._retried && authRefresher) {
    const next = await authRefresher(opts.auth);
    if (next) return request<T>(path, { ...opts, auth: next, _retried: true });
  }

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
  refresh(tenantSlug: string, refreshToken: string) {
    return request<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      method: 'POST',
      tenantSlug,
      body: { refreshToken },
    });
  },
  logout(auth: AuthState) {
    return request<void>('/auth/logout', {
      method: 'POST',
      tenantSlug: auth.tenantSlug,
      body: { refreshToken: auth.refreshToken },
    });
  },
  me(auth: AuthState) {
    return request<Claims>('/auth/me', { auth });
  },
  mfaSetup(auth: AuthState) {
    return request<{ secret: string; otpauthUrl: string }>('/auth/mfa/setup', { method: 'POST', auth });
  },
  mfaConfirm(auth: AuthState, code: string) {
    return request<void>('/auth/mfa/confirm', { method: 'POST', auth, body: { code } });
  },
  mesCreneaux(auth: AuthState) {
    return request<Creneau[]>('/me/creneaux', { auth });
  },
  signer(
    auth: AuthState,
    creneauId: string,
    body: {
      methode: 'code' | 'manuscrite' | 'qr' | 'lien';
      code?: string;
      jeton?: string;
      geoloc?: { lat: number; lng: number; accuracy?: number };
      consentementGeoloc?: boolean;
      timestampClient?: string;
    },
  ) {
    return request<{ verificationToken: string; statut: string }>(`/creneaux/${creneauId}/signer`, {
      method: 'POST',
      auth,
      body,
    });
  },
  genererJeton(auth: AuthState, creneauId: string) {
    return request<{ token: string; expiresAt: string; scope: string; url: string }>(
      `/creneaux/${creneauId}/jetons`,
      { method: 'POST', auth, body: {} },
    );
  },
  sceller(auth: AuthState, creneauId: string) {
    return request<{ nbSignatures: number; niveau: string; horodatageQualifie: boolean }>(
      `/creneaux/${creneauId}/sceller`,
      { method: 'POST', auth, body: {} },
    );
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

  // --- Profil ---
  getProfile(auth: AuthState) {
    return request<Profile>('/profile', { auth });
  },
  updateProfile(auth: AuthState, body: { prenom?: string | null; nom?: string | null; handicapAdaptations?: string | null }) {
    return request<Profile>('/profile', { method: 'PATCH', auth, body });
  },
  changePassword(auth: AuthState, currentPassword: string, newPassword: string) {
    return request<{ changed: boolean }>('/profile/password', { method: 'POST', auth, body: { currentPassword, newPassword } });
  },

  // --- Catalogue / apprenant ---
  formations(auth: AuthState) {
    return request<FormationRow[]>('/formations', { auth });
  },
  sessions(auth: AuthState) {
    return request<SessionRow[]>('/sessions', { auth });
  },
  myInscriptions(auth: AuthState) {
    return request<InscriptionRow[]>('/me/inscriptions', { auth });
  },
  createFormation(
    auth: AuthState,
    body: { intitule: string; dureeHeures: number; objectifs?: string; prerequis?: string; modalitesAccesHandicap?: string },
  ) {
    return request<{ id: string }>('/formations', { method: 'POST', auth, body });
  },
  createSession(
    auth: AuthState,
    body: { formationId: string; dateDebut: string; dateFin: string; intitule?: string; lieu?: string },
  ) {
    return request<{ id: string }>('/sessions', { method: 'POST', auth, body });
  },
  addCreneaux(
    auth: AuthState,
    sessionId: string,
    creneaux: { date: string; periode: 'matin' | 'apres_midi'; heureDebut: string; heureFin: string }[],
  ) {
    return request<{ id: string }[]>(`/sessions/${sessionId}/creneaux`, { method: 'POST', auth, body: { creneaux } });
  },
  enroll(auth: AuthState, sessionId: string, apprenantEmail: string) {
    return request<{ id: string }>(`/sessions/${sessionId}/inscriptions`, { method: 'POST', auth, body: { apprenantEmail } });
  },
  updateFormation(
    auth: AuthState,
    id: string,
    body: Partial<{ intitule: string; objectifs: string; prerequis: string; dureeHeures: number; tarifCents: number; modalitesAccesHandicap: string; indicateursQualiopi: string[] }>,
  ) {
    return request<{ id: string; intitule: string }>(`/formations/${id}`, { method: 'PATCH', auth, body });
  },
  listCreneaux(auth: AuthState, sessionId: string) {
    return request<CreneauRow[]>(`/sessions/${sessionId}/creneaux`, { auth });
  },
  deleteCreneau(auth: AuthState, creneauId: string) {
    return request<{ id: string; deleted: boolean }>(`/creneaux/${creneauId}`, { method: 'DELETE', auth });
  },
  listInscrits(auth: AuthState, sessionId: string) {
    return request<InscritRow[]>(`/sessions/${sessionId}/inscriptions`, { auth });
  },
  annulerInscription(auth: AuthState, inscriptionId: string) {
    return request<{ inscriptionId: string; statut: 'annulee' }>(`/inscriptions/${inscriptionId}/annuler`, { method: 'PATCH', auth });
  },
  listDocuments(auth: AuthState, params?: { scope?: string; sessionId?: string; formationId?: string }) {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return request<DocumentRow[]>(`/documents${q ? `?${q}` : ''}`, { auth });
  },

  // --- Comptes utilisateurs (admin OF) ---
  createUser(
    auth: AuthState,
    body: { email: string; prenom?: string; nom?: string; role: 'apprenant' | 'formateur' | 'referent_handicap'; password?: string },
  ) {
    return request<UserRow & { temporaryPassword?: string }>('/users', { method: 'POST', auth, body });
  },
  listUsers(auth: AuthState, role?: 'apprenant' | 'formateur' | 'referent_handicap') {
    return request<UserRow[]>(`/users${role ? `?role=${role}` : ''}`, { auth });
  },
  anonymiserUser(auth: AuthState, userId: string) {
    return request<unknown>(`/rgpd/users/${userId}/anonymiser`, { method: 'POST', auth });
  },
  updateUser(
    auth: AuthState,
    id: string,
    body: Partial<{ prenom: string | null; nom: string | null; role: 'apprenant' | 'formateur' | 'referent_handicap'; isActive: boolean }>,
  ) {
    return request<UserRow>(`/users/${id}`, { method: 'PATCH', auth, body });
  },
  deleteUser(auth: AuthState, id: string) {
    return request<{ id: string; deleted: boolean }>(`/users/${id}`, { method: 'DELETE', auth });
  },
  deleteDocument(auth: AuthState, id: string) {
    return request<{ id: string; deleted: boolean }>(`/documents/${id}`, { method: 'DELETE', auth });
  },
  completude(auth: AuthState, sessionId: string) {
    return request<SessionCompletude>(`/sessions/${sessionId}/completude`, { auth });
  },
  cloturerSession(auth: AuthState, sessionId: string, force = false) {
    return request<{ sessionId: string; statut: 'terminee'; force: boolean; alertes: string[] }>(
      `/sessions/${sessionId}/cloture`,
      { method: 'POST', auth, body: { force } },
    );
  },

  // --- Questionnaires ---
  questionnairesMine(auth: AuthState) {
    return request<QuestionnaireMine[]>('/questionnaires/mine', { auth });
  },
  soumettre(auth: AuthState, id: string, reponses: { questionId: string; valeur?: string }[]) {
    return request<{ soumissionId: string }>(`/questionnaires/${id}/soumettre`, { method: 'POST', auth, body: { reponses } });
  },
  questionnairesAdmin(auth: AuthState) {
    return request<{ id: string; type: string; titre: string; sessionId: string | null }[]>('/questionnaires', { auth });
  },
  createQuestionnaire(
    auth: AuthState,
    body: {
      type: 'positionnement_amont' | 'evaluation_acquis' | 'satisfaction_chaud' | 'satisfaction_froid' | 'recueil_besoin';
      titre: string;
      sessionId?: string;
      anonyme?: boolean;
      questions: { libelle: string; type: 'texte_libre' | 'choix_unique' | 'choix_multiple' | 'echelle' | 'booleen'; options?: unknown; obligatoire?: boolean }[];
    },
  ) {
    return request<{ id: string }>('/questionnaires', { method: 'POST', auth, body });
  },
  restitution(auth: AuthState, id: string) {
    return request<{
      questionnaire: { titre: string };
      nbSoumissions: number;
      nbAttendus: number;
      tauxCompletude: number;
      questions: {
        questionId: string;
        libelle: string;
        type: string;
        nbReponses: number;
        moyenne?: number;
        tauxVrai?: number;
        distribution?: Record<string, number>;
        verbatims?: string[];
      }[];
    }>(`/questionnaires/${id}/restitution`, { auth });
  },

  // --- Super-admin ---
  tenants(auth: AuthState) {
    return request<TenantRow[]>('/admin/tenants', { auth });
  },
  onboardTenant(auth: AuthState, body: { slug: string; name: string; adminEmail: string; adminPassword: string; planCode?: string }) {
    return request<{ tenantId: string; slug: string }>('/admin/tenants', { method: 'POST', auth, body });
  },
  setTenantStatus(auth: AuthState, id: string, status: 'active' | 'suspended') {
    return request<unknown>(`/admin/tenants/${id}/status`, { method: 'PATCH', auth, body: { status } });
  },
  setQuota(auth: AuthState, tenantId: string, body: { maxUsers?: number; maxActiveSessions?: number }) {
    return request<unknown>(`/admin/tenants/${tenantId}/quota`, { method: 'PUT', auth, body });
  },
  plans(auth: AuthState) {
    return request<PlanRow[]>('/admin/plans', { auth });
  },
  createPlan(
    auth: AuthState,
    body: { code: string; name: string; priceCents?: number; maxUsers?: number; maxActiveSessions?: number },
  ) {
    return request<{ id: string }>('/admin/plans', { method: 'POST', auth, body });
  },
  runRelances(auth: AuthState) {
    return request<{ relances: number }>('/admin/jobs/relancer', { method: 'POST', auth });
  },
  runPurge(auth: AuthState) {
    return request<{ emargements: number; scellements: number; audit: number }>('/admin/jobs/purger', { method: 'POST', auth });
  },

  // --- LMS / e-learning ---
  modules(auth: AuthState, formationId?: string) {
    return request<ModuleAdmin[]>(`/modules${formationId ? `?formationId=${formationId}` : ''}`, { auth });
  },
  createModule(auth: AuthState, body: { formationId: string; titre: string; description?: string; publie?: boolean }) {
    return request<{ id: string }>('/modules', { method: 'POST', auth, body });
  },
  updateModule(auth: AuthState, id: string, body: { titre?: string; description?: string; publie?: boolean }) {
    return request<{ id: string }>(`/modules/${id}`, { method: 'PATCH', auth, body });
  },
  deleteModule(auth: AuthState, id: string) {
    return request<{ id: string }>(`/modules/${id}`, { method: 'DELETE', auth });
  },
  addLecon(auth: AuthState, moduleId: string, body: { titre: string; type: 'texte' | 'video' | 'pdf'; contenu?: string }) {
    return request<{ id: string }>(`/modules/${moduleId}/lecons`, { method: 'POST', auth, body });
  },
  deleteLecon(auth: AuthState, id: string) {
    return request<{ id: string }>(`/lecons/${id}`, { method: 'DELETE', auth });
  },
  mesModules(auth: AuthState) {
    return request<MonModule[]>('/me/modules', { auth });
  },
  marquerLecon(auth: AuthState, leconId: string, fait: boolean) {
    return request<{ leconId: string; fait: boolean }>(`/lecons/${leconId}/progression`, { method: 'POST', auth, body: { fait } });
  },

  // --- Public (catalogue & préinscription, sans authentification) ---
  publicCatalogue(tenantSlug: string) {
    return request<PublicCatalogue>('/public/catalogue', { tenantSlug });
  },
  submitDemande(
    tenantSlug: string,
    body: { sessionId?: string; formationId?: string; nom: string; prenom?: string; email: string; telephone?: string; message?: string },
  ) {
    return request<{ id: string; recue: boolean }>('/public/demandes', { method: 'POST', tenantSlug, body });
  },
  demandes(auth: AuthState) {
    return request<DemandeRow[]>('/demandes', { auth });
  },
  setDemandeStatut(auth: AuthState, id: string, statut: 'nouvelle' | 'traitee' | 'convertie' | 'refusee') {
    return request<{ id: string; statut: string }>(`/demandes/${id}/statut`, { method: 'PATCH', auth, body: { statut } });
  },
  convertirDemande(auth: AuthState, id: string) {
    return request<{ demandeId: string; userId: string; temporaryPassword?: string }>(`/demandes/${id}/convertir`, { method: 'POST', auth });
  },

  // --- Conformité Qualiopi (RNQ) ---
  qualiopiIndicateurs(auth: AuthState) {
    return request<QualiopiDashboard>('/qualiopi/indicateurs', { auth });
  },
  setIndicateurStatut(
    auth: AuthState,
    numero: number,
    body: { statut?: 'conforme' | 'a_completer' | 'non_applicable'; notes?: string | null; documentId?: string | null },
  ) {
    return request<{ numero: number; statut: string }>(`/qualiopi/indicateurs/${numero}`, { method: 'PUT', auth, body });
  },

  // --- Planning / agenda ---
  agenda(auth: AuthState, from: string, to: string, formateurId?: string) {
    const q = new URLSearchParams({ from, to, ...(formateurId ? { formateurId } : {}) }).toString();
    return request<AgendaResult>(`/agenda?${q}`, { auth });
  },

  // --- Pilotage / statistiques ---
  statsDashboard(auth: AuthState) {
    return request<DashboardStats>('/stats/dashboard', { auth });
  },

  // --- Facturation (gestion commerciale) ---
  factures(auth: AuthState) {
    return request<FactureRow[]>('/factures', { auth });
  },
  financeurs(auth: AuthState) {
    return request<{ value: string; label: string }[]>('/factures/financeurs', { auth });
  },
  createFacture(
    auth: AuthState,
    body: {
      sessionId?: string;
      entrepriseId?: string;
      financeur?: string;
      dateEcheance?: string;
      notes?: string;
      lignes: { designation: string; quantite?: number; prixUnitaireCents: number; tvaTauxBp?: number }[];
    },
  ) {
    return request<{ id: string; numero: string; statut: string; totalTtcCents: number }>('/factures', { method: 'POST', auth, body });
  },
  addPaiement(auth: AuthState, factureId: string, body: { montantCents: number; moyen?: string; reference?: string; datePaiement?: string }) {
    return request<{ statut: string; payeCents: number; resteCents: number }>(`/factures/${factureId}/paiements`, { method: 'POST', auth, body });
  },
  annulerFacture(auth: AuthState, id: string) {
    return request<{ id: string; statut: string }>(`/factures/${id}/annuler`, { method: 'PATCH', auth });
  },
  bpf(auth: AuthState, annee: number) {
    return request<Bpf>(`/factures/bpf?annee=${annee}`, { auth });
  },

  // --- Devis ---
  devis(auth: AuthState) {
    return request<DevisRow[]>('/devis', { auth });
  },
  createDevis(
    auth: AuthState,
    body: {
      sessionId?: string;
      entrepriseId?: string;
      financeur?: string;
      validiteJours?: number;
      notes?: string;
      lignes: { designation: string; quantite?: number; prixUnitaireCents: number; tvaTauxBp?: number }[];
    },
  ) {
    return request<{ id: string; numero: string; statut: string; totalTtcCents: number }>('/devis', { method: 'POST', auth, body });
  },
  setDevisStatut(auth: AuthState, id: string, statut: 'brouillon' | 'envoye' | 'accepte' | 'refuse' | 'expire') {
    return request<{ id: string; statut: string }>(`/devis/${id}/statut`, { method: 'PATCH', auth, body: { statut } });
  },
  convertirDevis(auth: AuthState, id: string) {
    return request<{ devisId: string; factureId: string; numero: string }>(`/devis/${id}/convertir`, { method: 'POST', auth });
  },

  // --- Conventions ---
  conventions(auth: AuthState) {
    return request<ConventionRow[]>('/conventions', { auth });
  },
  entreprises(auth: AuthState) {
    return request<{ id: string; raisonSociale: string; siret: string | null }[]>('/conventions/entreprises', { auth });
  },
  createConvention(
    auth: AuthState,
    body: {
      sessionId: string;
      entrepriseId?: string;
      entreprise?: { raisonSociale: string; siret?: string; adresse?: string; contactEmail?: string; contactNom?: string };
      montantCents?: number;
    },
  ) {
    return request<{ id: string; numero: string; statut: string }>('/conventions', { method: 'POST', auth, body });
  },
  setConventionStatut(auth: AuthState, id: string, statut: 'brouillon' | 'envoyee' | 'signee' | 'annulee') {
    return request<{ id: string; statut: string }>(`/conventions/${id}/statut`, { method: 'PATCH', auth, body: { statut } });
  },

  // --- Réclamations / amélioration continue ---
  reclamations(auth: AuthState) {
    return request<ReclamationRow[]>('/reclamations', { auth });
  },
  createReclamation(auth: AuthState, body: { objet: string; description: string }) {
    return request<{ id: string }>('/reclamations', { method: 'POST', auth, body });
  },
  setReclamationStatut(auth: AuthState, id: string, statut: string) {
    return request<unknown>(`/reclamations/${id}/statut`, { method: 'PATCH', auth, body: { statut } });
  },
  addReclamationAction(auth: AuthState, id: string, description: string) {
    return request<{ id: string }>(`/reclamations/${id}/actions`, { method: 'POST', auth, body: { description } });
  },
};

/** Télécharge un fichier protégé (en-têtes auth) et déclenche l'enregistrement navigateur. */
export async function downloadFile(auth: AuthState, path: string, filename: string): Promise<void> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'x-tenant-slug': auth.tenantSlug, Authorization: `Bearer ${auth.token}` },
  });
  if (!res.ok) throw new ApiError(`Erreur ${res.status}`, res.status);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Récupère un fichier protégé et l'ouvre dans un nouvel onglet (visualisation inline, ex. PDF). */
export async function viewFile(auth: AuthState, path: string): Promise<void> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'x-tenant-slug': auth.tenantSlug, Authorization: `Bearer ${auth.token}` },
  });
  if (!res.ok) throw new ApiError(`Erreur ${res.status}`, res.status);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  // Libère l'URL après ouverture (laisse le temps au nouvel onglet de charger).
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Upload multipart d'un document. */
export async function uploadDocument(
  auth: AuthState,
  file: File,
  meta: { type: string; scope: string },
): Promise<{ id: string; nomFichier: string; scanStatus: string }> {
  const form = new FormData();
  form.append('file', file);
  form.append('type', meta.type);
  form.append('scope', meta.scope);
  const res = await fetch(`${API_URL}/documents`, {
    method: 'POST',
    headers: { 'x-tenant-slug': auth.tenantSlug, Authorization: `Bearer ${auth.token}` },
    body: form,
  });
  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    try {
      const d = (await res.json()) as { message?: string };
      if (d.message) message = d.message;
    } catch {
      /* ignore */
    }
    throw new ApiError(message, res.status);
  }
  return (await res.json()) as { id: string; nomFichier: string; scanStatus: string };
}

export { API_URL };
