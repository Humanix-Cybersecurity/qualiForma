// SPDX-License-Identifier: AGPL-3.0-or-later
// Logique pure (validation des réponses + agrégation de restitution). Sans I/O → testable.

export type QuestionType =
  | 'texte_libre'
  | 'choix_unique'
  | 'choix_multiple'
  | 'echelle'
  | 'booleen';

export interface QuestionDef {
  id: string;
  type: QuestionType;
  libelle: string;
  obligatoire: boolean;
  /** choix_unique/multiple : { choix: string[] } ; echelle : { min, max }. */
  options: unknown;
}

export class ReponseInvalideError extends Error {}

interface ChoixOptions {
  choix: string[];
}
interface EchelleOptions {
  min: number;
  max: number;
}

function asChoix(options: unknown): ChoixOptions {
  const o = options as Partial<ChoixOptions>;
  if (!o || !Array.isArray(o.choix)) {
    throw new ReponseInvalideError('Options de choix manquantes.');
  }
  return { choix: o.choix };
}

function asEchelle(options: unknown): EchelleOptions {
  const o = options as Partial<EchelleOptions>;
  if (!o || typeof o.min !== 'number' || typeof o.max !== 'number') {
    throw new ReponseInvalideError('Bornes d\'échelle manquantes.');
  }
  return { min: o.min, max: o.max };
}

/**
 * Valide et normalise une réponse selon le type de question. Renvoie la valeur à stocker
 * (chaîne ; choix_multiple → JSON d'un tableau). Lève `ReponseInvalideError` si invalide.
 */
export function validateReponse(question: QuestionDef, valeur: string | undefined): string {
  if (valeur === undefined || valeur === '') {
    if (question.obligatoire) {
      throw new ReponseInvalideError(`Réponse obligatoire : « ${question.libelle} ».`);
    }
    return '';
  }

  switch (question.type) {
    case 'texte_libre':
      return valeur;

    case 'booleen':
      if (valeur !== 'true' && valeur !== 'false') {
        throw new ReponseInvalideError('Réponse booléenne attendue (true/false).');
      }
      return valeur;

    case 'echelle': {
      const { min, max } = asEchelle(question.options);
      const n = Number(valeur);
      if (!Number.isFinite(n) || n < min || n > max) {
        throw new ReponseInvalideError(`Valeur hors de l'échelle [${min}, ${max}].`);
      }
      return String(n);
    }

    case 'choix_unique': {
      const { choix } = asChoix(question.options);
      if (!choix.includes(valeur)) {
        throw new ReponseInvalideError(`Choix invalide : « ${valeur} ».`);
      }
      return valeur;
    }

    case 'choix_multiple': {
      const { choix } = asChoix(question.options);
      let parsed: unknown;
      try {
        parsed = JSON.parse(valeur);
      } catch {
        throw new ReponseInvalideError('Choix multiples attendus sous forme de tableau JSON.');
      }
      if (!Array.isArray(parsed) || parsed.some((v) => !choix.includes(String(v)))) {
        throw new ReponseInvalideError('Un ou plusieurs choix sont invalides.');
      }
      return JSON.stringify(parsed.map(String));
    }

    default:
      throw new ReponseInvalideError('Type de question inconnu.');
  }
}

export interface ReponseRow {
  questionId: string;
  valeur: string;
}

export interface QuestionRestitution {
  questionId: string;
  type: QuestionType;
  libelle: string;
  nbReponses: number;
  /** echelle : moyenne ; booleen : taux de « true » (0-1). */
  moyenne?: number;
  tauxVrai?: number;
  /** choix/booleen : distribution { valeur → compte }. */
  distribution?: Record<string, number>;
  /** texte_libre : verbatims. */
  verbatims?: string[];
}

export interface Restitution {
  nbSoumissions: number;
  nbAttendus: number;
  tauxCompletude: number; // 0-1
  questions: QuestionRestitution[];
}

/** Agrège les réponses en restitution (jamais de donnée individuelle exposée). */
export function aggregateRestitution(
  questions: QuestionDef[],
  reponses: ReponseRow[],
  nbSoumissions: number,
  nbAttendus: number,
): Restitution {
  const parQuestion = new Map<string, string[]>();
  for (const r of reponses) {
    if (!parQuestion.has(r.questionId)) parQuestion.set(r.questionId, []);
    if (r.valeur !== '') parQuestion.get(r.questionId)!.push(r.valeur);
  }

  const questionsAgg = questions.map<QuestionRestitution>((q) => {
    const vals = parQuestion.get(q.id) ?? [];
    const base: QuestionRestitution = {
      questionId: q.id,
      type: q.type,
      libelle: q.libelle,
      nbReponses: vals.length,
    };

    if (q.type === 'echelle') {
      const nums = vals.map(Number).filter(Number.isFinite);
      base.moyenne = nums.length ? round2(nums.reduce((a, b) => a + b, 0) / nums.length) : 0;
    } else if (q.type === 'booleen') {
      const vrai = vals.filter((v) => v === 'true').length;
      base.tauxVrai = vals.length ? round2(vrai / vals.length) : 0;
      base.distribution = { true: vrai, false: vals.length - vrai };
    } else if (q.type === 'choix_unique') {
      base.distribution = countBy(vals);
    } else if (q.type === 'choix_multiple') {
      const flat = vals.flatMap((v) => {
        try {
          return JSON.parse(v) as string[];
        } catch {
          return [];
        }
      });
      base.distribution = countBy(flat);
    } else {
      base.verbatims = vals;
    }
    return base;
  });

  return {
    nbSoumissions,
    nbAttendus,
    tauxCompletude: nbAttendus > 0 ? round2(nbSoumissions / nbAttendus) : 0,
    questions: questionsAgg,
  };
}

function countBy(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((acc, v) => {
    acc[v] = (acc[v] ?? 0) + 1;
    return acc;
  }, {});
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
