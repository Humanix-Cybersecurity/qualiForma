// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AccessClaims } from '@humanix/domain';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';
import { requireTenantContext } from '../tenant/tenant-context';
import {
  aggregateRestitution,
  ReponseInvalideError,
  validateReponse,
  type QuestionDef,
  type QuestionType,
} from './questionnaire-logic';

export interface CreateQuestionnaireInput {
  type:
    | 'positionnement_amont'
    | 'evaluation_acquis'
    | 'satisfaction_chaud'
    | 'satisfaction_froid'
    | 'recueil_besoin';
  titre: string;
  formationId?: string;
  sessionId?: string;
  anonyme?: boolean;
  questions: {
    libelle: string;
    type: QuestionType;
    options?: unknown;
    obligatoire?: boolean;
  }[];
}

@Injectable()
export class QuestionnairesService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  /** Création/diffusion d'un questionnaire (admin OF). */
  async create(input: CreateQuestionnaireInput) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const { tenantId } = requireTenantContext();
      return tx.questionnaire.create({
        data: {
          tenantId,
          type: input.type,
          titre: input.titre,
          formationId: input.formationId ?? null,
          sessionId: input.sessionId ?? null,
          anonyme: input.anonyme ?? false,
          questions: {
            create: input.questions.map((q, i) => ({
              tenantId,
              libelle: q.libelle,
              type: q.type,
              options: (q.options ?? undefined) as object | undefined,
              obligatoire: q.obligatoire ?? true,
              ordre: i,
            })),
          },
        },
        include: { questions: { orderBy: { ordre: 'asc' } } },
      });
    });
  }

  async listAdmin(filter: { sessionId?: string; formationId?: string }) {
    return this.tenantPrisma.withTenant((tx) =>
      tx.questionnaire.findMany({
        where: {
          ...(filter.sessionId ? { sessionId: filter.sessionId } : {}),
          ...(filter.formationId ? { formationId: filter.formationId } : {}),
        },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }

  async getDetail(id: string) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const q = await tx.questionnaire.findFirst({
        where: { id },
        include: { questions: { orderBy: { ordre: 'asc' } } },
      });
      if (!q) throw new NotFoundException('Questionnaire introuvable.');
      return q;
    });
  }

  /** Questionnaires actifs des sessions où l'apprenant est inscrit, avec statut de soumission. */
  async listPourApprenant(user: AccessClaims) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const inscriptions = await tx.inscription.findMany({
        where: { apprenantId: user.sub, statut: { not: 'annulee' } },
        select: { id: true, sessionId: true },
      });
      const sessionIds = inscriptions.map((i) => i.sessionId);
      const inscriptionIds = inscriptions.map((i) => i.id);
      if (sessionIds.length === 0) return [];

      const questionnaires = await tx.questionnaire.findMany({
        where: { actif: true, sessionId: { in: sessionIds } },
        include: { questions: { orderBy: { ordre: 'asc' } } },
      });
      const soumissions = await tx.questionnaireSoumission.findMany({
        where: { inscriptionId: { in: inscriptionIds } },
        select: { questionnaireId: true },
      });
      const soumis = new Set(soumissions.map((s) => s.questionnaireId));

      return questionnaires.map((q) => ({ ...q, dejaSoumis: soumis.has(q.id) }));
    });
  }

  /** Soumission des réponses par l'apprenant (validées, dédupliquées). */
  async soumettre(
    questionnaireId: string,
    user: AccessClaims,
    reponses: { questionId: string; valeur?: string }[],
  ) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const q = await tx.questionnaire.findFirst({
        where: { id: questionnaireId, actif: true },
        include: { questions: true },
      });
      if (!q) throw new NotFoundException('Questionnaire introuvable ou inactif.');
      if (!q.sessionId) {
        throw new BadRequestException('Questionnaire non rattaché à une session.');
      }

      const inscription = await tx.inscription.findFirst({
        where: { sessionId: q.sessionId, apprenantId: user.sub, statut: { not: 'annulee' } },
      });
      if (!inscription) throw new ForbiddenException('Vous n\'êtes pas inscrit·e à cette session.');

      const existante = await tx.questionnaireSoumission.findFirst({
        where: { questionnaireId, inscriptionId: inscription.id },
      });
      if (existante) throw new ConflictException('Questionnaire déjà soumis.');

      // Validation par question (types, bornes, obligatoires).
      const parQuestion = new Map(reponses.map((r) => [r.questionId, r.valeur]));
      let valides: { questionId: string; valeur: string }[];
      try {
        valides = q.questions.map((question) => ({
          questionId: question.id,
          valeur: validateReponse(toDef(question), parQuestion.get(question.id)),
        }));
      } catch (e) {
        if (e instanceof ReponseInvalideError) throw new BadRequestException(e.message);
        throw e;
      }

      const soumission = await tx.questionnaireSoumission.create({
        data: { tenantId: user.tid, questionnaireId, inscriptionId: inscription.id },
      });
      await tx.reponse.createMany({
        data: valides.map((r) => ({
          tenantId: user.tid,
          soumissionId: soumission.id,
          questionId: r.questionId,
          valeur: r.valeur,
        })),
      });
      return { soumissionId: soumission.id };
    });
  }

  /** Restitution agrégée (admin OF) + taux de complétude. Met en cache dans Restitution. */
  async restitution(questionnaireId: string) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const q = await tx.questionnaire.findFirst({
        where: { id: questionnaireId },
        include: { questions: { orderBy: { ordre: 'asc' } } },
      });
      if (!q) throw new NotFoundException('Questionnaire introuvable.');

      const soumissions = await tx.questionnaireSoumission.findMany({
        where: { questionnaireId },
        select: { id: true },
      });
      const reponses = await tx.reponse.findMany({
        where: { soumissionId: { in: soumissions.map((s) => s.id) } },
        select: { questionId: true, valeur: true },
      });

      const nbAttendus = q.sessionId
        ? await tx.inscription.count({
            where: { sessionId: q.sessionId, statut: { not: 'annulee' } },
          })
        : soumissions.length;

      const restitution = aggregateRestitution(
        q.questions.map(toDef),
        reponses,
        soumissions.length,
        nbAttendus,
      );

      await tx.restitution.upsert({
        where: { questionnaireId },
        create: { tenantId: q.tenantId, questionnaireId, resume: restitution as object },
        update: { resume: restitution as object, generatedAt: new Date() },
      });

      return { questionnaire: { id: q.id, titre: q.titre, type: q.type }, ...restitution };
    });
  }

  /** Export CSV de la restitution (satisfaction/évaluation), pour l'audit Qualiopi. */
  async restitutionCsv(questionnaireId: string): Promise<{ buffer: Buffer; filename: string }> {
    const r = await this.restitution(questionnaireId);
    const cell = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const lignes = [
      `Questionnaire;${cell(r.questionnaire.titre)} (${r.questionnaire.type})`,
      `Soumissions;${r.nbSoumissions}/${r.nbAttendus} (${Math.round(r.tauxCompletude * 100)}%)`,
      '',
      'Question;Réponses;Moyenne;Taux oui;Distribution',
      ...r.questions.map((q) =>
        [
          cell(q.libelle),
          q.nbReponses,
          q.moyenne ?? '',
          q.tauxVrai !== undefined ? Math.round(q.tauxVrai * 100) + '%' : '',
          q.distribution ? cell(Object.entries(q.distribution).map(([k, v]) => `${k}:${v}`).join(' ')) : '',
        ].join(';'),
      ),
    ];
    // BOM UTF-8 pour Excel.
    return { buffer: Buffer.from('﻿' + lignes.join('\r\n'), 'utf8'), filename: `restitution-${questionnaireId}.csv` };
  }
}

function toDef(question: {
  id: string;
  type: string;
  libelle: string;
  obligatoire: boolean;
  options: unknown;
}): QuestionDef {
  return {
    id: question.id,
    type: question.type as QuestionType,
    libelle: question.libelle,
    obligatoire: question.obligatoire,
    options: question.options,
  };
}
