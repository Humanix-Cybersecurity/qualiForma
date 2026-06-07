// SPDX-License-Identifier: AGPL-3.0-or-later
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Button, Card, CardHeader, Spinner, TextField } from '@humanix/ui';
import { useAuth } from '../auth/AuthProvider';
import { api, downloadFile, type QuestionnaireMine } from '../lib/api';
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

  const reload = useCallback(() => {
    if (auth) api.questionnairesAdmin(auth).then(setList).catch(() => setList([]));
  }, [auth]);
  useEffect(reload, [reload]);

  async function openResti(id: string) {
    if (!auth) return;
    setResti(await api.restitution(auth, id));
  }

  // Vue dédiée : la restitution REMPLACE la liste (évite le double volet source de confusion).
  if (resti) {
    return (
      <>
        <PageHeader
          title={resti.questionnaire.titre}
          actions={<Button variant="ghost" onPress={() => setResti(null)}>{t('common.back')}</Button>}
        />
        <Card>
          <CardHeader
            title={t('questionnaires.restitution')}
            subtitle={`${t('questionnaires.completionRate')} : ${Math.round(resti.tauxCompletude * 100)}% (${resti.nbSoumissions}/${resti.nbAttendus})`}
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
      </>
    );
  }

  return (
    <>
      <PageHeader title={t('questionnaires.title')} />
      <NewQuestionnaire onCreated={reload} />
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
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onPress={() => openResti(q.id)}>{t('questionnaires.restitution')}</Button>
                  <Button size="sm" variant="ghost" onPress={() => auth && downloadFile(auth, `/questionnaires/${q.id}/restitution.csv`, `restitution-${q.id}.csv`)}>CSV</Button>
                </div>
              </div>
            </Card>
          ))}
        </ul>
      )}
    </>
  );
}

const QUESTIONNAIRE_TYPES = [
  'positionnement_amont',
  'evaluation_acquis',
  'satisfaction_chaud',
  'satisfaction_froid',
  'recueil_besoin',
] as const;
const QUESTION_TYPES = ['texte_libre', 'choix_unique', 'choix_multiple', 'echelle', 'booleen'] as const;

interface DraftQuestion {
  libelle: string;
  type: (typeof QUESTION_TYPES)[number];
  obligatoire: boolean;
  choixText: string;
  min: string;
  max: string;
}
const emptyQuestion = (): DraftQuestion => ({ libelle: '', type: 'texte_libre', obligatoire: true, choixText: '', min: '1', max: '5' });

/** Création d'un questionnaire avec ses questions (admin). */
function NewQuestionnaire({ onCreated }: { onCreated: () => void }) {
  const { t } = useTranslation();
  const { auth } = useAuth();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<(typeof QUESTIONNAIRE_TYPES)[number]>('satisfaction_chaud');
  const [titre, setTitre] = useState('');
  const [anonyme, setAnonyme] = useState(false);
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyQuestion()]);
  const [error, setError] = useState<string | null>(null);

  function patch(i: number, p: Partial<DraftQuestion>) {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...p } : q)));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!auth) return;
    setError(null);
    try {
      const payloadQuestions = questions
        .filter((q) => q.libelle.trim())
        .map((q) => {
          let options: unknown;
          if (q.type === 'choix_unique' || q.type === 'choix_multiple') {
            options = { choix: q.choixText.split(',').map((c) => c.trim()).filter(Boolean) };
          } else if (q.type === 'echelle') {
            options = { min: Number(q.min), max: Number(q.max) };
          }
          return { libelle: q.libelle.trim(), type: q.type, obligatoire: q.obligatoire, ...(options ? { options } : {}) };
        });
      if (payloadQuestions.length === 0) {
        setError(t('questionnaires.needQuestion'));
        return;
      }
      await api.createQuestionnaire(auth, { type, titre, anonyme, questions: payloadQuestions });
      setTitre('');
      setQuestions([emptyQuestion()]);
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    }
  }

  if (!open) {
    return (
      <div className="mb-6">
        <Button size="sm" onPress={() => setOpen(true)}>{t('questionnaires.create')}</Button>
      </div>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader title={t('questionnaires.create')} />
      {error ? <div className="mb-3"><Alert tone="error">{error}</Alert></div> : null}
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="qtype" className="text-sm font-medium text-slate-800">{t('questionnaires.type')}</label>
            <select id="qtype" value={type} onChange={(e) => setType(e.target.value as typeof type)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
              {QUESTIONNAIRE_TYPES.map((qt) => <option key={qt} value={qt}>{t(`questionnaires.types.${qt}`)}</option>)}
            </select>
          </div>
          <TextField label={t('questionnaires.titre')} value={titre} onChange={setTitre} isRequired />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={anonyme} onChange={(e) => setAnonyme(e.target.checked)} />
          {t('questionnaires.anonyme')}
        </label>

        <div className="flex flex-col gap-3">
          {questions.map((q, i) => (
            <div key={i} className="rounded-lg bg-slate-50 p-3">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <TextField label={t('questionnaires.questionLabel', { n: i + 1 })} value={q.libelle} onChange={(v) => patch(i, { libelle: v })} />
                </div>
                {questions.length > 1 ? (
                  <Button type="button" size="sm" variant="ghost" onPress={() => setQuestions((qs) => qs.filter((_, idx) => idx !== i))}>
                    {t('common.delete')}
                  </Button>
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <select value={q.type} onChange={(e) => patch(i, { type: e.target.value as DraftQuestion['type'] })}
                  aria-label={t('questionnaires.questionType')}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm">
                  {QUESTION_TYPES.map((qt) => <option key={qt} value={qt}>{t(`questionnaires.qtypes.${qt}`)}</option>)}
                </select>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={q.obligatoire} onChange={(e) => patch(i, { obligatoire: e.target.checked })} />
                  {t('questionnaires.required')}
                </label>
              </div>
              {(q.type === 'choix_unique' || q.type === 'choix_multiple') ? (
                <div className="mt-2">
                  <TextField label={t('questionnaires.choices')} value={q.choixText} onChange={(v) => patch(i, { choixText: v })} description={t('questionnaires.choicesHint')} />
                </div>
              ) : null}
              {q.type === 'echelle' ? (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <TextField label={t('questionnaires.min')} value={q.min} onChange={(v) => patch(i, { min: v })} inputMode="numeric" />
                  <TextField label={t('questionnaires.max')} value={q.max} onChange={(v) => patch(i, { max: v })} inputMode="numeric" />
                </div>
              ) : null}
            </div>
          ))}
          <Button type="button" size="sm" variant="secondary" className="self-start" onPress={() => setQuestions((qs) => [...qs, emptyQuestion()])}>
            {t('questionnaires.addQuestion')}
          </Button>
        </div>

        <div className="flex gap-2">
          <Button type="submit">{t('common.submit')}</Button>
          <Button type="button" variant="ghost" onPress={() => setOpen(false)}>{t('common.cancel')}</Button>
        </div>
      </form>
    </Card>
  );
}
