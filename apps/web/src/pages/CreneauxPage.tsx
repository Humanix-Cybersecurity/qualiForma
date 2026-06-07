// SPDX-License-Identifier: AGPL-3.0-or-later
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Alert, Button } from '@humanix/ui';
import { useAuth } from '../auth/AuthProvider';
import { api, type Creneau } from '../lib/api';

export function CreneauxPage() {
  const { t } = useTranslation();
  const { auth, claims } = useAuth();
  const [creneaux, setCreneaux] = useState<Creneau[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [codes, setCodes] = useState<Record<string, string>>({});

  const reload = useCallback(() => {
    if (!auth) return;
    api
      .mesCreneaux(auth)
      .then(setCreneaux)
      .catch(() => setError(t('common.error')));
  }, [auth, t]);

  useEffect(reload, [reload]);

  const isFormateur = claims?.role === 'formateur';

  async function ouvrir(id: string) {
    if (!auth) return;
    const { code } = await api.ouvrirSignature(auth, id);
    setCodes((c) => ({ ...c, [id]: code }));
    reload();
  }
  async function fermer(id: string) {
    if (!auth) return;
    await api.fermerSignature(auth, id);
    setCodes((c) => ({ ...c, [id]: '' }));
    reload();
  }

  const periode = (p: Creneau['periode']) =>
    p === 'matin' ? t('creneaux.morning') : t('creneaux.afternoon');

  return (
    <section aria-labelledby="cr-title" className="flex flex-col gap-4">
      <h1 id="cr-title" className="text-xl font-bold text-slate-900">
        {t('creneaux.title')}
      </h1>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {creneaux === null ? (
        <p>{t('common.loading')}</p>
      ) : creneaux.length === 0 ? (
        <p>{t('creneaux.none')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {creneaux.map((c) => (
            <li key={c.id} className="rounded-md border border-slate-200 p-3">
              <p className="font-medium text-slate-900">
                {c.formationIntitule} — {c.date} ({periode(c.periode)} {c.heureDebut}–{c.heureFin})
              </p>
              <p className="text-sm text-slate-600">
                {c.signatureOuverte ? t('creneaux.open') : t('creneaux.closed')} ·{' '}
                {t('creneaux.status')} :{' '}
                {c.monStatut === 'signe' ? t('creneaux.statutSigne') : t('creneaux.statutEnAttente')}
              </p>

              {!isFormateur && c.signatureOuverte && c.monStatut !== 'signe' ? (
                <Link
                  to={`/creneaux/${c.id}/signer`}
                  className="mt-2 inline-block text-blue-700 underline underline-offset-2"
                >
                  {t('creneaux.sign')}
                </Link>
              ) : null}

              {isFormateur ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {c.signatureOuverte ? (
                    <Button variant="secondary" onPress={() => fermer(c.id)}>
                      {t('creneaux.closeWindow')}
                    </Button>
                  ) : (
                    <Button onPress={() => ouvrir(c.id)}>{t('creneaux.openWindow')}</Button>
                  )}
                  {codes[c.id] ? (
                    <span className="text-sm">
                      {t('creneaux.codeToDisplay')} :{' '}
                      <strong className="font-mono text-lg tracking-widest">{codes[c.id]}</strong>
                    </span>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <Link to="/" className="text-blue-700 underline underline-offset-2">
        {t('common.back')}
      </Link>
    </section>
  );
}
