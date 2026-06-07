// SPDX-License-Identifier: AGPL-3.0-or-later
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Plus } from 'lucide-react';
import { Alert, Badge, Button, Card, CardHeader, Spinner, TextField } from '@humanix/ui';
import { useAuth } from '../auth/AuthProvider';
import { api, downloadFile, type Bpf, type FactureRow, type SessionRow } from '../lib/api';
import { PageHeader } from '../components/PageHeader';

interface DraftLigne { designation: string; quantite: string; prixEuros: string; tva: string }
const emptyLigne = (): DraftLigne => ({ designation: '', quantite: '1', prixEuros: '', tva: '0' });

export function FacturationPage() {
  const { t } = useTranslation();
  const { auth } = useAuth();
  const [rows, setRows] = useState<FactureRow[] | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [financeurs, setFinanceurs] = useState<{ value: string; label: string }[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [financeur, setFinanceur] = useState('');
  const [echeance, setEcheance] = useState('');
  const [lignes, setLignes] = useState<DraftLigne[]>([emptyLigne()]);
  const [error, setError] = useState<string | null>(null);
  const [bpf, setBpf] = useState<Bpf | null>(null);
  const [annee, setAnnee] = useState(2026);

  const reload = useCallback(() => {
    if (auth) api.factures(auth).then(setRows).catch(() => setRows([]));
  }, [auth]);
  useEffect(reload, [reload]);
  useEffect(() => {
    if (!auth) return;
    api.sessions(auth).then(setSessions).catch(() => setSessions([]));
    api.financeurs(auth).then(setFinanceurs).catch(() => setFinanceurs([]));
  }, [auth]);

  function patch(i: number, p: Partial<DraftLigne>) {
    setLignes((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...p } : l)));
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!auth) return;
    setError(null);
    try {
      const payloadLignes = lignes
        .filter((l) => l.designation.trim() && l.prixEuros)
        .map((l) => ({
          designation: l.designation.trim(),
          quantite: Number(l.quantite) || 1,
          prixUnitaireCents: Math.round(Number(l.prixEuros) * 100),
          tvaTauxBp: Math.round(Number(l.tva) * 100),
        }));
      if (payloadLignes.length === 0) { setError(t('facturation.needLigne')); return; }
      await api.createFacture(auth, {
        ...(sessionId ? { sessionId } : {}),
        ...(financeur ? { financeur } : {}),
        ...(echeance ? { dateEcheance: echeance } : {}),
        lignes: payloadLignes,
      });
      setSessionId(''); setFinanceur(''); setEcheance(''); setLignes([emptyLigne()]);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  }

  async function paiement(f: FactureRow) {
    if (!auth) return;
    const v = window.prompt(t('facturation.paiementPrompt'), (f.resteCents / 100).toString());
    if (!v) return;
    setError(null);
    try {
      await api.addPaiement(auth, f.id, { montantCents: Math.round(Number(v) * 100) });
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  }

  const euro = (c: number) => `${(c / 100).toLocaleString('fr-FR')} €`;
  const statutTone = (s: string) => (s === 'payee' ? 'success' : s === 'annulee' ? 'neutral' : s === 'partiellement_payee' ? 'warning' : 'brand');

  return (
    <>
      <PageHeader title={t('facturation.title')} />

      {/* Création */}
      <Card className="mb-6 max-w-3xl">
        <CardHeader title={t('facturation.create')} />
        {error ? <div className="mb-3"><Alert tone="error">{error}</Alert></div> : null}
        <form onSubmit={create} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="f-session" className="text-sm font-medium text-slate-800">{t('facturation.session')}</label>
              <select id="f-session" value={sessionId} onChange={(e) => setSessionId(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="">—</option>
                {sessions.map((s) => <option key={s.id} value={s.id}>{s.formation} ({s.dateDebut.slice(0, 10)})</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="f-financeur" className="text-sm font-medium text-slate-800">{t('facturation.financeur')}</label>
              <select id="f-financeur" value={financeur} onChange={(e) => setFinanceur(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="">—</option>
                {financeurs.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <TextField label={t('facturation.echeance')} type="date" value={echeance} onChange={setEcheance} />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-800">{t('facturation.lignes')}</span>
            {lignes.map((l, i) => (
              <div key={i} className="grid grid-cols-12 items-end gap-2">
                <div className="col-span-6"><TextField label={t('facturation.designation')} value={l.designation} onChange={(v) => patch(i, { designation: v })} /></div>
                <div className="col-span-2"><TextField label={t('facturation.qte')} value={l.quantite} onChange={(v) => patch(i, { quantite: v })} inputMode="numeric" /></div>
                <div className="col-span-2"><TextField label={t('facturation.pu')} value={l.prixEuros} onChange={(v) => patch(i, { prixEuros: v })} inputMode="numeric" /></div>
                <div className="col-span-1"><TextField label={t('facturation.tva')} value={l.tva} onChange={(v) => patch(i, { tva: v })} inputMode="numeric" /></div>
                <div className="col-span-1">
                  {lignes.length > 1 ? <Button type="button" size="sm" variant="ghost" onPress={() => setLignes((ls) => ls.filter((_, idx) => idx !== i))}>×</Button> : null}
                </div>
              </div>
            ))}
            <Button type="button" size="sm" variant="secondary" className="self-start" onPress={() => setLignes((ls) => [...ls, emptyLigne()])}>
              <Plus aria-hidden="true" className="h-4 w-4" />{t('facturation.addLigne')}
            </Button>
          </div>
          <Button type="submit" className="self-start">{t('facturation.create')}</Button>
        </form>
      </Card>

      {/* Liste */}
      {rows === null ? (
        <Spinner label={t('common.loading')} />
      ) : rows.length === 0 ? (
        <Card><p className="text-slate-500">{t('facturation.none')}</p></Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((f) => (
            <Card key={f.id} as="li">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{f.numero} · {euro(f.totalTtcCents)} TTC</p>
                  <p className="text-sm text-slate-500">
                    {f.dateEmission.slice(0, 10)}{f.financeur ? ` · ${f.financeur}` : ''} · {t('facturation.reste')} : {euro(f.resteCents)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={statutTone(f.statut)}>{t(`facturation.statut_${f.statut}`)}</Badge>
                  {f.statut !== 'annulee' && f.statut !== 'payee' ? (
                    <Button size="sm" variant="secondary" onPress={() => paiement(f)}>{t('facturation.paiement')}</Button>
                  ) : null}
                  <Button size="sm" variant="ghost" onPress={() => auth && downloadFile(auth, `/factures/${f.id}/facture.pdf`, `${f.numero}.pdf`)}>
                    <Download aria-hidden="true" className="h-4 w-4" />PDF
                  </Button>
                  <Button size="sm" variant="ghost" onPress={() => auth && downloadFile(auth, `/factures/${f.id}/factur-x.xml`, `factur-x-${f.numero}.xml`)}>
                    Factur-X
                  </Button>
                  {f.statut !== 'annulee' ? (
                    <Button size="sm" variant="ghost" onPress={async () => { if (auth && window.confirm(t('facturation.annulerConfirm'))) { await api.annulerFacture(auth, f.id); reload(); } }}>
                      {t('facturation.annuler')}
                    </Button>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </ul>
      )}

      {/* BPF & export */}
      <Card className="mt-8">
        <CardHeader title={t('facturation.bpfTitle')} subtitle={t('facturation.bpfHint')} />
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input type="number" value={annee} onChange={(e) => setAnnee(Number(e.target.value))} aria-label={t('facturation.annee')}
            className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <Button size="sm" onPress={() => auth && api.bpf(auth, annee).then(setBpf).catch(() => undefined)}>{t('facturation.bpfShow')}</Button>
          <Button size="sm" variant="secondary" onPress={() => auth && downloadFile(auth, `/factures/export-comptable?annee=${annee}`, `export-comptable-${annee}.csv`)}>
            <Download aria-hidden="true" className="h-4 w-4" />{t('facturation.exportCompta')}
          </Button>
        </div>
        {bpf ? (
          <div className="text-sm">
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge tone="brand">{bpf.nbSessions} sessions</Badge>
              <Badge tone="brand">{bpf.heuresFormation} h</Badge>
              <Badge tone="brand">{bpf.nbStagiairesDistincts} stagiaires</Badge>
              <Badge tone="brand">{euro(bpf.totalHtCents)} HT</Badge>
            </div>
            <table className="w-full text-left">
              <thead><tr className="text-xs uppercase text-slate-400"><th className="py-1">{t('facturation.financeur')}</th><th>{t('facturation.nbFactures')}</th><th>HT</th><th>TTC</th></tr></thead>
              <tbody>
                {Object.entries(bpf.produits).map(([k, v]) => (
                  <tr key={k} className="border-t border-slate-100">
                    <td className="py-1">{bpf.financeurLabels[k] ?? k}</td>
                    <td>{v.nb}</td><td>{euro(v.ht)}</td><td>{euro(v.ttc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>
    </>
  );
}
