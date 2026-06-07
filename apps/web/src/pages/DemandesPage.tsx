// SPDX-License-Identifier: AGPL-3.0-or-later
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Button, Card, Spinner } from '@humanix/ui';
import { useAuth } from '../auth/AuthProvider';
import { api, type DemandeRow } from '../lib/api';
import { PageHeader } from '../components/PageHeader';

const STATUTS = ['nouvelle', 'traitee', 'convertie', 'refusee'] as const;

export function DemandesPage() {
  const { t } = useTranslation();
  const { auth } = useAuth();
  const [rows, setRows] = useState<DemandeRow[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (auth) api.demandes(auth).then(setRows).catch(() => setRows([]));
  }, [auth]);
  useEffect(reload, [reload]);

  async function convertir(d: DemandeRow) {
    if (!auth) return;
    setMsg(null); setError(null);
    try {
      const r = await api.convertirDemande(auth, d.id);
      setMsg(r.temporaryPassword
        ? t('demandes.convertedPwd', { email: d.email, pwd: r.temporaryPassword })
        : t('demandes.converted', { email: d.email }));
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  }

  return (
    <>
      <PageHeader title={t('demandes.title')} description={t('demandes.subtitle')} />
      {msg ? <div className="mb-4"><Alert tone="success">{msg}</Alert></div> : null}
      {error ? <div className="mb-4"><Alert tone="error">{error}</Alert></div> : null}

      {rows === null ? (
        <Spinner label={t('common.loading')} />
      ) : rows.length === 0 ? (
        <Card><p className="text-slate-500">{t('demandes.none')}</p></Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((d) => (
            <Card key={d.id} as="li">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{[d.prenom, d.nom].filter(Boolean).join(' ')} · {d.email}</p>
                  <p className="text-sm text-slate-500">
                    {d.createdAt.slice(0, 10)}{d.telephone ? ` · ${d.telephone}` : ''}
                  </p>
                  {d.message ? <p className="mt-1 text-sm text-slate-600">« {d.message} »</p> : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={d.statut === 'convertie' ? 'success' : d.statut === 'refusee' ? 'neutral' : 'brand'}>
                    {t(`demandes.statut_${d.statut}`)}
                  </Badge>
                  <select aria-label={t('demandes.statut')} value={d.statut}
                    onChange={(e) => auth && api.setDemandeStatut(auth, d.id, e.target.value as (typeof STATUTS)[number]).then(reload)}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm">
                    {STATUTS.map((s) => <option key={s} value={s}>{t(`demandes.statut_${s}`)}</option>)}
                  </select>
                  {d.statut !== 'convertie' ? (
                    <Button size="sm" onPress={() => convertir(d)}>{t('demandes.convertir')}</Button>
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
