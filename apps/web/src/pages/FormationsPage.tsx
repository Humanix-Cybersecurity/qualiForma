// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, Card, Spinner } from '@humanix/ui';
import { useAuth } from '../auth/AuthProvider';
import { api, type FormationRow } from '../lib/api';
import { PageHeader } from '../components/PageHeader';

export function FormationsPage() {
  const { t } = useTranslation();
  const { auth } = useAuth();
  const [rows, setRows] = useState<FormationRow[] | null>(null);

  useEffect(() => {
    if (auth) api.formations(auth).then(setRows).catch(() => setRows([]));
  }, [auth]);

  return (
    <>
      <PageHeader title={t('formations.title')} />
      {rows === null ? (
        <Spinner label={t('common.loading')} />
      ) : rows.length === 0 ? (
        <Card><p className="text-slate-500">{t('formations.none')}</p></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map((f) => (
            <Card key={f.id}>
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold text-slate-900">{f.intitule}</h2>
                <Badge tone={f.actif ? 'success' : 'neutral'}>
                  {f.actif ? t('formations.active') : t('formations.inactive')}
                </Badge>
              </div>
              <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
                <div><dt className="inline font-medium">{t('formations.duration')} :</dt>{' '}{Number(f.dureeHeures)} {t('formations.hours')}</div>
                <div>{t('formations.sessionsCount', { count: f._count.sessions })}</div>
              </dl>
              {f.indicateursQualiopi.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1">
                  {f.indicateursQualiopi.map((i) => (
                    <Badge key={i} tone="brand">RNQ {i}</Badge>
                  ))}
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
