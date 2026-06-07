// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileSpreadsheet } from 'lucide-react';
import { Badge, Button, Card, Spinner } from '@humanix/ui';
import { useAuth } from '../auth/AuthProvider';
import { api, downloadFile, type SessionRow } from '../lib/api';
import { PageHeader } from '../components/PageHeader';

export function SessionsPage() {
  const { t } = useTranslation();
  const { auth, claims } = useAuth();
  const [rows, setRows] = useState<SessionRow[] | null>(null);
  const isAdmin = claims?.role === 'admin_of';

  useEffect(() => {
    if (auth) api.sessions(auth).then(setRows).catch(() => setRows([]));
  }, [auth]);

  return (
    <>
      <PageHeader title={t('sessions.title')} />
      {rows === null ? (
        <Spinner label={t('common.loading')} />
      ) : rows.length === 0 ? (
        <Card><p className="text-slate-500">{t('sessions.none')}</p></Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((s) => (
            <Card key={s.id} as="li">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{s.formation}{s.intitule ? ` — ${s.intitule}` : ''}</p>
                  <p className="mt-0.5 text-sm text-slate-600">
                    {s.dateDebut.slice(0, 10)} → {s.dateFin.slice(0, 10)}{s.lieu ? ` · ${s.lieu}` : ''}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-sm">
                    <Badge tone="neutral">{t('sessions.inscrits')} : {s.inscrits}</Badge>
                    <Badge tone="neutral">{t('sessions.creneaux')} : {s.creneaux}</Badge>
                    <Badge tone="brand">{s.statut}</Badge>
                  </div>
                </div>
                <div className="flex flex-col items-stretch gap-2">
                  <Button size="sm" variant="secondary" onPress={() => auth && downloadFile(auth, `/sessions/${s.id}/feuille-emargement.pdf`, `feuille-${s.id}.pdf`)}>
                    <Download aria-hidden="true" className="h-4 w-4" />
                    {t('sessions.feuille')}
                  </Button>
                  {isAdmin ? (
                    <Button size="sm" variant="secondary" onPress={() => auth && downloadFile(auth, `/sessions/${s.id}/decompte?format=xlsx`, `decompte-${s.id}.xlsx`)}>
                      <FileSpreadsheet aria-hidden="true" className="h-4 w-4" />
                      {t('sessions.decompte')}
                    </Button>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </ul>
      )}
    </>
  );
}
