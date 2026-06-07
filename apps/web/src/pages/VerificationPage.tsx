// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { Alert } from '@humanix/ui';
import { api } from '../lib/api';

interface Result {
  authentique: boolean;
  signatureLevel: string;
  timestampServeur: string | null;
}

/** Page publique de vérification d'authenticité (lien/QR du PDF). Tenant via ?t=slug. */
export function VerificationPage() {
  const { t } = useTranslation();
  const { token = '' } = useParams();
  const [params] = useSearchParams();
  const tenantSlug = params.get('t') ?? 'demo';
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .verifier(tenantSlug, token)
      .then(setResult)
      .catch(() => setError(true));
  }, [tenantSlug, token]);

  return (
    <section aria-labelledby="ver-title" className="flex flex-col gap-4">
      <h1 id="ver-title" className="text-xl font-bold text-slate-900">
        {t('verification.title')}
      </h1>
      {error ? (
        <Alert tone="error">{t('common.error')}</Alert>
      ) : result === null ? (
        <p>{t('common.loading')}</p>
      ) : (
        <>
          <Alert tone={result.authentique ? 'success' : 'error'}>
            {result.authentique ? t('verification.authentic') : t('verification.notAuthentic')}
          </Alert>
          <dl className="text-sm text-slate-700">
            <div className="flex gap-2">
              <dt className="font-medium">{t('verification.level')} :</dt>
              <dd>{result.signatureLevel}</dd>
            </div>
            {result.timestampServeur ? (
              <div className="flex gap-2">
                <dt className="font-medium">{t('verification.signedAt')} :</dt>
                <dd>{new Date(result.timestampServeur).toLocaleString('fr-FR')}</dd>
              </div>
            ) : null}
          </dl>
        </>
      )}
    </section>
  );
}
