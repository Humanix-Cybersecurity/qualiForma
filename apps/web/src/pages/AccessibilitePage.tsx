// SPDX-License-Identifier: AGPL-3.0-or-later
import { useTranslation } from 'react-i18next';

/** Déclaration d'accessibilité (obligatoire, RGAA). Page publique. */
export function AccessibilitePage() {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="a11y-title" className="flex flex-col gap-4">
      <h1 id="a11y-title" className="text-xl font-bold text-slate-900">
        {t('a11y.title')}
      </h1>
      <p className="text-slate-700">{t('a11y.intro')}</p>
      <div>
        <h2 className="font-semibold text-slate-900">{t('a11y.statusLabel')}</h2>
        <p className="text-slate-700">{t('a11y.status')}</p>
      </div>
      <div>
        <h2 className="font-semibold text-slate-900">{t('a11y.measuresLabel')}</h2>
        <p className="text-slate-700">{t('a11y.measures')}</p>
      </div>
      <div>
        <h2 className="font-semibold text-slate-900">{t('a11y.contactLabel')}</h2>
        <p className="text-slate-700">{t('a11y.contact')}</p>
      </div>
    </section>
  );
}
