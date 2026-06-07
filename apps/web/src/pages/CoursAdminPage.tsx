// SPDX-License-Identifier: AGPL-3.0-or-later
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { Alert, Badge, Button, Card, CardHeader, Spinner, TextField, Textarea } from '@humanix/ui';
import { useAuth } from '../auth/AuthProvider';
import { api, type FormationRow, type ModuleAdmin } from '../lib/api';
import { PageHeader } from '../components/PageHeader';

export function CoursAdminPage() {
  const { t } = useTranslation();
  const { auth } = useAuth();
  const [formations, setFormations] = useState<FormationRow[]>([]);
  const [modules, setModules] = useState<ModuleAdmin[] | null>(null);
  const [formationId, setFormationId] = useState('');
  const [titre, setTitre] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (auth) api.modules(auth).then(setModules).catch(() => setModules([]));
  }, [auth]);
  useEffect(reload, [reload]);
  useEffect(() => {
    if (auth) api.formations(auth).then(setFormations).catch(() => setFormations([]));
  }, [auth]);

  const formationNom = (id: string) => formations.find((f) => f.id === id)?.intitule ?? id;

  async function createModule(e: FormEvent) {
    e.preventDefault();
    if (!auth || !formationId || !titre.trim()) return;
    setError(null);
    try {
      await api.createModule(auth, { formationId, titre: titre.trim() });
      setTitre('');
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  }

  return (
    <>
      <PageHeader title={t('cours.title')} description={t('cours.subtitle')} />

      <Card className="mb-6 max-w-2xl">
        <CardHeader title={t('cours.createModule')} />
        {error ? <div className="mb-3"><Alert tone="error">{error}</Alert></div> : null}
        <form onSubmit={createModule} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="c-formation" className="text-sm font-medium text-slate-800">{t('cours.formation')}</label>
            <select id="c-formation" value={formationId} onChange={(e) => setFormationId(e.target.value)} required
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
              <option value="" disabled>{t('cours.chooseFormation')}</option>
              {formations.map((f) => <option key={f.id} value={f.id}>{f.intitule}</option>)}
            </select>
          </div>
          <TextField label={t('cours.moduleTitre')} value={titre} onChange={setTitre} isRequired />
          <Button type="submit" className="self-start">{t('cours.createModule')}</Button>
        </form>
      </Card>

      {modules === null ? (
        <Spinner label={t('common.loading')} />
      ) : modules.length === 0 ? (
        <Card><p className="text-slate-500">{t('cours.none')}</p></Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {modules.map((m) => <ModuleCard key={m.id} module={m} formationNom={formationNom(m.formationId)} onChanged={reload} />)}
        </ul>
      )}
    </>
  );
}

function ModuleCard({ module: m, formationNom, onChanged }: { module: ModuleAdmin; formationNom: string; onChanged: () => void }) {
  const { t } = useTranslation();
  const { auth } = useAuth();
  const [titre, setTitre] = useState('');
  const [type, setType] = useState<'texte' | 'video' | 'pdf'>('texte');
  const [contenu, setContenu] = useState('');

  async function addLecon(e: FormEvent) {
    e.preventDefault();
    if (!auth || !titre.trim()) return;
    await api.addLecon(auth, m.id, { titre: titre.trim(), type, contenu: contenu || undefined });
    setTitre(''); setContenu('');
    onChanged();
  }

  return (
    <Card as="li">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-slate-900">{m.titre}</p>
          <p className="text-sm text-slate-500">{formationNom} · {m._count.lecons} {t('cours.lecons')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={m.publie ? 'success' : 'neutral'}>{m.publie ? t('cours.publie') : t('cours.brouillon')}</Badge>
          {auth ? (
            <Button size="sm" variant="secondary" onPress={() => api.updateModule(auth, m.id, { publie: !m.publie }).then(onChanged)}>
              {m.publie ? t('cours.depublier') : t('cours.publier')}
            </Button>
          ) : null}
          {auth ? (
            <Button size="sm" variant="ghost" onPress={() => { if (window.confirm(t('cours.deleteModuleConfirm'))) api.deleteModule(auth, m.id).then(onChanged); }}>
              <Trash2 aria-hidden="true" className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>

      {m.lecons.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-1 border-t border-slate-100 pt-3">
          {m.lecons.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-2 text-sm">
              <span><Badge tone="neutral">{t(`cours.type_${l.type}`)}</Badge> {l.titre}</span>
              {auth ? (
                <Button size="sm" variant="ghost" onPress={() => api.deleteLecon(auth, l.id).then(onChanged)}>{t('common.delete')}</Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <form onSubmit={addLecon} className="mt-3 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
        <div className="min-w-40 flex-1"><TextField label={t('cours.leconTitre')} value={titre} onChange={setTitre} /></div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-800" htmlFor={`type-${m.id}`}>{t('cours.type')}</label>
          <select id={`type-${m.id}`} value={type} onChange={(e) => setType(e.target.value as typeof type)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            <option value="texte">{t('cours.type_texte')}</option>
            <option value="video">{t('cours.type_video')}</option>
            <option value="pdf">{t('cours.type_pdf')}</option>
          </select>
        </div>
        <div className="w-full"><Textarea label={type === 'texte' ? t('cours.contenuTexte') : t('cours.contenuUrl')} value={contenu} onChange={setContenu} rows={type === 'texte' ? 3 : 1} /></div>
        <Button type="submit" size="sm" variant="secondary"><Plus aria-hidden="true" className="h-4 w-4" />{t('cours.addLecon')}</Button>
      </form>
    </Card>
  );
}
