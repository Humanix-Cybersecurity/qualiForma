// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, BadgeEuro, BookOpen, CalendarCheck, Clock, MessageSquareWarning, Users } from 'lucide-react';
import { Badge, Card } from '@humanix/ui';
import { useAuth } from '../auth/AuthProvider';
import { api, type DashboardStats, type Profile } from '../lib/api';
import { navForRole } from '../nav';
import { PageHeader } from '../components/PageHeader';

export function DashboardPage() {
  const { t } = useTranslation();
  const { claims, auth } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    if (auth) api.getProfile(auth).then(setProfile).catch(() => undefined);
  }, [auth]);
  useEffect(() => {
    if (auth && (claims?.role === 'admin_of' || claims?.role === 'formateur')) {
      api.statsDashboard(auth).then(setStats).catch(() => undefined);
    }
  }, [auth, claims?.role]);

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

      {stats ? (
        <section className="mb-8" aria-label={t('dashboard.kpiTitle')}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">{t('dashboard.kpiTitle')}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi icon={CalendarCheck} label={t('dashboard.kpiSessionsActives')} value={stats.sessionsActives} sub={`${stats.sessionsTotal} ${t('dashboard.kpiTotal')}`} />
            <Kpi icon={Users} label={t('dashboard.kpiApprenants')} value={stats.apprenants} sub={`${stats.inscriptionsActives} ${t('dashboard.kpiInscriptions')}`} />
            <Kpi icon={Clock} label={t('dashboard.kpiHeures')} value={`${stats.heuresProgrammees} h`} />
            <Kpi icon={BadgeEuro} label={t('dashboard.kpiCa')} value={`${(stats.caSigneCents / 100).toLocaleString('fr-FR')} €`} sub={t('dashboard.kpiCaSub')} />
            <Kpi icon={BookOpen} label={t('dashboard.kpiFormations')} value={stats.formationsActives} />
            <Kpi icon={MessageSquareWarning} label={t('dashboard.kpiReclamations')} value={stats.reclamationsOuvertes} tone={stats.reclamationsOuvertes > 0 ? 'warn' : undefined} />
            <Kpi icon={AlertTriangle} label={t('dashboard.kpiACloturer')} value={stats.aCloturer.length} tone={stats.aCloturer.length > 0 ? 'warn' : undefined} />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <h3 className="mb-2 font-medium text-slate-900">{t('dashboard.prochaines')}</h3>
              {stats.prochainesSessions.length === 0 ? (
                <p className="text-sm text-slate-500">{t('dashboard.aucuneSession')}</p>
              ) : (
                <ul className="flex flex-col gap-1 text-sm">
                  {stats.prochainesSessions.map((s) => (
                    <li key={s.id} className="flex justify-between gap-3">
                      <Link to="/app/sessions" className="text-brand-700 hover:underline">{s.intitule}</Link>
                      <span className="text-slate-500">{s.dateDebut.slice(0, 10)} · {s.inscrits} inscrit(s)</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            {stats.aCloturer.length > 0 ? (
              <Card>
                <h3 className="mb-2 font-medium text-slate-900">{t('dashboard.aCloturerTitre')}</h3>
                <ul className="flex flex-col gap-1 text-sm">
                  {stats.aCloturer.map((s) => (
                    <li key={s.id} className="flex justify-between gap-3">
                      <Link to="/app/sessions" className="text-brand-700 hover:underline">{s.intitule}</Link>
                      <span className="text-amber-700">{t('dashboard.finie')} {s.dateFin.slice(0, 10)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </div>
        </section>
      ) : null}

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

/** Carte d'indicateur clé. */
function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: typeof CalendarCheck;
  label: string;
  value: string | number;
  sub?: string;
  tone?: 'warn';
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${tone === 'warn' ? 'bg-amber-50 text-amber-700' : 'bg-brand-50 text-brand-700'}`}>
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xl font-bold text-slate-900">{value}</p>
        <p className="truncate text-xs text-slate-500">{label}{sub ? ` · ${sub}` : ''}</p>
      </div>
    </div>
  );
}
