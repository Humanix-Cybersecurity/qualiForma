// SPDX-License-Identifier: AGPL-3.0-or-later
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Circle, FileText, PlayCircle } from 'lucide-react';
import { Badge, Button, Card, Spinner } from '@humanix/ui';
import { useAuth } from '../auth/AuthProvider';
import { api, type MonModule } from '../lib/api';
import { PageHeader } from '../components/PageHeader';

export function MesCoursPage() {
  const { t } = useTranslation();
  const { auth } = useAuth();
  const [modules, setModules] = useState<MonModule[] | null>(null);
  const [active, setActive] = useState<MonModule | null>(null);

  const reload = useCallback(() => {
    if (auth) api.mesModules(auth).then((m) => {
      setModules(m);
      setActive((a) => (a ? m.find((x) => x.id === a.id) ?? null : null));
    }).catch(() => setModules([]));
  }, [auth]);
  useEffect(reload, [reload]);

  async function toggle(leconId: string, fait: boolean) {
    if (!auth) return;
    await api.marquerLecon(auth, leconId, fait);
    reload();
  }

  if (modules === null) return (<><PageHeader title={t('mescours.title')} /><Spinner label={t('common.loading')} /></>);

  if (active) {
    return (
      <>
        <PageHeader title={active.titre} actions={<Button variant="ghost" onPress={() => setActive(null)}>{t('common.back')}</Button>} />
        {active.description ? <p className="mb-4 text-slate-600">{active.description}</p> : null}
        <ul className="flex flex-col gap-3">
          {active.lecons.map((l) => (
            <Card key={l.id} as="li">
              <div className="flex items-start gap-3">
                <button type="button" aria-label={l.fait ? t('mescours.marquerNonFait') : t('mescours.marquerFait')} onClick={() => toggle(l.id, !l.fait)}>
                  {l.fait ? <CheckCircle2 className="h-6 w-6 text-green-600" /> : <Circle className="h-6 w-6 text-slate-300" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">
                    {l.type === 'video' ? <PlayCircle className="mr-1 inline h-4 w-4" /> : l.type === 'pdf' ? <FileText className="mr-1 inline h-4 w-4" /> : null}
                    {l.titre}
                  </p>
                  {l.type === 'texte' && l.contenu ? <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{l.contenu}</p> : null}
                  {l.type === 'video' && l.contenu ? (
                    <div className="mt-2 aspect-video max-w-2xl">
                      <iframe src={l.contenu} title={l.titre} className="h-full w-full rounded-lg" allowFullScreen />
                    </div>
                  ) : null}
                  {l.type === 'pdf' && l.contenu ? (
                    <a href={l.contenu} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm text-brand-700 underline">
                      {t('mescours.ouvrirPdf')}
                    </a>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </ul>
      </>
    );
  }

  return (
    <>
      <PageHeader title={t('mescours.title')} />
      {modules.length === 0 ? (
        <Card><p className="text-slate-500">{t('mescours.none')}</p></Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {modules.map((m) => (
            <Card key={m.id} as="li">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{m.titre}</p>
                  <p className="text-sm text-slate-500">{m.faits}/{m.total} {t('mescours.lecons')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full bg-brand-500" style={{ width: `${m.progression}%` }} />
                  </div>
                  <Badge tone={m.progression === 100 ? 'success' : 'brand'}>{m.progression}%</Badge>
                  <Button size="sm" onPress={() => setActive(m)}>{t('mescours.ouvrir')}</Button>
                </div>
              </div>
            </Card>
          ))}
        </ul>
      )}
    </>
  );
}
