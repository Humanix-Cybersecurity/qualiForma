// SPDX-License-Identifier: AGPL-3.0-or-later
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@humanix/ui';
import { useAuth } from '../auth/AuthProvider';

export function DashboardPage() {
  const { t } = useTranslation();
  const { claims, logout } = useAuth();
  if (!claims) return <p>{t('common.loading')}</p>;

  const roleLabel = t(`roles.${claims.role}`);

  return (
    <section aria-labelledby="dash-title" className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 id="dash-title" className="text-xl font-bold text-slate-900">
          {t('dashboard.title')}
        </h1>
        <Button variant="secondary" onPress={logout}>
          {t('common.logout')}
        </Button>
      </header>
      <p className="text-slate-700">
        {t('dashboard.yourRole')} : <strong>{roleLabel}</strong>
      </p>
      {(claims.role === 'apprenant' || claims.role === 'formateur') && (
        <Link
          to="/creneaux"
          className="text-blue-700 underline underline-offset-2 focus-visible:outline-2"
        >
          {t('creneaux.title')}
        </Link>
      )}
    </section>
  );
}
