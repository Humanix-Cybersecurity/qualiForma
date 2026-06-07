// SPDX-License-Identifier: AGPL-3.0-or-later
import { useTranslation } from 'react-i18next';
import { Navigate, Route, Routes } from 'react-router-dom';
import type { JSX } from 'react';
import { useAuth } from './auth/AuthProvider';
import type { Claims } from './lib/api';
import { AppShell } from './components/AppShell';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilPage } from './pages/ProfilPage';
import { CreneauxPage } from './pages/CreneauxPage';
import { SignerPage } from './pages/SignerPage';
import { QuestionnairesPage } from './pages/QuestionnairesPage';
import { AttestationsPage } from './pages/AttestationsPage';
import { FormationsPage } from './pages/FormationsPage';
import { SessionsPage } from './pages/SessionsPage';
import { UtilisateursPage } from './pages/UtilisateursPage';
import { ConventionsPage } from './pages/ConventionsPage';
import { FacturationPage } from './pages/FacturationPage';
import { DevisPage } from './pages/DevisPage';
import { QualiopiPage } from './pages/QualiopiPage';
import { CataloguePublicPage } from './pages/CataloguePublicPage';
import { DemandesPage } from './pages/DemandesPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { AdminTenantsPage } from './pages/AdminTenantsPage';
import { AdminPlansPage } from './pages/AdminPlansPage';
import { ReclamationsPage } from './pages/ReclamationsPage';
import { VerificationPage } from './pages/VerificationPage';
import { AccessibilitePage } from './pages/AccessibilitePage';

function RequireAuth({ children }: { children: JSX.Element }) {
  const { auth } = useAuth();
  return auth ? children : <Navigate to="/login" replace />;
}

/** Restreint une route à certains rôles ; sinon renvoie au tableau de bord. */
function RoleRoute({ roles, children }: { roles: Claims['role'][]; children: JSX.Element }) {
  const { claims } = useAuth();
  if (!claims) return null;
  return roles.includes(claims.role) ? children : <Navigate to="/app" replace />;
}

export function App() {
  const { t } = useTranslation();
  return (
    <>
      <a href="#contenu" className="skip-link">
        {t('common.skipToContent')}
      </a>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/accessibilite" element={<AccessibilitePage />} />
        <Route path="/verification/:token" element={<VerificationPage />} />
        <Route path="/catalogue/:slug" element={<CataloguePublicPage />} />

        {/* Espace authentifié */}
        <Route
          path="/app"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="profil" element={<ProfilPage />} />
          <Route path="creneaux" element={<RoleRoute roles={['apprenant', 'formateur']}><CreneauxPage /></RoleRoute>} />
          <Route path="creneaux/:id/signer" element={<RoleRoute roles={['apprenant', 'formateur']}><SignerPage /></RoleRoute>} />
          <Route path="questionnaires" element={<RoleRoute roles={['apprenant', 'admin_of']}><QuestionnairesPage /></RoleRoute>} />
          <Route path="qualiopi" element={<RoleRoute roles={['admin_of', 'formateur']}><QualiopiPage /></RoleRoute>} />
          <Route path="attestations" element={<RoleRoute roles={['apprenant']}><AttestationsPage /></RoleRoute>} />
          <Route path="formations" element={<RoleRoute roles={['admin_of', 'formateur']}><FormationsPage /></RoleRoute>} />
          <Route path="sessions" element={<RoleRoute roles={['admin_of', 'formateur']}><SessionsPage /></RoleRoute>} />
          <Route path="utilisateurs" element={<RoleRoute roles={['admin_of']}><UtilisateursPage /></RoleRoute>} />
          <Route path="conventions" element={<RoleRoute roles={['admin_of']}><ConventionsPage /></RoleRoute>} />
          <Route path="devis" element={<RoleRoute roles={['admin_of']}><DevisPage /></RoleRoute>} />
          <Route path="facturation" element={<RoleRoute roles={['admin_of']}><FacturationPage /></RoleRoute>} />
          <Route path="documents" element={<RoleRoute roles={['admin_of']}><DocumentsPage /></RoleRoute>} />
          <Route path="reclamations" element={<RoleRoute roles={['admin_of', 'formateur', 'apprenant', 'referent_handicap']}><ReclamationsPage /></RoleRoute>} />
          <Route path="demandes" element={<RoleRoute roles={['admin_of']}><DemandesPage /></RoleRoute>} />
          <Route path="tenants" element={<RoleRoute roles={['super_admin']}><AdminTenantsPage /></RoleRoute>} />
          <Route path="plans" element={<RoleRoute roles={['super_admin']}><AdminPlansPage /></RoleRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
