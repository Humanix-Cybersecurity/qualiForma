// SPDX-License-Identifier: AGPL-3.0-or-later
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Button, Card, CardHeader, Spinner, TextField } from '@humanix/ui';
import { useAuth } from '../auth/AuthProvider';
import { api, type UserRow } from '../lib/api';
import { PageHeader } from '../components/PageHeader';

const ROLES = ['apprenant', 'formateur', 'referent_handicap'] as const;

export function UtilisateursPage() {
  const { t } = useTranslation();
  const { auth } = useAuth();
  const [rows, setRows] = useState<UserRow[] | null>(null);
  const [email, setEmail] = useState('');
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [role, setRole] = useState<(typeof ROLES)[number]>('apprenant');
  const [tempPwd, setTempPwd] = useState<{ email: string; password: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (auth) api.listUsers(auth).then(setRows).catch(() => setRows([]));
  }, [auth]);
  useEffect(reload, [reload]);

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!auth) return;
    setError(null);
    setTempPwd(null);
    try {
      const created = await api.createUser(auth, { email, prenom, nom, role });
      if (created.temporaryPassword) setTempPwd({ email: created.email, password: created.temporaryPassword });
      setEmail('');
      setPrenom('');
      setNom('');
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  }

  return (
    <>
      <PageHeader title={t('users.title')} />
      <Card className="mb-6 max-w-2xl">
        <CardHeader title={t('users.create')} subtitle={t('users.createHint')} />
        {error ? <div className="mb-3"><Alert tone="error">{error}</Alert></div> : null}
        {tempPwd ? (
          <div className="mb-3">
            <Alert tone="success">
              <p className="font-medium">{t('users.created', { email: tempPwd.email })}</p>
              <p className="mt-1 text-sm">
                {t('users.tempPassword')} : <code className="rounded bg-white/60 px-1.5 py-0.5 font-mono">{tempPwd.password}</code>
              </p>
              <p className="mt-1 text-xs">{t('users.tempPasswordHint')}</p>
            </Alert>
          </div>
        ) : null}
        <form onSubmit={create} className="flex flex-col gap-4">
          <TextField label={t('users.email')} type="email" value={email} onChange={setEmail} isRequired />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label={t('users.prenom')} value={prenom} onChange={setPrenom} />
            <TextField label={t('users.nom')} value={nom} onChange={setNom} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="role" className="text-sm font-medium text-slate-800">{t('users.role')}</label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {ROLES.map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}
            </select>
          </div>
          <Button type="submit" className="self-start">{t('users.submit')}</Button>
        </form>
      </Card>

      {rows === null ? (
        <Spinner label={t('common.loading')} />
      ) : rows.length === 0 ? (
        <Card><p className="text-slate-500">{t('users.none')}</p></Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((u) => (
            <Card key={u.id} as="li">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">
                    {[u.prenom, u.nom].filter(Boolean).join(' ') || u.email}
                  </p>
                  <p className="text-sm text-slate-500">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="brand">{t(`roles.${u.role}`)}</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onPress={async () => {
                      if (!auth) return;
                      if (!window.confirm(t('users.anonymiseConfirm'))) return;
                      await api.anonymiserUser(auth, u.id);
                      reload();
                    }}
                  >
                    {t('users.anonymise')}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </ul>
      )}
    </>
  );
}
