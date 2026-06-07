// SPDX-License-Identifier: AGPL-3.0-or-later
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Button, Card, CardHeader, Spinner, TextField } from '@humanix/ui';
import { useAuth } from '../auth/AuthProvider';
import { api, type PlanRow } from '../lib/api';
import { PageHeader } from '../components/PageHeader';

export function AdminPlansPage() {
  const { t } = useTranslation();
  const { auth } = useAuth();
  const [rows, setRows] = useState<PlanRow[] | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [maxUsers, setMaxUsers] = useState('');
  const [maxSessions, setMaxSessions] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (auth) api.plans(auth).then(setRows).catch(() => setRows([]));
  }, [auth]);
  useEffect(reload, [reload]);

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!auth) return;
    setMsg(null);
    setError(null);
    try {
      const body: { code: string; name: string; priceCents?: number; maxUsers?: number; maxActiveSessions?: number } = {
        code,
        name,
      };
      if (price) body.priceCents = Math.round(Number(price) * 100);
      if (maxUsers) body.maxUsers = Number(maxUsers);
      if (maxSessions) body.maxActiveSessions = Number(maxSessions);
      await api.createPlan(auth, body);
      setMsg(t('admin.planCreated'));
      setCode(''); setName(''); setPrice(''); setMaxUsers(''); setMaxSessions('');
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  }

  return (
    <>
      <PageHeader title={t('admin.plansTitle')} />
      <Card className="mb-6 max-w-2xl">
        <CardHeader title={t('admin.createPlan')} />
        {msg ? <div className="mb-3"><Alert tone="success">{msg}</Alert></div> : null}
        {error ? <div className="mb-3"><Alert tone="error">{error}</Alert></div> : null}
        <form onSubmit={create} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextField label={t('admin.planCode')} value={code} onChange={setCode} isRequired />
            <TextField label={t('admin.planName')} value={name} onChange={setName} isRequired />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <TextField label={t('admin.planPrice')} value={price} onChange={setPrice} inputMode="numeric" />
            <TextField label={t('admin.quotaUsers')} value={maxUsers} onChange={setMaxUsers} inputMode="numeric" />
            <TextField label={t('admin.quotaSessions')} value={maxSessions} onChange={setMaxSessions} inputMode="numeric" />
          </div>
          <Button type="submit" className="self-start">{t('admin.createPlan')}</Button>
        </form>
      </Card>

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
