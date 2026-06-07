// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { LogOut, Menu, User, X } from 'lucide-react';
import { Badge } from '@humanix/ui';
import { useAuth } from '../auth/AuthProvider';
import { api, type Profile } from '../lib/api';
import { navForRole } from '../nav';
import { Logo } from './Logo';

export function AppShell() {
  const { t, i18n } = useTranslation();
  const { claims, auth, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (auth) api.getProfile(auth).then(setProfile).catch(() => undefined);
  }, [auth]);

  // Ferme le tiroir mobile à chaque navigation.
  useEffect(() => setOpen(false), [location.pathname]);

  if (!claims) return null;
  const items = navForRole(claims.role);
  const displayName =
    [profile?.prenom, profile?.nom].filter(Boolean).join(' ') || profile?.email || '';
  const initials = (displayName || claims.role)
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const navContent = (
    <nav aria-label={t('nav.sectionMain')} className="flex flex-1 flex-col gap-1 p-3">
      <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {t('nav.sectionMain')}
      </p>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/app'}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ` +
            (isActive
              ? 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')
          }
        >
          <item.icon aria-hidden="true" className="h-5 w-5 shrink-0" />
          {t(`nav.${item.labelKey}`)}
        </NavLink>
      ))}
      <p className="mt-4 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {t('nav.sectionAccount')}
      </p>
      <NavLink
        to="/app/profil"
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ` +
          (isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-100')
        }
      >
        <User aria-hidden="true" className="h-5 w-5 shrink-0" />
        {t('nav.profile')}
      </NavLink>
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex h-16 items-center border-b border-slate-200 px-5">
          <Link to="/app" className="outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded">
            <Logo />
          </Link>
        </div>
        {navContent}
      </aside>

      {/* Tiroir mobile */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label={t('common.close')}
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
              <Logo />
              <button type="button" aria-label={t('common.close')} onClick={() => setOpen(false)}>
                <X aria-hidden="true" className="h-5 w-5 text-slate-600" />
              </button>
            </div>
            {navContent}
          </div>
        </div>
      )}

      <div className="md:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            aria-label={t('nav.sectionMain')}
            onClick={() => setOpen(true)}
          >
            <Menu aria-hidden="true" className="h-5 w-5" />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-900">{displayName}</p>
              <Badge tone="brand">{t(`roles.${claims.role}`)}</Badge>
            </div>
            <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 text-xs" role="group" aria-label="Langue">
              {(['fr', 'en'] as const).map((lng) => (
                <button
                  key={lng}
                  type="button"
                  onClick={() => i18n.changeLanguage(lng)}
                  aria-pressed={i18n.language.startsWith(lng)}
                  className={`px-2 py-1 font-medium uppercase ${i18n.language.startsWith(lng) ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  {lng}
                </button>
              ))}
            </div>
            <span
              aria-hidden="true"
              className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-semibold text-white shadow-sm"
            >
              {initials}
            </span>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
              <span className="hidden sm:inline">{t('common.logout')}</span>
            </button>
          </div>
        </header>

        <main id="contenu" className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
          <div key={location.pathname} className="animate-fade-in-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
