// SPDX-License-Identifier: AGPL-3.0-or-later
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { Alert, Badge, Button, Card, CardHeader, Spinner, TextField } from '@humanix/ui';
import { useAuth } from '../auth/AuthProvider';
import { api, downloadFile, type ConventionRow, type SessionRow } from '../lib/api';
import { PageHeader } from '../components/PageHeader';

const STATUTS = ['brouillon', 'envoyee', 'signee', 'annulee'] as const;

export function ConventionsPage() {
  const { t } = useTranslation();
  const { auth } = useAuth();
  const [rows, setRows] = useState<ConventionRow[] | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [entreprises, setEntreprises] = useState<{ id: string; raisonSociale: string }[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [entrepriseId, setEntrepriseId] = useState('');
  const [nouvelleEntreprise, setNouvelleEntreprise] = useState('');
  const [montant, setMontant] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!auth) return;
    api.conventions(auth).then(setRows).catch(() => setRows([]));
    api.entreprises(auth).then(setEntreprises).catch(() => setEntreprises([]));
  }, [auth]);
  useEffect(reload, [reload]);
  useEffect(() => {
    if (auth) api.sessions(auth).then(setSessions).catch(() => setSessions([]));
  }, [auth]);

  const statutLabel = (s: string) => t(`conventions.statut_${s}`);

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!auth) return;
    setError(null);
    try {
      const body: Parameters<typeof api.createConvention>[1] = { sessionId };
      if (entrepriseId) body.entrepriseId = entrepriseId;
      else if (nouvelleEntreprise.trim()) body.entreprise = { raisonSociale: nouvelleEntreprise.trim() };
      else { setError(t('conventions.needEntreprise')); return; }
      if (montant) body.montantCents = Math.round(Number(montant) * 100);
      await api.createConvention(auth, body);
      setSessionId(''); setEntrepriseId(''); setNouvelleEntreprise(''); setMontant('');
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  }

  async function changeStatut(id: string, statut: (typeof STATUTS)[number]) {
    if (!auth) return;
    setError(null);
    try {
      await api.setConventionStatut(auth, id, statut);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  }

  return (
    <>
      <PageHeader title={t('conventions.title')} />
      <Card className="mb-6 max-w-2xl">
        <CardHeader title={t('conventions.create')} subtitle={t('conventions.createHint')} />
        {error ? <div className="mb-3"><Alert tone="error">{error}</Alert></div> : null}
        <form onSubmit={create} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="conv-session" className="text-sm font-medium text-slate-800">{t('conventions.session')}</label>
            <select id="conv-session" value={sessionId} onChange={(e) => setSessionId(e.target.value)} required
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
              <option value="" disabled>{t('conventions.chooseSession')}</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>{s.formation}{s.intitule ? ` — ${s.intitule}` : ''} ({s.dateDebut.slice(0, 10)})</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="conv-ent" className="text-sm font-medium text-slate-800">{t('conventions.entreprise')}</label>
            <select id="conv-ent" value={entrepriseId} onChange={(e) => setEntrepriseId(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
              <option value="">{t('conventions.newEntreprise')}</option>
              {entreprises.map((en) => <option key={en.id} value={en.id}>{en.raisonSociale}</option>)}
            </select>
          </div>
          {!entrepriseId ? (
            <TextField label={t('conventions.entrepriseNom')} value={nouvelleEntreprise} onChange={setNouvelleEntreprise} />
          ) : null}
          <TextField label={t('conventions.montant')} value={montant} onChange={setMontant} inputMode="numeric" />
          <Button type="submit" className="self-start">{t('conventions.create')}</Button>
        </form>
      </Card>

      {rows === null ? (
        <Spinner label={t('common.loading')} />
      ) : rows.length === 0 ? (
        <Card><p className="text-slate-500">{t('conventions.none')}</p></Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((c) => (
            <Card key={c.id} as="li">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{c.numero}{c.entreprise ? ` · ${c.entreprise}` : ''}</p>
                  <p className="text-sm text-slate-500">
                    {c.formation ?? '—'}{c.montantCents != null ? ` · ${(c.montantCents / 100).toLocaleString('fr-FR')} €` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={c.statut === 'signee' ? 'success' : c.statut === 'annulee' ? 'neutral' : 'brand'}>{statutLabel(c.statut)}</Badge>
                  <select aria-label={t('conventions.statut')} value={c.statut} onChange={(e) => changeStatut(c.id, e.target.value as (typeof STATUTS)[number])}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm">
                    {STATUTS.map((s) => <option key={s} value={s}>{statutLabel(s)}</option>)}
                  </select>
                  <Button size="sm" variant="secondary" onPress={() => auth && downloadFile(auth, `/conventions/${c.id}/convention.pdf`, `${c.numero}.pdf`)}>
                    <Download aria-hidden="true" className="h-4 w-4" />
                    {t('conventions.pdf')}
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
