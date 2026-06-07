// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  aggregateRestitution,
  ReponseInvalideError,
  validateReponse,
  type QuestionDef,
} from './questionnaire-logic';

const q = (over: Partial<QuestionDef>): QuestionDef => ({
  id: 'q1',
  type: 'texte_libre',
  libelle: 'Q',
  obligatoire: true,
  options: undefined,
  ...over,
});

describe('validateReponse', () => {
  it('refuse une réponse obligatoire vide', () => {
    expect(() => validateReponse(q({}), undefined)).toThrow(ReponseInvalideError);
  });

  it('accepte le vide si non obligatoire', () => {
    expect(validateReponse(q({ obligatoire: false }), undefined)).toBe('');
  });

  it('valide une échelle dans les bornes et rejette hors bornes', () => {
    const e = q({ type: 'echelle', options: { min: 1, max: 5 } });
    expect(validateReponse(e, '4')).toBe('4');
    expect(() => validateReponse(e, '6')).toThrow(ReponseInvalideError);
  });

  it('valide un choix unique et rejette un choix inconnu', () => {
    const c = q({ type: 'choix_unique', options: { choix: ['a', 'b'] } });
    expect(validateReponse(c, 'a')).toBe('a');
    expect(() => validateReponse(c, 'z')).toThrow(ReponseInvalideError);
  });

  it('valide un choix multiple (tableau JSON) et rejette un membre invalide', () => {
    const c = q({ type: 'choix_multiple', options: { choix: ['x', 'y', 'z'] } });
    expect(validateReponse(c, '["x","z"]')).toBe('["x","z"]');
    expect(() => validateReponse(c, '["x","w"]')).toThrow(ReponseInvalideError);
  });

  it('valide un booléen', () => {
    const b = q({ type: 'booleen' });
    expect(validateReponse(b, 'true')).toBe('true');
    expect(() => validateReponse(b, 'oui')).toThrow(ReponseInvalideError);
  });
});

describe('aggregateRestitution', () => {
  const questions: QuestionDef[] = [
    q({ id: 'note', type: 'echelle', libelle: 'Note', options: { min: 1, max: 5 } }),
    q({ id: 'reco', type: 'booleen', libelle: 'Recommande ?' }),
    q({ id: 'pref', type: 'choix_unique', libelle: 'Préf', options: { choix: ['a', 'b'] } }),
  ];

  it('calcule moyenne, taux et distribution + complétude', () => {
    const reponses = [
      { questionId: 'note', valeur: '4' },
      { questionId: 'note', valeur: '2' },
      { questionId: 'reco', valeur: 'true' },
      { questionId: 'reco', valeur: 'false' },
      { questionId: 'pref', valeur: 'a' },
      { questionId: 'pref', valeur: 'a' },
    ];
    const r = aggregateRestitution(questions, reponses, 2, 4);
    expect(r.tauxCompletude).toBe(0.5);
    expect(r.questions.find((x) => x.questionId === 'note')!.moyenne).toBe(3);
    expect(r.questions.find((x) => x.questionId === 'reco')!.tauxVrai).toBe(0.5);
    expect(r.questions.find((x) => x.questionId === 'pref')!.distribution).toEqual({ a: 2 });
  });
});
