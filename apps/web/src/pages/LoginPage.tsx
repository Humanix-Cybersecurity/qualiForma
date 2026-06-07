// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Alert, Button, TextField } from '@humanix/ui';
import { useAuth } from '../auth/AuthProvider';
import { Logo } from '../components/Logo';

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
      navigate('/app');
    } catch {
      setError(t('login.failed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-gradient-to-b from-brand-50/60 via-slate-50 to-slate-50">
      <div aria-hidden="true" className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-brand-200/30 blur-3xl" />
      <header className="flex h-16 items-center px-4 sm:px-8">
        <Link to="/" className="rounded outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
          <Logo />
        </Link>
      </header>
      <main id="contenu" className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md animate-fade-in-up">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-soft">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('login.title')}</h1>
            <p className="mt-1 text-sm text-slate-500">{t('login.subtitle')}</p>

            {error ? (
              <div className="mt-4">
                <Alert tone="error">{error}</Alert>
              </div>
            ) : null}

            <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
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
              <Button type="submit" size="lg" isDisabled={loading} className="mt-2 w-full">
                {loading ? t('common.loading') : t('login.submit')}
              </Button>
            </form>
          </div>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            {t('login.backHome')}
          </Link>
        </div>
      </main>
    </div>
  );
}
