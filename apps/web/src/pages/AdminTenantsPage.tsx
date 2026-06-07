// SPDX-License-Identifier: AGPL-3.0-or-later
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Button, Card, CardHeader, Spinner, TextField } from '@humanix/ui';
import { useAuth } from '../auth/AuthProvider';
import { api, type TenantRow } from '../lib/api';
import { PageHeader } from '../components/PageHeader';

export function AdminTenantsPage() {
  const { t } = useTranslation();
  const { auth } = useAuth();
  const [rows, setRows] = useState<TenantRow[] | null>(null);
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (auth) api.tenants(auth).then(setRows).catch(() => setRows([]));
  }, [auth]);
  useEffect(reload, [reload]);

  async function onboard(e: FormEvent) {
    e.preventDefault();
    if (!auth) return;
    setMsg(null);
    setError(null);
    try {
      await api.onboardTenant(auth, { slug, name, adminEmail: email, adminPassword: password, planCode: 'pro' });
      setMsg(t('admin.created'));
      setSlug(''); setName(''); setEmail(''); setPassword('');
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  }

  async function toggle(row: TenantRow) {
    if (!auth) return;
    await api.setTenantStatus(auth, row.id, row.status === 'active' ? 'suspended' : 'active');
    reload();
  }

  return (
    <>
      <PageHeader title={t('admin.tenantsTitle')} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title={t('admin.onboard')} />
          {msg ? <div className="mb-3"><Alert tone="success">{msg}</Alert></div> : null}
          {error ? <div className="mb-3"><Alert tone="error">{error}</Alert></div> : null}
          <form onSubmit={onboard} className="flex flex-col gap-3">
            <TextField label={t('admin.slug')} value={slug} onChange={setSlug} isRequired />
            <TextField label={t('admin.name')} value={name} onChange={setName} isRequired />
            <TextField label={t('admin.adminEmail')} type="email" value={email} onChange={setEmail} isRequired />
            <TextField label={t('admin.adminPassword')} type="password" value={password} onChange={setPassword} isRequired />
            <Button type="submit" className="self-start">{t('admin.onboard')}</Button>
          </form>
        </Card>

        <div className="lg:col-span-2">
          {rows === null ? (
            <Spinner label={t('common.loading')} />
          ) : (
            <ul className="flex flex-col gap-3">
              {rows.map((row) => (
                <Card key={row.id} as="li">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{row.name} <span className="text-slate-400">/{row.slug}</span></p>
                      <p className="text-sm text-slate-500">
                        {t('admin.users')} : {row.utilisateurs} · {row.sessions} sessions{row.plan ? ` · ${row.plan}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={row.status === 'active' ? 'success' : 'warning'}>
                        {row.status === 'active' ? t('admin.active') : t('admin.suspended')}
                      </Badge>
                      <Button size="sm" variant="secondary" onPress={() => toggle(row)}>
                        {row.status === 'active' ? t('admin.suspend') : t('admin.activate')}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
