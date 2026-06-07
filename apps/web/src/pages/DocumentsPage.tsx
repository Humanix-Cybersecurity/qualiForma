// SPDX-License-Identifier: AGPL-3.0-or-later
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Eye, Trash2, UploadCloud } from 'lucide-react';
import { Alert, Button, Card, Spinner } from '@humanix/ui';
import { useAuth } from '../auth/AuthProvider';
import { api, downloadFile, uploadDocument, viewFile, type DocumentRow } from '../lib/api';
import { PageHeader } from '../components/PageHeader';

const SELECT_CLASS =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

export function DocumentsPage() {
  const { t } = useTranslation();
  const { auth } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState('pdf');
  const [scope, setScope] = useState('tenant');
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [docs, setDocs] = useState<DocumentRow[] | null>(null);

  const reload = useCallback(() => {
    if (auth) api.listDocuments(auth).then(setDocs).catch(() => setDocs([]));
  }, [auth]);
  useEffect(reload, [reload]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!auth || !file) return;
    setMsg(null);
    setError(null);
    setBusy(true);
    try {
      const doc = await uploadDocument(auth, file, { type, scope });
      setMsg(`${t('documents.success')} (${doc.nomFichier})`);
      if (fileRef.current) fileRef.current.value = '';
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title={t('documents.title')} />
      <Card className="max-w-lg">
        {msg ? <div className="mb-4"><Alert tone="success">{msg}</Alert></div> : null}
        {error ? <div className="mb-4"><Alert tone="error">{error}</Alert></div> : null}
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-800">{t('documents.type')}</span>
            <select className={SELECT_CLASS} value={type} onChange={(e) => setType(e.target.value)}>
              <option value="pdf">PDF</option>
              <option value="txt">TXT</option>
              <option value="zip">ZIP</option>
              <option value="syllabus">Syllabus (PDF)</option>
              <option value="autre">Autre</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-800">{t('documents.scope')}</span>
            <select className={SELECT_CLASS} value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="tenant">Organisme</option>
              <option value="formation">Formation</option>
              <option value="session">Session</option>
              <option value="apprenant">Apprenant</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-800">{t('documents.file')}</span>
            <input
              ref={fileRef}
              type="file"
              required
              accept=".pdf,.txt,.zip"
              className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
            />
            <span className="text-xs text-slate-500">{t('documents.hint')}</span>
          </label>
          <Button type="submit" isDisabled={busy} className="self-start">
            <UploadCloud aria-hidden="true" className="h-4 w-4" />
            {busy ? t('common.loading') : t('documents.send')}
          </Button>
        </form>
      </Card>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">{t('documents.listTitle')}</h2>
      {docs === null ? (
        <Spinner label={t('common.loading')} />
      ) : docs.length === 0 ? (
        <Card><p className="text-slate-500">{t('documents.none')}</p></Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {docs.map((d) => (
            <Card key={d.id} as="li">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{d.nomFichier}</p>
                  <p className="text-sm text-slate-500">{d.type} · {d.scope} · {(d.tailleOctets / 1024).toFixed(0)} Ko · {d.createdAt.slice(0, 10)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {d.mimeType === 'application/pdf' || d.mimeType.startsWith('text/') ? (
                    <Button size="sm" variant="ghost" onPress={() => auth && viewFile(auth, `/documents/${d.id}/download?disposition=inline`)}>
                      <Eye aria-hidden="true" className="h-4 w-4" />
                      {t('documents.view')}
                    </Button>
                  ) : null}
                  <Button size="sm" variant="secondary" onPress={() => auth && downloadFile(auth, `/documents/${d.id}/download`, d.nomFichier)}>
                    <Download aria-hidden="true" className="h-4 w-4" />
                    {t('common.download')}
                  </Button>
                  <Button size="sm" variant="ghost" onPress={async () => { if (auth && window.confirm(t('documents.deleteConfirm'))) { await api.deleteDocument(auth, d.id); reload(); } }}>
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                    {t('common.delete')}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </ul>
      )}
    </>
  );
}
