// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, TextField } from '@humanix/ui';
import { useAuth } from '../auth/AuthProvider';

export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [tenant, setTenant] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(tenant.trim(), email.trim(), password, totp || undefined);
      navigate('/');
    } catch {
      setError(t('login.failed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-labelledby="login-title" className="flex flex-col gap-4">
      <h1 id="login-title" className="text-xl font-bold text-slate-900">
        {t('login.title')}
      </h1>
      {error ? <Alert tone="error">{error}</Alert> : null}
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <TextField
          label={t('login.tenant')}
          description={t('login.tenantHelp')}
          value={tenant}
          onChange={setTenant}
          isRequired
          autoComplete="organization"
        />
        <TextField
          label={t('login.email')}
          type="email"
          value={email}
          onChange={setEmail}
          isRequired
          inputMode="email"
          autoComplete="email"
        />
        <TextField
          label={t('login.password')}
          type="password"
          value={password}
          onChange={setPassword}
          isRequired
          autoComplete="current-password"
        />
        <TextField
          label={t('login.totp')}
          description={t('login.totpHelp')}
          value={totp}
          onChange={setTotp}
          inputMode="numeric"
          autoComplete="one-time-code"
        />
        <Button type="submit" isDisabled={loading}>
          {loading ? t('common.loading') : t('login.submit')}
        </Button>
      </form>
    </section>
  );
}
