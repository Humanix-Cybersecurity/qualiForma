// SPDX-License-Identifier: AGPL-3.0-or-later
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { BrowserRouter } from 'react-router-dom';
import { createI18n } from '@humanix/i18n';
import { AuthProvider } from './auth/AuthProvider';
import { App } from './App';
import './index.css';

const i18n = createI18n();

// PWA : recharge automatiquement quand un nouveau Service Worker prend le contrôle,
// pour éviter qu'un onglet ne serve une version applicative obsolète (cache Workbox).
if ('serviceWorker' in navigator) {
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });
}

const root = document.getElementById('root');
if (!root) throw new Error('Élément #root introuvable.');

createRoot(root).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </I18nextProvider>
  </StrictMode>,
);
