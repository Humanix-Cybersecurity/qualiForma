// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { Badge, Button, Card, Spinner } from '@humanix/ui';
import { useAuth } from '../auth/AuthProvider';
import { api, downloadFile, type InscriptionRow } from '../lib/api';
import { PageHeader } from '../components/PageHeader';

export function AttestationsPage() {
  const { t } = useTranslation();
  const { auth } = useAuth();
  const [rows, setRows] = useState<InscriptionRow[] | null>(null);

  useEffect(() => {
    if (auth) api.myInscriptions(auth).then(setRows).catch(() => setRows([]));
  }, [auth]);

  return (
    <>
      <PageHeader title={t('attestations.title')} />
      {rows === null ? (
        <Spinner label={t('common.loading')} />
      ) : rows.length === 0 ? (
        <Card><p className="text-slate-500">{t('attestations.none')}</p></Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((i) => (
            <Card key={i.id} as="li">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{i.formation}</p>
                  <p className="text-sm text-slate-500">{i.session ?? ''} · {i.dateDebut.slice(0, 10)} → {i.dateFin.slice(0, 10)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={() => auth && downloadFile(auth, `/inscriptions/${i.id}/convocation.pdf`, `convocation-${i.id}.pdf`)}
                  >
                    <Download aria-hidden="true" className="h-4 w-4" />
                    {t('attestations.convocation')}
                  </Button>
                  {i.certificat && i.certificat.statut === 'emis' ? (
                    <Button
                      size="sm"
                      onPress={() => auth && downloadFile(auth, `/me/certificat/${i.id}`, `${i.certificat?.numero ?? 'certificat'}.pdf`)}
                    >
                      <Download aria-hidden="true" className="h-4 w-4" />
                      {t('attestations.download')}
                    </Button>
                  ) : (
                    <Badge tone="neutral">{t('attestations.notReady')}</Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </ul>
      )}
    </>
  );
}
