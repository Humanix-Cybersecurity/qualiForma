// SPDX-License-Identifier: AGPL-3.0-or-later
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, KeyRound, Webhook } from 'lucide-react';
import { Alert, Badge, Button, Card, CardHeader, Spinner, TextField } from '@humanix/ui';
import { useAuth } from '../auth/AuthProvider';
import { api, API_URL, type ApiKeyRow, type WebhookRow } from '../lib/api';
import { PageHeader } from '../components/PageHeader';

export function IntegrationsPage() {
  const { t } = useTranslation();
  const { auth } = useAuth();
  const [keys, setKeys] = useState<ApiKeyRow[] | null>(null);
  const [hooks, setHooks] = useState<WebhookRow[] | null>(null);
  const [nom, setNom] = useState('');
  const [url, setUrl] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!auth) return;
    api.apiKeys(auth).then(setKeys).catch(() => setKeys([]));
    api.webhooks(auth).then(setHooks).catch(() => setHooks([]));
  }, [auth]);
  useEffect(reload, [reload]);

  async function createKey(e: FormEvent) {
    e.preventDefault();
    if (!auth || !nom.trim()) return;
    setError(null);
    try {
      const r = await api.createApiKey(auth, nom.trim());
      setNewKey(r.key);
      setNom('');
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  }
  async function createHook(e: FormEvent) {
    e.preventDefault();
    if (!auth || !url.trim()) return;
    setError(null);
    try {
      const r = await api.createWebhook(auth, { url: url.trim(), events: ['scellement.created'] });
      setNewSecret(r.secret);
      setUrl('');
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  }

  return (
    <>
      <PageHeader title={t('integrations.title')} description={t('integrations.subtitle')} />
      {error ? <div className="mb-4"><Alert tone="error">{error}</Alert></div> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Clés d'API */}
        <Card>
          <CardHeader title={t('integrations.keysTitle')} subtitle={t('integrations.keysHint')} />
          {newKey ? (
            <div className="mb-3">
              <Alert tone="success">
                <p className="font-medium">{t('integrations.keyCreated')}</p>
                <code className="mt-1 block break-all rounded bg-white/70 px-2 py-1 font-mono text-xs">{newKey}</code>
                <p className="mt-1 text-xs">{t('integrations.keyOnce')}</p>
              </Alert>
            </div>
          ) : null}
          <form onSubmit={createKey} className="mb-4 flex items-end gap-2">
            <div className="flex-1"><TextField label={t('integrations.keyName')} value={nom} onChange={setNom} /></div>
            <Button type="submit" size="sm"><KeyRound aria-hidden="true" className="h-4 w-4" />{t('integrations.create')}</Button>
          </form>
          {keys === null ? <Spinner label={t('common.loading')} /> : keys.length === 0 ? (
            <p className="text-sm text-slate-500">{t('integrations.noKey')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {keys.map((k) => (
                <li key={k.id} className="flex items-center justify-between gap-2 text-sm">
                  <span><span className="font-medium">{k.nom}</span> <code className="text-slate-500">{k.prefix}</code></span>
                  <span className="flex items-center gap-2">
                    {k.revokedAt ? <Badge tone="neutral">{t('integrations.revoked')}</Badge> : (
                      <Button size="sm" variant="ghost" onPress={() => auth && api.revokeApiKey(auth, k.id).then(reload)}>{t('integrations.revoke')}</Button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-slate-500">
            {t('integrations.usage')} : <code className="font-mono">curl -H "X-API-Key: hmx_…" {API_URL}/api/v1/sessions</code>
          </p>
        </Card>

        {/* Webhooks */}
        <Card>
          <CardHeader title={t('integrations.webhooksTitle')} subtitle={t('integrations.webhooksHint')} />
          {newSecret ? (
            <div className="mb-3">
              <Alert tone="success">
                <p className="font-medium">{t('integrations.hookCreated')}</p>
                <code className="mt-1 block break-all rounded bg-white/70 px-2 py-1 font-mono text-xs">{newSecret}</code>
                <p className="mt-1 text-xs">{t('integrations.hookSecret')}</p>
              </Alert>
            </div>
          ) : null}
          <form onSubmit={createHook} className="mb-4 flex items-end gap-2">
            <div className="flex-1"><TextField label={t('integrations.hookUrl')} type="url" value={url} onChange={setUrl} /></div>
            <Button type="submit" size="sm"><Webhook aria-hidden="true" className="h-4 w-4" />{t('integrations.create')}</Button>
          </form>
          <div className="mb-3 flex flex-wrap gap-1">
            <Badge tone="brand">scellement.created</Badge>
          </div>
          {hooks === null ? <Spinner label={t('common.loading')} /> : hooks.length === 0 ? (
            <p className="text-sm text-slate-500">{t('integrations.noHook')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {hooks.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate"><Copy aria-hidden="true" className="mr-1 inline h-3.5 w-3.5 text-slate-400" />{h.url}</span>
                  <Button size="sm" variant="ghost" onPress={() => auth && api.deleteWebhook(auth, h.id).then(reload)}>{t('common.delete')}</Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
