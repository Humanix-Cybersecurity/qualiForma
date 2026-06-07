// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@humanix/ui';
import { useAuth } from '../auth/AuthProvider';
import { api, type Profile } from '../lib/api';
import { navForRole } from '../nav';
import { PageHeader } from '../components/PageHeader';

export function DashboardPage() {
  const { t } = useTranslation();
  const { claims, auth } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (auth) api.getProfile(auth).then(setProfile).catch(() => undefined);
  }, [auth]);

  if (!claims) return null;
  // Accès rapides = entrées de navigation hors tableau de bord lui-même.
  const items = navForRole(claims.role).filter((i) => i.to !== '/app');
  const hello = [profile?.prenom, profile?.nom].filter(Boolean).join(' ') || profile?.email || '';

  return (
    <>
      <PageHeader
        title={`${t('dashboard.welcome')}${hello ? `, ${hello}` : ''}`}
        description={t('app.tagline')}
      />
      <div className="mb-6 flex items-center gap-2 text-sm text-slate-600">
        <span>{t('dashboard.yourRole')} :</span>
        <Badge tone="brand">{t(`roles.${claims.role}`)}</Badge>
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
        {t('dashboard.quickAccess')}
      </h2>
      {items.length === 0 ? (
        <p className="text-slate-500">{t('common.none')}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-card transition-colors hover:border-brand-300 hover:bg-brand-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                <item.icon aria-hidden="true" className="h-6 w-6" />
              </span>
              <span className="flex-1 font-medium text-slate-900">{t(`nav.${item.labelKey}`)}</span>
              <ArrowRight
                aria-hidden="true"
                className="h-5 w-5 text-slate-300 transition-colors group-hover:text-brand-600"
              />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
