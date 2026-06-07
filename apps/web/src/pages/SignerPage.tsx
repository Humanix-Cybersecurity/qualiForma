// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Radio, RadioGroup } from 'react-aria-components';
import { Alert, Button, Card, TextField } from '@humanix/ui';
import { useAuth } from '../auth/AuthProvider';
import { api, API_URL } from '../lib/api';
import { PageHeader } from '../components/PageHeader';
import { SignaturePad } from '../components/SignaturePad';
import { enqueueSign, isNetworkError } from '../lib/offline';

export function SignerPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const jeton = params.get('jeton'); // présent quand on arrive via un QR/lien dynamique
  const { auth } = useAuth();
  const [methode, setMethode] = useState<'code' | 'manuscrite'>('code');
  const [code, setCode] = useState('');
  const [hasDrawing, setHasDrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  const [loading, setLoading] = useState(false);

  // Désactive la soumission tant que la condition de la méthode n'est pas remplie.
  const submitDisabled =
    loading || (!jeton && methode === 'manuscrite' && !hasDrawing) || (!jeton && methode === 'code' && code.length !== 6);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!auth) return;
    setError(null);
    setLoading(true);
    // Jeton dynamique (QR/lien) prioritaire ; sinon code / manuscrite.
    const body = jeton
      ? ({ methode: 'qr', jeton } as const)
      : ({ methode, ...(methode === 'code' ? { code } : {}) } as const);
    try {
      const res = await api.signer(auth, id, body);
      setToken(res.verificationToken);
    } catch (err) {
      // Hors-ligne : on met en file et on synchronisera à la reconnexion (ADR 0005).
      if (isNetworkError(err)) {
        await enqueueSign({ creneauId: id, body, ts: new Date().toISOString() });
        setQueued(true);
      } else {
        setError(err instanceof Error ? err.message : t('common.error'));
      }
    } finally {
      setLoading(false);
    }
  }

  if (queued) {
    return (
      <>
        <PageHeader title={t('sign.title')} />
        <Card>
          <Alert tone="info">{t('sign.queued')}</Alert>
          <Link to="/app/creneaux" className="mt-4 inline-block text-brand-700 underline underline-offset-2">
            {t('common.back')}
          </Link>
        </Card>
      </>
    );
  }

  if (token) {
    const url = `${API_URL}/verification/${token}`;
    return (
      <>
        <PageHeader title={t('sign.title')} />
        <Card>
          <Alert tone="success">{t('sign.success')}</Alert>
          <p className="mt-4 text-sm text-slate-700">
            {t('sign.verifyLink')} :{' '}
            <a href={url} className="break-all text-brand-700 underline">{url}</a>
          </p>
          <Link to="/app/creneaux" className="mt-4 inline-block text-brand-700 underline underline-offset-2">
            {t('common.back')}
          </Link>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title={t('sign.title')} />
      <Card className="max-w-lg">
        {error ? <div className="mb-4"><Alert tone="error">{error}</Alert></div> : null}
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {jeton ? (
            <p className="text-sm text-slate-600">{t('sign.viaQr')}</p>
          ) : (
            <>
              <RadioGroup
                value={methode}
                onChange={(v) => setMethode(v as 'code' | 'manuscrite')}
                className="flex flex-col gap-2"
                aria-label={t('sign.method')}
              >
                <span className="text-sm font-medium text-slate-800">{t('sign.method')}</span>
                <Radio value="code" className="flex items-center gap-2 text-sm text-slate-700">
                  {t('sign.methodCode')}
                </Radio>
                <Radio value="manuscrite" className="flex items-center gap-2 text-sm text-slate-700">
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
              ) : (
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-slate-800">{t('sign.drawHint')}</span>
                  <SignaturePad onChange={setHasDrawing} />
                </div>
              )}
            </>
          )}

          <Button type="submit" isDisabled={submitDisabled} className="self-start">
            {loading ? t('common.loading') : t('sign.confirm')}
          </Button>
        </form>
      </Card>
    </>
  );
}
