// SPDX-License-Identifier: AGPL-3.0-or-later
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileText } from 'lucide-react';
import { Alert, Badge, Button, Card, CardHeader, Spinner, TextField, Textarea } from '@humanix/ui';
import { useAuth } from '../auth/AuthProvider';
import { api, downloadFile, type FormationRow } from '../lib/api';
import { PageHeader } from '../components/PageHeader';

export function FormationsPage() {
  const { t } = useTranslation();
  const { auth, claims } = useAuth();
  const [rows, setRows] = useState<FormationRow[] | null>(null);
  const [intitule, setIntitule] = useState('');
  const [duree, setDuree] = useState('');
  const [objectifs, setObjectifs] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = claims?.role === 'admin_of';

  // Édition inline d'une formation existante.
  const [editId, setEditId] = useState<string | null>(null);
  const [editIntitule, setEditIntitule] = useState('');
  const [editDuree, setEditDuree] = useState('');

  function startEdit(f: FormationRow) {
    setEditId(f.id);
    setEditIntitule(f.intitule);
    setEditDuree(String(Number(f.dureeHeures)));
  }
  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!auth || !editId) return;
    setError(null);
    try {
      await api.updateFormation(auth, editId, { intitule: editIntitule, dureeHeures: Number(editDuree) });
      setEditId(null);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  }

  const reload = useCallback(() => {
    if (auth) api.formations(auth).then(setRows).catch(() => setRows([]));
  }, [auth]);
  useEffect(reload, [reload]);

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!auth) return;
    setMsg(null);
    setError(null);
    try {
      await api.createFormation(auth, {
        intitule,
        dureeHeures: Number(duree),
        ...(objectifs ? { objectifs } : {}),
      });
      setMsg(t('formations.created'));
      setIntitule('');
      setDuree('');
      setObjectifs('');
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  }

  return (
    <>
      <PageHeader
        title={t('formations.title')}
        actions={
          isAdmin ? (
            <Button variant="secondary" size="sm" onPress={() => auth && downloadFile(auth, '/reglement-interieur.pdf', 'reglement-interieur.pdf')}>
              <FileText aria-hidden="true" className="h-4 w-4" />
              {t('formations.reglement')}
            </Button>
          ) : undefined
        }
      />

      {isAdmin ? (
        <Card className="mb-6 max-w-2xl">
          <CardHeader title={t('formations.create')} />
          {msg ? <div className="mb-3"><Alert tone="success">{msg}</Alert></div> : null}
          {error ? <div className="mb-3"><Alert tone="error">{error}</Alert></div> : null}
          <form onSubmit={create} className="flex flex-col gap-4">
            <TextField label={t('formations.intitule')} value={intitule} onChange={setIntitule} isRequired />
            <TextField label={t('formations.dureeHeures')} value={duree} onChange={setDuree} inputMode="numeric" isRequired />
            <Textarea label={t('formations.objectifs')} value={objectifs} onChange={setObjectifs} rows={3} />
            <Button type="submit" className="self-start">{t('common.save')}</Button>
          </form>
        </Card>
      ) : null}

      {rows === null ? (
        <Spinner label={t('common.loading')} />
      ) : rows.length === 0 ? (
        <Card><p className="text-slate-500">{t('formations.none')}</p></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map((f) => (
            <Card key={f.id}>
              {editId === f.id ? (
                <form onSubmit={saveEdit} className="flex flex-col gap-3">
                  <TextField label={t('formations.intitule')} value={editIntitule} onChange={setEditIntitule} isRequired />
                  <TextField label={t('formations.dureeHeures')} value={editDuree} onChange={setEditDuree} inputMode="numeric" isRequired />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm">{t('common.save')}</Button>
                    <Button type="button" size="sm" variant="ghost" onPress={() => setEditId(null)}>{t('common.cancel')}</Button>
                  </div>
                </form>
              ) : (
              <>
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold text-slate-900">{f.intitule}</h2>
                <Badge tone={f.actif ? 'success' : 'neutral'}>
                  {f.actif ? t('formations.active') : t('formations.inactive')}
                </Badge>
              </div>
              <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
                <div><dt className="inline font-medium">{t('formations.duration')} :</dt>{' '}{Number(f.dureeHeures)} {t('formations.hours')}</div>
                <div>{t('formations.sessionsCount', { count: f._count.sessions })}</div>
              </dl>
              {f.indicateursQualiopi.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1">
                  {f.indicateursQualiopi.map((i) => (
                    <Badge key={i} tone="brand">RNQ {i}</Badge>
                  ))}
                </div>
              ) : null}
              {isAdmin ? (
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => auth && downloadFile(auth, `/formations/${f.id}/programme.pdf`, `programme-${f.id}.pdf`)}
                  >
                    <Download aria-hidden="true" className="h-4 w-4" />
                    {t('formations.programme')}
                  </Button>
                  <Button variant="ghost" size="sm" onPress={() => startEdit(f)}>
                    {t('formations.edit')}
                  </Button>
                </div>
              ) : null}
              </>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
