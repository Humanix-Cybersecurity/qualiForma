// SPDX-License-Identifier: AGPL-3.0-or-later
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Download, QrCode as QrIcon, Stamp } from 'lucide-react';
import { Alert, Badge, Button, Card, Spinner } from '@humanix/ui';
import { useAuth } from '../auth/AuthProvider';
import { api, downloadFile, type Creneau } from '../lib/api';
import { PageHeader } from '../components/PageHeader';
import { QrCode } from '../components/QrCode';

export function CreneauxPage() {
  const { t } = useTranslation();
  const { auth, claims } = useAuth();
  const [creneaux, setCreneaux] = useState<Creneau[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [projetId, setProjetId] = useState<string | null>(null);
  const [jetonUrl, setJetonUrl] = useState<string>('');
  const [scelle, setScelle] = useState<Record<string, string>>({});

  const reload = useCallback(() => {
    if (!auth) return;
    api.mesCreneaux(auth).then(setCreneaux).catch(() => setError(t('common.error')));
  }, [auth, t]);

  useEffect(reload, [reload]);

  // QR de projection : régénération automatique (rotation anti-fraude) tant qu'il est affiché.
  useEffect(() => {
    if (!auth || !projetId) return;
    let stop = false;
    const refresh = () =>
      api.genererJeton(auth, projetId).then((j) => { if (!stop) setJetonUrl(j.url); }).catch(() => undefined);
    refresh();
    const iv = setInterval(refresh, 50_000);
    return () => { stop = true; clearInterval(iv); };
  }, [auth, projetId]);

  const isFormateur = claims?.role === 'formateur';
  const periode = (p: Creneau['periode']) => (p === 'matin' ? t('creneaux.morning') : t('creneaux.afternoon'));

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
    if (projetId === id) setProjetId(null);
    reload();
  }
  async function sceller(id: string) {
    if (!auth) return;
    const r = await api.sceller(auth, id);
    setScelle((s) => ({ ...s, [id]: r.horodatageQualifie ? `${t('creneaux.scelle')} ✓` : t('creneaux.scelle') }));
  }

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
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {c.signatureOuverte ? (
                        <>
                          <Button size="sm" variant="secondary" onPress={() => setProjetId(projetId === c.id ? null : c.id)}>
                            <QrIcon aria-hidden="true" className="h-4 w-4" />
                            {projetId === c.id ? t('creneaux.masquer') : t('creneaux.projeter')}
                          </Button>
                          <Button size="sm" variant="secondary" onPress={() => fermer(c.id)}>
                            {t('creneaux.closeWindow')}
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" onPress={() => ouvrir(c.id)}>{t('creneaux.openWindow')}</Button>
                      )}
                      <Button size="sm" variant="secondary" onPress={() => sceller(c.id)}>
                        <Stamp aria-hidden="true" className="h-4 w-4" />
                        {t('creneaux.sceller')}
                      </Button>
                      <Button size="sm" variant="ghost" onPress={() => auth && downloadFile(auth, `/creneaux/${c.id}/pack-preuve.zip`, `pack-${c.id}.zip`)}>
                        <Download aria-hidden="true" className="h-4 w-4" />
                        {t('creneaux.packPreuve')}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>

              {isFormateur && codes[c.id] ? (
                <p className="mt-2 text-sm text-slate-600">
                  {t('creneaux.codeToDisplay')} :{' '}
                  <strong className="font-mono text-lg tracking-widest text-brand-700">{codes[c.id]}</strong>
                </p>
              ) : null}
              {scelle[c.id] ? (
                <p className="mt-2 text-sm text-green-700">{scelle[c.id]}</p>
              ) : null}
              {isFormateur && projetId === c.id && jetonUrl ? (
                <div className="mt-4 flex flex-col items-center gap-2 rounded-lg bg-slate-50 p-4">
                  <QrCode value={jetonUrl} alt={t('creneaux.projeter')} size={240} />
                  <p className="text-center text-sm text-slate-500">{t('creneaux.qrHint')}</p>
                </div>
              ) : null}
            </Card>
          ))}
        </ul>
      )}
    </>
  );
}
