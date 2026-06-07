// SPDX-License-Identifier: AGPL-3.0-or-later
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Button, Card, CardHeader, Spinner } from '@humanix/ui';
import { useAuth } from '../auth/AuthProvider';
import { api, type QuestionnaireMine } from '../lib/api';
import { PageHeader } from '../components/PageHeader';

export function QuestionnairesPage() {
  const { claims } = useAuth();
  return claims?.role === 'admin_of' ? <AdminQuestionnaires /> : <ApprenantQuestionnaires />;
}

// --- Apprenant : répondre ---
function ApprenantQuestionnaires() {
  const { t } = useTranslation();
  const { auth } = useAuth();
  const [list, setList] = useState<QuestionnaireMine[] | null>(null);
  const [active, setActive] = useState<QuestionnaireMine | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (auth) api.questionnairesMine(auth).then(setList).catch(() => setError(t('common.error')));
  }, [auth, t]);
  useEffect(() => { reload(); }, [reload]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!auth || !active) return;
    setError(null);
    try {
      const reponses = active.questions.map((q) => ({ questionId: q.id, valeur: answers[q.id] }));
      await api.soumettre(auth, active.id, reponses);
      setMsg(t('questionnaires.success'));
      setActive(null);
      setAnswers({});
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  }

  if (list === null) return (<><PageHeader title={t('questionnaires.title')} /><Spinner label={t('common.loading')} /></>);

  if (active) {
    return (
      <>
        <PageHeader title={active.titre} actions={<Button variant="ghost" onPress={() => setActive(null)}>{t('common.back')}</Button>} />
        <Card className="max-w-2xl">
          {error ? <div className="mb-4"><Alert tone="error">{error}</Alert></div> : null}
          <form onSubmit={submit} className="flex flex-col gap-5">
            {active.questions.map((q) => (
              <QuestionField
                key={q.id}
                q={q}
                value={answers[q.id] ?? ''}
                onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
              />
            ))}
            <Button type="submit" className="self-start">{t('questionnaires.submit')}</Button>
          </form>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title={t('questionnaires.title')} />
      {msg ? <div className="mb-4"><Alert tone="success">{msg}</Alert></div> : null}
      {list.length === 0 ? (
        <Card><p className="text-slate-500">{t('questionnaires.none')}</p></Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((q) => (
            <Card key={q.id} as="li">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{q.titre}</p>
                  <p className="text-sm text-slate-500">{t('questionnaires.questionsCount', { count: q.questions.length })}</p>
                </div>
                {q.dejaSoumis ? (
                  <Badge tone="success">{t('questionnaires.submitted')}</Badge>
                ) : (
                  <Button size="sm" onPress={() => { setActive(q); setMsg(null); }}>{t('questionnaires.fill')}</Button>
                )}
              </div>
            </Card>
          ))}
        </ul>
      )}
    </>
  );
}

function QuestionField({
  q,
  value,
  onChange,
}: {
  q: QuestionnaireMine['questions'][number];
  value: string;
  onChange: (v: string) => void;
}) {
  const opts = (q.options ?? {}) as { choix?: string[]; min?: number; max?: number };
  const labelId = `q-${q.id}`;
  return (
    <fieldset className="flex flex-col gap-2">
      <legend id={labelId} className="text-sm font-medium text-slate-800">
        {q.libelle}{q.obligatoire ? ' *' : ''}
      </legend>
      {q.type === 'texte_libre' && (
        <textarea
          aria-labelledby={labelId}
          required={q.obligatoire}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        />
      )}
      {q.type === 'echelle' && (
        <input
          type="number"
          aria-labelledby={labelId}
          required={q.obligatoire}
          min={opts.min ?? 1}
          max={opts.max ?? 5}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        />
      )}
      {q.type === 'booleen' && (
        <div className="flex gap-4 text-sm text-slate-700">
          {([['true', 'Oui'], ['false', 'Non']] as const).map(([v, label]) => (
            <label key={v} className="flex items-center gap-2">
              <input type="radio" name={labelId} value={v} checked={value === v} onChange={() => onChange(v)} />
              {label}
            </label>
          ))}
        </div>
      )}
      {q.type === 'choix_unique' && (
        <div className="flex flex-col gap-2 text-sm text-slate-700">
          {(opts.choix ?? []).map((c) => (
            <label key={c} className="flex items-center gap-2">
              <input type="radio" name={labelId} value={c} checked={value === c} onChange={() => onChange(c)} />
              {c}
            </label>
          ))}
        </div>
      )}
      {q.type === 'choix_multiple' && (
        <div className="flex flex-col gap-2 text-sm text-slate-700">
          {(opts.choix ?? []).map((c) => {
            const arr: string[] = value ? JSON.parse(value) : [];
            const checked = arr.includes(c);
            return (
              <label key={c} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const next = checked ? arr.filter((x) => x !== c) : [...arr, c];
                    onChange(JSON.stringify(next));
                  }}
                />
                {c}
              </label>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}

// --- Admin : restitution ---
function AdminQuestionnaires() {
  const { t } = useTranslation();
  const { auth } = useAuth();
  const [list, setList] = useState<{ id: string; titre: string; type: string }[] | null>(null);
  const [resti, setResti] = useState<Awaited<ReturnType<typeof api.restitution>> | null>(null);

  useEffect(() => { if (auth) api.questionnairesAdmin(auth).then(setList).catch(() => setList([])); }, [auth]);

  async function openResti(id: string) {
    if (!auth) return;
    setResti(await api.restitution(auth, id));
  }

  return (
    <>
      <PageHeader title={t('questionnaires.title')} />
      {resti ? (
        <Card className="mb-6">
          <CardHeader
            title={resti.questionnaire.titre}
            subtitle={`${t('questionnaires.completionRate')} : ${Math.round(resti.tauxCompletude * 100)}% (${resti.nbSoumissions}/${resti.nbAttendus})`}
            action={<Button variant="ghost" size="sm" onPress={() => setResti(null)}>{t('common.close')}</Button>}
          />
          <ul className="flex flex-col gap-3">
            {resti.questions.map((q) => (
              <li key={q.questionId} className="rounded-lg bg-slate-50 p-3 text-sm">
                <p className="font-medium text-slate-800">{q.libelle}</p>
                <p className="mt-1 text-slate-600">
                  {q.moyenne !== undefined && `Moyenne : ${q.moyenne}`}
                  {q.tauxVrai !== undefined && `Oui : ${Math.round(q.tauxVrai * 100)}%`}
                  {q.distribution && Object.entries(q.distribution).map(([k, v]) => `${k}: ${v}  `).join('')}
                  {q.verbatims && `${q.verbatims.length} réponse(s)`}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      {list === null ? (
        <Spinner label={t('common.loading')} />
      ) : list.length === 0 ? (
        <Card><p className="text-slate-500">{t('questionnaires.none')}</p></Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((q) => (
            <Card key={q.id} as="li">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-slate-900">{q.titre}</p>
                <Button size="sm" variant="secondary" onPress={() => openResti(q.id)}>{t('questionnaires.restitution')}</Button>
              </div>
            </Card>
          ))}
        </ul>
      )}
    </>
  );
}
