// SPDX-License-Identifier: AGPL-3.0-or-later
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarPlus, CheckCircle2, Download, FileSpreadsheet, ShieldCheck, UserPlus } from 'lucide-react';
import { Alert, Badge, Button, Card, CardHeader, Spinner, TextField } from '@humanix/ui';
import { useAuth } from '../auth/AuthProvider';
import { api, downloadFile, type CreneauRow, type FormationRow, type InscritRow, type SessionCompletude, type SessionRow, type UserRow } from '../lib/api';
import { PageHeader } from '../components/PageHeader';

export function SessionsPage() {
  const { t } = useTranslation();
  const { auth, claims } = useAuth();
  const [rows, setRows] = useState<SessionRow[] | null>(null);
  const [formations, setFormations] = useState<FormationRow[]>([]);
  const isAdmin = claims?.role === 'admin_of';

  function reload() {
    if (auth) api.sessions(auth).then(setRows).catch(() => setRows([]));
  }
  useEffect(reload, [auth]);
  useEffect(() => {
    if (auth && isAdmin) api.formations(auth).then(setFormations).catch(() => setFormations([]));
  }, [auth, isAdmin]);

  return (
    <>
      <PageHeader title={t('sessions.title')} />
      {isAdmin ? <NewSession formations={formations} onCreated={reload} /> : null}
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
              {isAdmin ? <ManageSession session={s} onChanged={reload} /> : null}
              {isAdmin ? <Completude sessionId={s.id} statut={s.statut} onClosed={reload} /> : null}
            </Card>
          ))}
        </ul>
      )}
    </>
  );
}

/** Formulaire de création de session (admin). */
function NewSession({ formations, onCreated }: { formations: FormationRow[]; onCreated: () => void }) {
  const { t } = useTranslation();
  const { auth } = useAuth();
  const [open, setOpen] = useState(false);
  const [formationId, setFormationId] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [lieu, setLieu] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!auth) return;
    setError(null);
    try {
      await api.createSession(auth, { formationId, dateDebut, dateFin, lieu: lieu || undefined });
      setFormationId(''); setDateDebut(''); setDateFin(''); setLieu('');
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  }

  if (!open) {
    return (
      <div className="mb-4">
        <Button size="sm" onPress={() => setOpen(true)} isDisabled={formations.length === 0}>
          <CalendarPlus aria-hidden="true" className="h-4 w-4" />
          {t('sessions.create')}
        </Button>
        {formations.length === 0 ? <p className="mt-2 text-sm text-slate-500">{t('sessions.needFormation')}</p> : null}
      </div>
    );
  }

  return (
    <Card className="mb-6 max-w-2xl">
      <CardHeader title={t('sessions.create')} />
      {error ? <div className="mb-3"><Alert tone="error">{error}</Alert></div> : null}
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="formation" className="text-sm font-medium text-slate-800">{t('sessions.formation')}</label>
          <select id="formation" value={formationId} onChange={(e) => setFormationId(e.target.value)} required
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            <option value="" disabled>{t('sessions.chooseFormation')}</option>
            {formations.map((f) => <option key={f.id} value={f.id}>{f.intitule}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label={t('sessions.dateDebut')} type="date" value={dateDebut} onChange={setDateDebut} isRequired />
          <TextField label={t('sessions.dateFin')} type="date" value={dateFin} onChange={setDateFin} isRequired />
        </div>
        <TextField label={t('sessions.lieu')} value={lieu} onChange={setLieu} />
        <div className="flex gap-2">
          <Button type="submit">{t('common.submit')}</Button>
          <Button type="button" variant="ghost" onPress={() => setOpen(false)}>{t('common.cancel')}</Button>
        </div>
      </form>
    </Card>
  );
}

/** Gestion d'une session : ajout de demi-journées et inscription d'apprenants (admin). */
function ManageSession({ session, onChanged }: { session: SessionRow; onChanged: () => void }) {
  const { t } = useTranslation();
  const { auth } = useAuth();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(session.dateDebut.slice(0, 10));
  const [periode, setPeriode] = useState<'matin' | 'apres_midi'>('matin');
  const [heureDebut, setHeureDebut] = useState('09:00');
  const [heureFin, setHeureFin] = useState('12:30');
  const [apprenants, setApprenants] = useState<UserRow[]>([]);
  const [apprenantEmail, setApprenantEmail] = useState('');
  const [creneaux, setCreneaux] = useState<CreneauRow[]>([]);
  const [inscrits, setInscrits] = useState<InscritRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadLists = useCallback(() => {
    if (!auth) return;
    api.listCreneaux(auth, session.id).then(setCreneaux).catch(() => setCreneaux([]));
    api.listInscrits(auth, session.id).then(setInscrits).catch(() => setInscrits([]));
  }, [auth, session.id]);

  useEffect(() => {
    if (open && auth) {
      api.listUsers(auth, 'apprenant').then(setApprenants).catch(() => setApprenants([]));
      loadLists();
    }
  }, [open, auth, loadLists]);

  function refresh() {
    loadLists();
    onChanged();
  }

  async function removeCreneau(id: string) {
    if (!auth) return;
    setError(null); setMsg(null);
    try {
      await api.deleteCreneau(auth, id);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  }

  async function unenroll(inscriptionId: string) {
    if (!auth) return;
    setError(null); setMsg(null);
    try {
      await api.annulerInscription(auth, inscriptionId);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  }

  async function addCreneau(e: FormEvent) {
    e.preventDefault();
    if (!auth) return;
    setError(null); setMsg(null);
    try {
      await api.addCreneaux(auth, session.id, [{ date, periode, heureDebut, heureFin }]);
      setMsg(t('sessions.creneauAdded'));
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  }

  async function inscrire(e: FormEvent) {
    e.preventDefault();
    if (!auth || !apprenantEmail) return;
    setError(null); setMsg(null);
    try {
      await api.enroll(auth, session.id, apprenantEmail);
      setMsg(t('sessions.enrolled'));
      setApprenantEmail('');
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  }

  if (!open) {
    return (
      <div className="mt-3 border-t border-slate-100 pt-3">
        <Button size="sm" variant="ghost" onPress={() => setOpen(true)}>{t('sessions.manage')}</Button>
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-4 border-t border-slate-100 pt-3">
      {msg ? <Alert tone="success">{msg}</Alert> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Ajout d'une demi-journée */}
        <form onSubmit={addCreneau} className="flex flex-col gap-2 rounded-lg bg-slate-50 p-3">
          <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
            <CalendarPlus aria-hidden="true" className="h-4 w-4" />{t('sessions.addCreneau')}
          </p>
          <TextField label={t('sessions.date')} type="date" value={date} onChange={setDate} isRequired />
          <div className="flex flex-col gap-1">
            <label htmlFor={`periode-${session.id}`} className="text-sm font-medium text-slate-800">{t('sessions.periode')}</label>
            <select id={`periode-${session.id}`} value={periode} onChange={(e) => setPeriode(e.target.value as 'matin' | 'apres_midi')}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
              <option value="matin">{t('sessions.matin')}</option>
              <option value="apres_midi">{t('sessions.apresMidi')}</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <TextField label={t('sessions.heureDebut')} type="time" value={heureDebut} onChange={setHeureDebut} isRequired />
            <TextField label={t('sessions.heureFin')} type="time" value={heureFin} onChange={setHeureFin} isRequired />
          </div>
          <Button type="submit" size="sm" className="self-start">{t('sessions.addCreneau')}</Button>
        </form>

        {/* Inscription d'un apprenant */}
        <form onSubmit={inscrire} className="flex flex-col gap-2 rounded-lg bg-slate-50 p-3">
          <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
            <UserPlus aria-hidden="true" className="h-4 w-4" />{t('sessions.enroll')}
          </p>
          {apprenants.length === 0 ? (
            <p className="text-sm text-slate-500">{t('sessions.noApprenant')}</p>
          ) : (
            <select value={apprenantEmail} onChange={(e) => setApprenantEmail(e.target.value)} required
              aria-label={t('sessions.enroll')}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
              <option value="" disabled>{t('sessions.chooseApprenant')}</option>
              {apprenants.map((a) => (
                <option key={a.id} value={a.email}>{[a.prenom, a.nom].filter(Boolean).join(' ') || a.email} ({a.email})</option>
              ))}
            </select>
          )}
          <Button type="submit" size="sm" className="self-start" isDisabled={!apprenantEmail}>{t('sessions.enroll')}</Button>
        </form>
      </div>

      {/* Listes existantes */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium text-slate-800">{t('sessions.creneauxList')} ({creneaux.length})</p>
          {creneaux.length === 0 ? (
            <p className="text-sm text-slate-500">{t('sessions.noCreneau')}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {creneaux.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm ring-1 ring-slate-100">
                  <span>
                    {c.date.slice(0, 10)} · {c.periode === 'matin' ? t('sessions.matin') : t('sessions.apresMidi')} · {c.heureDebut}–{c.heureFin}
                    {c.scelle ? <Badge tone="success" >{t('sessions.scelle')}</Badge> : null}
                  </span>
                  {!c.scelle && c.nbEmargements === 0 ? (
                    <Button size="sm" variant="ghost" onPress={() => removeCreneau(c.id)}>{t('common.delete')}</Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-slate-800">{t('sessions.inscritsList')} ({inscrits.filter((i) => i.statut !== 'annulee').length})</p>
          {inscrits.length === 0 ? (
            <p className="text-sm text-slate-500">{t('sessions.noInscrit')}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {inscrits.map((i) => (
                <li key={i.inscriptionId} className="flex items-center justify-between gap-2 rounded-md bg-white px-3 py-2 text-sm ring-1 ring-slate-100">
                  <span className={i.statut === 'annulee' ? 'text-slate-400 line-through' : ''}>
                    {[i.apprenant.prenom, i.apprenant.nom].filter(Boolean).join(' ') || i.apprenant.email}
                  </span>
                  <span className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onPress={() => auth && downloadFile(auth, `/inscriptions/${i.inscriptionId}/certificat.pdf`, `certificat-${i.inscriptionId}.pdf`)}>
                      {t('sessions.certificat')}
                    </Button>
                    {i.statut !== 'annulee' ? (
                      <Button size="sm" variant="ghost" onPress={() => unenroll(i.inscriptionId)}>{t('sessions.unenroll')}</Button>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
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
