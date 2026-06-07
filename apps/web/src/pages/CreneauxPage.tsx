// SPDX-License-Identifier: AGPL-3.0-or-later
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Alert, Badge, Button, Card, Spinner } from '@humanix/ui';
import { useAuth } from '../auth/AuthProvider';
import { api, type Creneau } from '../lib/api';
import { PageHeader } from '../components/PageHeader';

export function CreneauxPage() {
  const { t } = useTranslation();
  const { auth, claims } = useAuth();
  const [creneaux, setCreneaux] = useState<Creneau[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [codes, setCodes] = useState<Record<string, string>>({});

  const reload = useCallback(() => {
    if (!auth) return;
    api.mesCreneaux(auth).then(setCreneaux).catch(() => setError(t('common.error')));
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
    <>
      <PageHeader title={t('creneaux.title')} />
      {error ? <div className="mb-4"><Alert tone="error">{error}</Alert></div> : null}
      {creneaux === null ? (
        <Spinner label={t('common.loading')} />
      ) : creneaux.length === 0 ? (
        <Card><p className="text-slate-500">{t('creneaux.none')}</p></Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {creneaux.map((c) => (
            <Card key={c.id} as="li">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{c.formationIntitule}</p>
                  <p className="mt-0.5 text-sm text-slate-600">
                    {c.date} · {periode(c.periode)} · {c.heureDebut}–{c.heureFin}
                    {c.lieu ? ` · ${c.lieu}` : ''}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge tone={c.signatureOuverte ? 'success' : 'neutral'}>
                      {c.signatureOuverte ? t('creneaux.open') : t('creneaux.closed')}
                    </Badge>
                    <Badge tone={c.monStatut === 'signe' ? 'success' : 'warning'}>
                      {c.monStatut === 'signe' ? t('creneaux.statutSigne') : t('creneaux.statutEnAttente')}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  {!isFormateur && c.signatureOuverte && c.monStatut !== 'signe' ? (
                    <Link to={`/app/creneaux/${c.id}/signer`}>
                      <Button size="sm">{t('creneaux.sign')}</Button>
                    </Link>
                  ) : null}
                  {isFormateur ? (
                    <>
                      {c.signatureOuverte ? (
                        <Button size="sm" variant="secondary" onPress={() => fermer(c.id)}>
                          {t('creneaux.closeWindow')}
                        </Button>
                      ) : (
                        <Button size="sm" onPress={() => ouvrir(c.id)}>
                          {t('creneaux.openWindow')}
                        </Button>
                      )}
                      {codes[c.id] ? (
                        <p className="text-sm text-slate-600">
                          {t('creneaux.codeToDisplay')} :{' '}
                          <strong className="font-mono text-lg tracking-widest text-brand-700">
                            {codes[c.id]}
                          </strong>
                        </p>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </ul>
      )}
    </>
  );
}
