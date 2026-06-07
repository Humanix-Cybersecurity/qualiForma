// SPDX-License-Identifier: AGPL-3.0-or-later
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Card, CardHeader, Spinner, TextField, Textarea } from '@humanix/ui';
import { useAuth } from '../auth/AuthProvider';
import { api, type ReclamationRow } from '../lib/api';
import { PageHeader } from '../components/PageHeader';

const STATUTS = ['ouverte', 'en_traitement', 'resolue', 'cloturee'] as const;

export function ReclamationsPage() {
  const { t } = useTranslation();
  const { auth } = useAuth();
  const [rows, setRows] = useState<ReclamationRow[] | null>(null);
  const [objet, setObjet] = useState('');
  const [description, setDescription] = useState('');
  const [actions, setActions] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (auth) api.reclamations(auth).then(setRows).catch(() => setRows([]));
  }, [auth]);
  useEffect(reload, [reload]);

  const statutLabel = (s: string) =>
    s === 'ouverte' ? t('reclamations.statutOuverte')
    : s === 'en_traitement' ? t('reclamations.statutEnTraitement')
    : s === 'resolue' ? t('reclamations.statutResolue')
    : t('reclamations.statutCloturee');

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!auth) return;
    await api.createReclamation(auth, { objet, description });
    setMsg(t('reclamations.created'));
    setObjet('');
    setDescription('');
    reload();
  }
  async function changeStatut(id: string, statut: string) {
    if (!auth) return;
    await api.setReclamationStatut(auth, id, statut);
    reload();
  }
  async function addAction(id: string) {
    if (!auth || !actions[id]) return;
    await api.addReclamationAction(auth, id, actions[id]);
    setActions((a) => ({ ...a, [id]: '' }));
    reload();
  }

  return (
    <>
      <PageHeader title={t('reclamations.title')} />
      <Card className="mb-6 max-w-2xl">
        <CardHeader title={t('reclamations.create')} />
        {msg ? <div className="mb-3"><Alert tone="success">{msg}</Alert></div> : null}
        <form onSubmit={create} className="flex flex-col gap-4">
          <TextField label={t('reclamations.objet')} value={objet} onChange={setObjet} isRequired />
          <Textarea label={t('reclamations.description')} value={description} onChange={setDescription} rows={3} isRequired />
          <Button type="submit" className="self-start">{t('common.submit')}</Button>
        </form>
      </Card>

      {rows === null ? (
        <Spinner label={t('common.loading')} />
      ) : rows.length === 0 ? (
        <Card><p className="text-slate-500">{t('reclamations.none')}</p></Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <Card key={r.id} as="li">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{r.objet}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{r.description}</p>
                </div>
                <select
                  aria-label={t('reclamations.statut')}
                  value={r.statut}
                  onChange={(e) => changeStatut(r.id, e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
                >
                  {STATUTS.map((s) => (
                    <option key={s} value={s}>{statutLabel(s)}</option>
                  ))}
                </select>
              </div>
              {r.actions.length > 0 ? (
                <ul className="mt-3 list-disc pl-5 text-sm text-slate-600">
                  {r.actions.map((a) => <li key={a.id}>{a.description}</li>)}
                </ul>
              ) : null}
              <div className="mt-3 flex items-end gap-2">
                <div className="flex-1">
                  <TextField
                    label={t('reclamations.action')}
                    value={actions[r.id] ?? ''}
                    onChange={(v) => setActions((a) => ({ ...a, [r.id]: v }))}
                  />
                </div>
                <Button size="sm" variant="secondary" onPress={() => addAction(r.id)}>
                  {t('reclamations.addAction')}
                </Button>
              </div>
            </Card>
          ))}
        </ul>
      )}
    </>
  );
}
