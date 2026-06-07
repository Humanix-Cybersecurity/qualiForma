// SPDX-License-Identifier: AGPL-3.0-or-later
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Accessibility, FileCheck2, ShieldCheck, Stamp, ArrowRight } from 'lucide-react';
import { Logo } from '../components/Logo';

export function LandingPage() {
  const { t } = useTranslation();

  const features = [
    { icon: Stamp, title: t('landing.feature1Title'), desc: t('landing.feature1Desc') },
    { icon: FileCheck2, title: t('landing.feature2Title'), desc: t('landing.feature2Desc') },
    { icon: Accessibility, title: t('landing.feature3Title'), desc: t('landing.feature3Desc') },
    { icon: ShieldCheck, title: t('landing.feature4Title'), desc: t('landing.feature4Desc') },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex h-16 items-center justify-between px-4 sm:px-8">
        <Logo />
        <Link
          to="/login"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          {t('landing.ctaLogin')}
        </Link>
      </header>

      <main id="contenu" className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50 to-white"
          />
          <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:py-28">
            <p className="mb-4 inline-flex rounded-full bg-brand-100 px-3 py-1 text-sm font-medium text-brand-700">
              {t('app.tagline')}
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              {t('landing.heroTitle')}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">{t('landing.heroSubtitle')}</p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-base font-medium text-white shadow-sm transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              >
                {t('landing.ctaLogin')}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-6 py-3 text-base font-medium text-slate-700 hover:bg-slate-50"
              >
                {t('landing.ctaLearn')}
              </a>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900">
            {t('landing.featuresTitle')}
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-brand-50 text-brand-700">
                  <f.icon aria-hidden="true" className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 px-4 py-6 sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
          <span>© Humanix — {t('landing.footerRights')}</span>
          <Link to="/accessibilite" className="text-brand-700 underline underline-offset-2">
            {t('a11y.link')}
          </Link>
        </div>
      </footer>
    </div>
  );
}
