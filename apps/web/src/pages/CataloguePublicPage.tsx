// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Alert, Badge, Button, Card, Spinner, TextField, Textarea } from '@humanix/ui';
import { api, type PublicCatalogue } from '../lib/api';
import { Logo } from '../components/Logo';

export function CataloguePublicPage() {
  const { t } = useTranslation();
  const { slug = '' } = useParams();
  const [data, setData] = useState<PublicCatalogue | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [openForm, setOpenForm] = useState<{ formationId: string; sessionId?: string; intitule: string } | null>(null);

  useEffect(() => {
    api.publicCatalogue(slug).then(setData).catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <Alert tone="error">{t('catalogue.notFound')}</Alert>
      </main>
    );
  }
  if (!data) {
    return <main className="grid min-h-screen place-items-center"><Spinner label={t('common.loading')} /></main>;
  }

  const euro = (c: number | null) => (c == null ? null : `${(c / 100).toLocaleString('fr-FR')} €`);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-3 p-4">
          <Logo />
          <span className="text-slate-300">|</span>
          <h1 className="text-lg font-semibold text-slate-900">{data.organisme}</h1>
        </div>
      </header>

      <main id="contenu" className="mx-auto max-w-4xl p-4 sm:p-8">
        <h2 className="mb-1 text-2xl font-bold text-slate-900">{t('catalogue.title')}</h2>
        <p className="mb-6 text-slate-600">{t('catalogue.subtitle')}</p>

        {data.formations.length === 0 ? (
          <Card><p className="text-slate-500">{t('catalogue.empty')}</p></Card>
        ) : (
          <div className="flex flex-col gap-4">
            {data.formations.map((f) => (
              <Card key={f.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900">{f.intitule}</h3>
                    <div className="mt-1 flex flex-wrap gap-2 text-sm">
                      <Badge tone="neutral">{f.dureeHeures} h</Badge>
                      {euro(f.tarifCents) ? <Badge tone="brand">{euro(f.tarifCents)}</Badge> : null}
                    </div>
                    {f.objectifs ? <p className="mt-2 text-sm text-slate-600">{f.objectifs}</p> : null}
                    {f.modalitesAccesHandicap ? (
                      <p className="mt-2 text-xs text-slate-500">♿ {f.modalitesAccesHandicap}</p>
                    ) : null}
                  </div>
                </div>
                {f.sessions.length > 0 ? (
                  <ul className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
                    {f.sessions.map((s) => (
                      <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="text-slate-700">
                          {s.dateDebut.slice(0, 10)} → {s.dateFin.slice(0, 10)}{s.lieu ? ` · ${s.lieu}` : ''}
                        </span>
                        <Button size="sm" onPress={() => setOpenForm({ formationId: f.id, sessionId: s.id, intitule: f.intitule })}>
                          {t('catalogue.register')}
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <Button size="sm" variant="secondary" onPress={() => setOpenForm({ formationId: f.id, intitule: f.intitule })}>
                      {t('catalogue.interested')}
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>

      {openForm ? <DemandeModal slug={slug} ctx={openForm} onClose={() => setOpenForm(null)} /> : null}
    </div>
  );
}

function DemandeModal({
  slug,
  ctx,
  onClose,
}: {
  slug: string;
  ctx: { formationId: string; sessionId?: string; intitule: string };
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.submitDemande(slug, {
        formationId: ctx.formationId,
        ...(ctx.sessionId ? { sessionId: ctx.sessionId } : {}),
        nom, prenom, email,
        ...(telephone ? { telephone } : {}),
        ...(message ? { message } : {}),
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-1 font-semibold text-slate-900">{t('catalogue.register')}</h3>
        <p className="mb-4 text-sm text-slate-500">{ctx.intitule}</p>
        {sent ? (
          <>
            <Alert tone="success">{t('catalogue.sent')}</Alert>
            <Button className="mt-4" onPress={onClose}>{t('common.close')}</Button>
          </>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            {error ? <Alert tone="error">{error}</Alert> : null}
            <div className="grid grid-cols-2 gap-3">
              <TextField label={t('catalogue.prenom')} value={prenom} onChange={setPrenom} />
              <TextField label={t('catalogue.nom')} value={nom} onChange={setNom} isRequired />
            </div>
            <TextField label={t('catalogue.email')} type="email" value={email} onChange={setEmail} isRequired />
            <TextField label={t('catalogue.telephone')} value={telephone} onChange={setTelephone} />
            <Textarea label={t('catalogue.message')} value={message} onChange={setMessage} rows={3} />
            <div className="flex gap-2">
              <Button type="submit">{t('catalogue.send')}</Button>
              <Button type="button" variant="ghost" onPress={onClose}>{t('common.cancel')}</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
