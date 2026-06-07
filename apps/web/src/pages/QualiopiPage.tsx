// SPDX-License-Identifier: AGPL-3.0-or-later
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, CircleDashed, MinusCircle } from 'lucide-react';
import { Badge, Button, Card, Spinner, Textarea } from '@humanix/ui';
import { useAuth } from '../auth/AuthProvider';
import { api, type QualiopiDashboard, type QualiopiIndicateur } from '../lib/api';
import { PageHeader } from '../components/PageHeader';

const STATUTS = ['conforme', 'a_completer', 'non_applicable'] as const;

export function QualiopiPage() {
  const { t } = useTranslation();
  const { auth, claims } = useAuth();
  const isAdmin = claims?.role === 'admin_of';
  const [data, setData] = useState<QualiopiDashboard | null>(null);

  const reload = useCallback(() => {
    if (auth) api.qualiopiIndicateurs(auth).then(setData).catch(() => setData(null));
  }, [auth]);
  useEffect(reload, [reload]);

  if (!data) {
    return (<><PageHeader title={t('qualiopi.title')} /><Spinner label={t('common.loading')} /></>);
  }

  // Regroupe par critère.
  const parCritere = Object.entries(data.criteres).map(([num, libelle]) => ({
    critere: Number(num),
    libelle,
    indicateurs: data.indicateurs.filter((i) => i.critere === Number(num)),
  }));

  const scoreTone = data.score >= 90 ? 'text-green-700' : data.score >= 60 ? 'text-amber-700' : 'text-red-700';

  return (
    <>
      <PageHeader title={t('qualiopi.title')} description={t('qualiopi.subtitle')} />

      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <p className={`text-4xl font-bold ${scoreTone}`}>{data.score}%</p>
            <p className="text-sm text-slate-500">{t('qualiopi.score')}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge tone="success">{data.conformes} {t('qualiopi.conformes')}</Badge>
            <Badge tone="brand">{data.applicables} {t('qualiopi.applicables')}</Badge>
            <Badge tone="neutral">{data.total} {t('qualiopi.total')}</Badge>
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-6">
        {parCritere.map((c) => (
          <section key={c.critere}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              {t('qualiopi.critere')} {c.critere} — {c.libelle}
            </h2>
            <ul className="flex flex-col gap-2">
              {c.indicateurs.map((ind) => (
                <IndicateurRow key={ind.numero} ind={ind} isAdmin={isAdmin} onChanged={reload} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

function IndicateurRow({ ind, isAdmin, onChanged }: { ind: QualiopiIndicateur; isAdmin: boolean; onChanged: () => void }) {
  const { t } = useTranslation();
  const { auth } = useAuth();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(ind.notes ?? '');

  const Icon = ind.statut === 'conforme' ? CheckCircle2 : ind.statut === 'non_applicable' ? MinusCircle : CircleDashed;
  const tone = ind.statut === 'conforme' ? 'text-green-600' : ind.statut === 'non_applicable' ? 'text-slate-400' : 'text-amber-600';

  async function save(patch: { statut?: (typeof STATUTS)[number]; notes?: string | null }) {
    if (!auth) return;
    await api.setIndicateurStatut(auth, ind.numero, patch);
    onChanged();
  }

  return (
    <Card as="li">
      <div className="flex items-start gap-3">
        <Icon aria-hidden="true" className={`mt-0.5 h-5 w-5 shrink-0 ${tone}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-900">
            <span className="font-semibold">#{ind.numero}</span> {ind.libelle}
            {ind.alternance ? <Badge tone="neutral">alternance</Badge> : null}
            {ind.autoConforme === true ? <span className="ml-2 text-xs text-green-700">✓ {t('qualiopi.autoHint')}</span> : null}
            {ind.autoConforme === false ? <span className="ml-2 text-xs text-amber-700">⚠ {t('qualiopi.autoMiss')}</span> : null}
          </p>
          {open ? (
            <div className="mt-2 flex flex-col gap-2">
              <Textarea label={t('qualiopi.notes')} value={notes} onChange={setNotes} rows={2} />
              <div className="flex gap-2">
                <Button size="sm" onPress={() => { void save({ notes: notes || null }); setOpen(false); }}>{t('common.save')}</Button>
                <Button size="sm" variant="ghost" onPress={() => setOpen(false)}>{t('common.cancel')}</Button>
              </div>
            </div>
          ) : ind.notes ? (
            <p className="mt-1 text-xs text-slate-500">{ind.notes}</p>
          ) : null}
        </div>
        {isAdmin ? (
          <div className="flex shrink-0 items-center gap-2">
            <select
              aria-label={t('qualiopi.statut')}
              value={ind.statut}
              onChange={(e) => void save({ statut: e.target.value as (typeof STATUTS)[number] })}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
            >
              {STATUTS.map((s) => <option key={s} value={s}>{t(`qualiopi.statut_${s}`)}</option>)}
            </select>
            <Button size="sm" variant="ghost" onPress={() => setOpen((o) => !o)}>{t('qualiopi.notes')}</Button>
          </div>
        ) : (
          <Badge tone={ind.statut === 'conforme' ? 'success' : ind.statut === 'non_applicable' ? 'neutral' : 'warning'}>
            {t(`qualiopi.statut_${ind.statut}`)}
          </Badge>
        )}
      </div>
    </Card>
  );
}
