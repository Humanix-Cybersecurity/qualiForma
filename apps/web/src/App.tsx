// SPDX-License-Identifier: AGPL-3.0-or-later
import { useTranslation } from 'react-i18next';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CreneauxPage } from './pages/CreneauxPage';
import { SignerPage } from './pages/SignerPage';
import { VerificationPage } from './pages/VerificationPage';
import { AccessibilitePage } from './pages/AccessibilitePage';
import type { JSX } from 'react';

function RequireAuth({ children }: { children: JSX.Element }) {
  const { auth } = useAuth();
  return auth ? children : <Navigate to="/login" replace />;
}

export function App() {
  const { t } = useTranslation();
  return (
    <>
      <a href="#contenu" className="skip-link">
        {t('common.back')}
      </a>
      <main id="contenu" className="mx-auto max-w-2xl p-4">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/accessibilite" element={<AccessibilitePage />} />
          <Route path="/verification/:token" element={<VerificationPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <DashboardPage />
              </RequireAuth>
            }
          />
          <Route
            path="/creneaux"
            element={
              <RequireAuth>
                <CreneauxPage />
              </RequireAuth>
            }
          />
          <Route
            path="/creneaux/:id/signer"
            element={
              <RequireAuth>
                <SignerPage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="mx-auto max-w-2xl border-t border-slate-200 p-4 text-sm">
        <a href="/accessibilite" className="text-blue-700 underline underline-offset-2">
          {t('a11y.link')}
        </a>
      </footer>
    </>
  );
}
