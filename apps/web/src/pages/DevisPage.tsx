// SPDX-License-Identifier: AGPL-3.0-or-later
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Plus } from 'lucide-react';
import { Alert, Badge, Button, Card, CardHeader, Spinner, TextField } from '@humanix/ui';
import { useAuth } from '../auth/AuthProvider';
import { api, downloadFile, type DevisRow, type SessionRow } from '../lib/api';
import { PageHeader } from '../components/PageHeader';

interface DraftLigne { designation: string; quantite: string; prixEuros: string; tva: string }
const emptyLigne = (): DraftLigne => ({ designation: '', quantite: '1', prixEuros: '', tva: '0' });
const STATUTS = ['brouillon', 'envoye', 'accepte', 'refuse', 'expire'] as const;

export function DevisPage() {
  const { t } = useTranslation();
  const { auth } = useAuth();
  const [rows, setRows] = useState<DevisRow[] | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [financeurs, setFinanceurs] = useState<{ value: string; label: string }[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [financeur, setFinanceur] = useState('');
  const [lignes, setLignes] = useState<DraftLigne[]>([emptyLigne()]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (auth) api.devis(auth).then(setRows).catch(() => setRows([]));
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
    setError(null); setMsg(null);
    try {
      const payloadLignes = lignes
        .filter((l) => l.designation.trim() && l.prixEuros)
        .map((l) => ({
          designation: l.designation.trim(),
          quantite: Number(l.quantite) || 1,
          prixUnitaireCents: Math.round(Number(l.prixEuros) * 100),
          tvaTauxBp: Math.round(Number(l.tva) * 100),
        }));
      if (payloadLignes.length === 0) { setError(t('devis.needLigne')); return; }
      await api.createDevis(auth, {
        ...(sessionId ? { sessionId } : {}),
        ...(financeur ? { financeur } : {}),
        lignes: payloadLignes,
      });
      setSessionId(''); setFinanceur(''); setLignes([emptyLigne()]);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  }

  async function convertir(d: DevisRow) {
    if (!auth) return;
    setError(null); setMsg(null);
    try {
      const r = await api.convertirDevis(auth, d.id);
      setMsg(t('devis.converted', { numero: r.numero }));
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  }

  const euro = (c: number) => `${(c / 100).toLocaleString('fr-FR')} €`;
  const tone = (s: string) => (s === 'accepte' ? 'success' : s === 'refuse' || s === 'expire' ? 'neutral' : 'brand');

  return (
    <>
      <PageHeader title={t('devis.title')} />
      <Card className="mb-6 max-w-3xl">
        <CardHeader title={t('devis.create')} />
        {error ? <div className="mb-3"><Alert tone="error">{error}</Alert></div> : null}
        {msg ? <div className="mb-3"><Alert tone="success">{msg}</Alert></div> : null}
        <form onSubmit={create} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="d-session" className="text-sm font-medium text-slate-800">{t('devis.session')}</label>
              <select id="d-session" value={sessionId} onChange={(e) => setSessionId(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="">—</option>
                {sessions.map((s) => <option key={s.id} value={s.id}>{s.formation} ({s.dateDebut.slice(0, 10)})</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="d-financeur" className="text-sm font-medium text-slate-800">{t('devis.financeur')}</label>
              <select id="d-financeur" value={financeur} onChange={(e) => setFinanceur(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="">—</option>
                {financeurs.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-800">{t('devis.lignes')}</span>
            {lignes.map((l, i) => (
              <div key={i} className="grid grid-cols-12 items-end gap-2">
                <div className="col-span-6"><TextField label={t('devis.designation')} value={l.designation} onChange={(v) => patch(i, { designation: v })} /></div>
                <div className="col-span-2"><TextField label={t('devis.qte')} value={l.quantite} onChange={(v) => patch(i, { quantite: v })} inputMode="numeric" /></div>
                <div className="col-span-2"><TextField label={t('devis.pu')} value={l.prixEuros} onChange={(v) => patch(i, { prixEuros: v })} inputMode="numeric" /></div>
                <div className="col-span-1"><TextField label={t('devis.tva')} value={l.tva} onChange={(v) => patch(i, { tva: v })} inputMode="numeric" /></div>
                <div className="col-span-1">
                  {lignes.length > 1 ? <Button type="button" size="sm" variant="ghost" onPress={() => setLignes((ls) => ls.filter((_, idx) => idx !== i))}>×</Button> : null}
                </div>
              </div>
            ))}
            <Button type="button" size="sm" variant="secondary" className="self-start" onPress={() => setLignes((ls) => [...ls, emptyLigne()])}>
              <Plus aria-hidden="true" className="h-4 w-4" />{t('devis.addLigne')}
            </Button>
          </div>
          <Button type="submit" className="self-start">{t('devis.create')}</Button>
        </form>
      </Card>

      {rows === null ? (
        <Spinner label={t('common.loading')} />
      ) : rows.length === 0 ? (
        <Card><p className="text-slate-500">{t('devis.none')}</p></Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((d) => (
            <Card key={d.id} as="li">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{d.numero} · {euro(d.totalTtcCents)} TTC</p>
                  <p className="text-sm text-slate-500">{d.dateDevis.slice(0, 10)} · {t('devis.validite', { n: d.validiteJours })}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={tone(d.statut)}>{t(`devis.statut_${d.statut}`)}</Badge>
                  <select aria-label={t('devis.statut')} value={d.statut} onChange={(e) => auth && api.setDevisStatut(auth, d.id, e.target.value as (typeof STATUTS)[number]).then(reload)}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm">
                    {STATUTS.map((s) => <option key={s} value={s}>{t(`devis.statut_${s}`)}</option>)}
                  </select>
                  <Button size="sm" variant="ghost" onPress={() => auth && downloadFile(auth, `/devis/${d.id}/devis.pdf`, `${d.numero}.pdf`)}>
                    <Download aria-hidden="true" className="h-4 w-4" />PDF
                  </Button>
                  {d.factureId ? (
                    <Badge tone="success">{t('devis.facture')}</Badge>
                  ) : (
                    <Button size="sm" onPress={() => convertir(d)}>{t('devis.convertir')}</Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </ul>
      )}
    </>
  );
}
