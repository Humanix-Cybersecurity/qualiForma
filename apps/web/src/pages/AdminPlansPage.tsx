// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, Card, Spinner } from '@humanix/ui';
import { useAuth } from '../auth/AuthProvider';
import { api, type PlanRow } from '../lib/api';
import { PageHeader } from '../components/PageHeader';

export function AdminPlansPage() {
  const { t } = useTranslation();
  const { auth } = useAuth();
  const [rows, setRows] = useState<PlanRow[] | null>(null);

  useEffect(() => {
    if (auth) api.plans(auth).then(setRows).catch(() => setRows([]));
  }, [auth]);

  return (
    <>
      <PageHeader title={t('admin.plansTitle')} />
      {rows === null ? (
        <Spinner label={t('common.loading')} />
      ) : rows.length === 0 ? (
        <Card><p className="text-slate-500">{t('common.none')}</p></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((p) => (
            <Card key={p.id}>
              <div className="flex items-start justify-between">
                <h2 className="font-semibold text-slate-900">{p.name}</h2>
                <Badge tone="brand">{p.code}</Badge>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {(p.priceCents / 100).toLocaleString('fr-FR')} €
                <span className="text-sm font-normal text-slate-500"> / mois</span>
              </p>
              {p.maxUsers ? (
                <p className="mt-1 text-sm text-slate-500">{t('admin.maxUsers')} : {p.maxUsers}</p>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
