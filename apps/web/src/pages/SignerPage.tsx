// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { Radio, RadioGroup } from 'react-aria-components';
import { Alert, Button, TextField } from '@humanix/ui';
import { useAuth } from '../auth/AuthProvider';
import { api, API_URL } from '../lib/api';

export function SignerPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const { auth } = useAuth();
  const [methode, setMethode] = useState<'code' | 'manuscrite'>('code');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!auth) return;
    setError(null);
    setLoading(true);
    try {
      const res = await api.signer(auth, id, methode, methode === 'code' ? code : undefined);
      setToken(res.verificationToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  if (token) {
    const url = `${API_URL}/verification/${token}`;
    return (
      <section className="flex flex-col gap-3">
        <Alert tone="success">{t('sign.success')}</Alert>
        <p className="text-sm">
          {t('sign.verifyLink')} :{' '}
          <a href={url} className="break-all text-blue-700 underline">
            {url}
          </a>
        </p>
        <Link to="/creneaux" className="text-blue-700 underline underline-offset-2">
          {t('common.back')}
        </Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="sign-title" className="flex flex-col gap-4">
      <h1 id="sign-title" className="text-xl font-bold text-slate-900">
        {t('sign.title')}
      </h1>
      {error ? <Alert tone="error">{error}</Alert> : null}
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <RadioGroup
          value={methode}
          onChange={(v) => setMethode(v as 'code' | 'manuscrite')}
          className="flex flex-col gap-2"
          aria-label={t('sign.method')}
        >
          <span className="text-sm font-medium text-slate-800">{t('sign.method')}</span>
          <Radio value="code" className="flex items-center gap-2 text-sm">
            {t('sign.methodCode')}
          </Radio>
          <Radio value="manuscrite" className="flex items-center gap-2 text-sm">
            {t('sign.methodManuscrite')}
          </Radio>
        </RadioGroup>

        {methode === 'code' ? (
          <TextField
            label={t('creneaux.code')}
            description={t('sign.enterCode')}
            value={code}
            onChange={setCode}
            inputMode="numeric"
            isRequired
          />
        ) : null}

        <Button type="submit" isDisabled={loading}>
          {loading ? t('common.loading') : t('sign.confirm')}
        </Button>
      </form>
    </section>
  );
}
