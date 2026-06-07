// SPDX-License-Identifier: AGPL-3.0-or-later
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, MapPin, Video } from 'lucide-react';
import { Alert, Badge, Card, Spinner, TextField } from '@humanix/ui';
import { useAuth } from '../auth/AuthProvider';
import { api, type AgendaItem, type AgendaResult, type UserRow } from '../lib/api';
import { PageHeader } from '../components/PageHeader';

/** AAAA-MM-JJ de aujourd'hui + n jours (calcul local, sans dépendance). */
function isoPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function PlanningPage() {
  const { t } = useTranslation();
  const { auth, claims } = useAuth();
  const isAdmin = claims?.role === 'admin_of';
  const [from, setFrom] = useState(isoPlus(0));
  const [to, setTo] = useState(isoPlus(30));
  const [formateurId, setFormateurId] = useState('');
  const [formateurs, setFormateurs] = useState<UserRow[]>([]);
  const [data, setData] = useState<AgendaResult | null>(null);

  const reload = useCallback(() => {
    if (auth) api.agenda(auth, from, to, formateurId || undefined).then(setData).catch(() => setData(null));
  }, [auth, from, to, formateurId]);
  useEffect(reload, [reload]);
  useEffect(() => {
    if (auth && isAdmin) api.listUsers(auth, 'formateur').then(setFormateurs).catch(() => setFormateurs([]));
  }, [auth, isAdmin]);

  // Regroupe par jour.
  const parJour = useMemo(() => {
    const map = new Map<string, AgendaItem[]>();
    for (const it of data?.items ?? []) {
      const list = map.get(it.date) ?? [];
      list.push(it);
      map.set(it.date, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [data]);

  return (
    <>
      <PageHeader title={t('planning.title')} />

      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-40"><TextField label={t('planning.from')} type="date" value={from} onChange={setFrom} /></div>
          <div className="w-40"><TextField label={t('planning.to')} type="date" value={to} onChange={setTo} /></div>
          {isAdmin ? (
            <div className="flex flex-col gap-1">
              <label htmlFor="p-formateur" className="text-sm font-medium text-slate-800">{t('planning.formateur')}</label>
              <select id="p-formateur" value={formateurId} onChange={(e) => setFormateurId(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="">{t('planning.tous')}</option>
                {formateurs.map((f) => <option key={f.id} value={f.id}>{[f.prenom, f.nom].filter(Boolean).join(' ') || f.email}</option>)}
              </select>
            </div>
          ) : null}
        </div>
      </Card>

      {data && data.nbConflits > 0 ? (
        <div className="mb-4">
          <Alert tone="warning">
            <span className="inline-flex items-center gap-2"><AlertTriangle aria-hidden="true" className="h-4 w-4" />{t('planning.conflits', { count: data.nbConflits })}</span>
          </Alert>
        </div>
      ) : null}

      {data === null ? (
        <Spinner label={t('common.loading')} />
      ) : parJour.length === 0 ? (
        <Card><p className="text-slate-500">{t('planning.vide')}</p></Card>
      ) : (
        <div className="flex flex-col gap-5">
          {parJour.map(([jour, items]) => (
            <section key={jour}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                {new Date(jour).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h2>
              <ul className="flex flex-col gap-2">
                {items.map((it) => (
                  <Card key={it.id} as="li" className={it.conflits.length ? 'ring-1 ring-amber-300' : undefined}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{it.heureDebut}–{it.heureFin} · {it.formation}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                          {it.formateur ? <span>{it.formateur}</span> : <span className="text-amber-700">{t('planning.sansFormateur')}</span>}
                          {it.lieu ? <span className="inline-flex items-center gap-1"><MapPin aria-hidden="true" className="h-3.5 w-3.5" />{it.lieu}</span> : null}
                          {it.visioUrl ? <span className="inline-flex items-center gap-1"><Video aria-hidden="true" className="h-3.5 w-3.5" />visio</span> : null}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {it.signatureOuverte ? <Badge tone="success">{t('planning.emargementOuvert')}</Badge> : null}
                        {it.conflits.some((c) => c.type === 'formateur') ? <Badge tone="warning">{t('planning.conflitFormateur')}</Badge> : null}
                        {it.conflits.some((c) => c.type === 'lieu') ? <Badge tone="warning">{t('planning.conflitLieu')}</Badge> : null}
                      </div>
                    </div>
                  </Card>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
