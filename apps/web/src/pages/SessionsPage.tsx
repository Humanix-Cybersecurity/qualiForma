// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Download, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { Alert, Badge, Button, Card, Spinner } from '@humanix/ui';
import { useAuth } from '../auth/AuthProvider';
import { api, downloadFile, type SessionCompletude, type SessionRow } from '../lib/api';
import { PageHeader } from '../components/PageHeader';

export function SessionsPage() {
  const { t } = useTranslation();
  const { auth, claims } = useAuth();
  const [rows, setRows] = useState<SessionRow[] | null>(null);
  const isAdmin = claims?.role === 'admin_of';

  function reload() {
    if (auth) api.sessions(auth).then(setRows).catch(() => setRows([]));
  }
  useEffect(reload, [auth]);

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
              {isAdmin ? <Completude sessionId={s.id} statut={s.statut} onClosed={reload} /> : null}
            </Card>
          ))}
        </ul>
      )}
    </>
  );
}

/** Bloc de vérification de complétude Qualiopi + clôture de session (admin). */
function Completude({ sessionId, statut, onClosed }: { sessionId: string; statut: string; onClosed: () => void }) {
  const { t } = useTranslation();
  const { auth } = useAuth();
  const [data, setData] = useState<SessionCompletude | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const cloturee = statut === 'terminee';

  async function check() {
    if (!auth) return;
    setLoading(true);
    try {
      setData(await api.completude(auth, sessionId));
    } finally {
      setLoading(false);
    }
  }

  async function cloturer(force: boolean) {
    if (!auth) return;
    setBusy(true);
    try {
      await api.cloturerSession(auth, sessionId, force);
      onClosed();
    } catch {
      // En cas d'écart bloquant, on rafraîchit le rapport pour montrer les alertes.
      await check();
    } finally {
      setBusy(false);
    }
  }

  if (cloturee) {
    return (
      <div className="mt-3 border-t border-slate-100 pt-3">
        <Alert tone="success">{t('completude.cloturee')}</Alert>
      </div>
    );
  }

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      {!data ? (
        <Button size="sm" variant="ghost" onPress={check} isDisabled={loading}>
          <ShieldCheck aria-hidden="true" className="h-4 w-4" />
          {loading ? t('common.loading') : t('completude.verifier')}
        </Button>
      ) : (
        <div className="flex flex-col gap-2">
          {data.pret ? (
            <Alert tone="success">{t('completude.pret')}</Alert>
          ) : (
            <Alert tone="error">
              <p className="font-medium">{t('completude.manquant')}</p>
              <ul className="mt-1 list-disc pl-5 text-sm">
                {data.alertes.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </Alert>
          )}
          {data.avertissements.length > 0 ? (
            <Alert tone="warning">
              <ul className="list-disc pl-5 text-sm">
                {data.avertissements.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </Alert>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {data.pret ? (
              <Button size="sm" onPress={() => cloturer(false)} isDisabled={busy}>
                <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                {t('completude.cloturer')}
              </Button>
            ) : (
              <Button size="sm" variant="danger" onPress={() => cloturer(true)} isDisabled={busy}>
                {t('completude.cloturerForce')}
              </Button>
            )}
            <Button size="sm" variant="ghost" onPress={check} isDisabled={loading || busy}>
              {t('completude.rafraichir')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
