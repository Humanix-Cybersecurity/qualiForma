// SPDX-License-Identifier: AGPL-3.0-or-later
import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import type { AccessClaims } from '@humanix/domain';
import { Auth } from '../auth/auth.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { QuestionnairesService, type CreateQuestionnaireInput } from './questionnaires.service';

const questionTypeSchema = z.enum([
  'texte_libre',
  'choix_unique',
  'choix_multiple',
  'echelle',
  'booleen',
]);

const createSchema = z.object({
  type: z.enum([
    'positionnement_amont',
    'evaluation_acquis',
    'satisfaction_chaud',
    'satisfaction_froid',
    'recueil_besoin',
  ]),
  titre: z.string().min(1).max(300),
  formationId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  anonyme: z.boolean().optional(),
  questions: z
    .array(
      z.object({
        libelle: z.string().min(1),
        type: questionTypeSchema,
        options: z.unknown().optional(),
        obligatoire: z.boolean().optional(),
      }),
    )
    .min(1),
});

const soumettreSchema = z.object({
  reponses: z
    .array(z.object({ questionId: z.string().uuid(), valeur: z.string().optional() }))
    .min(1),
});

@Controller('questionnaires')
export class QuestionnairesController {
  constructor(private readonly service: QuestionnairesService) {}

  @Post()
  @Auth('admin_of')
  create(@Body(new ZodValidationPipe(createSchema)) body: CreateQuestionnaireInput) {
    return this.service.create(body);
  }

  @Get()
  @Auth('admin_of')
  list(@Query('sessionId') sessionId?: string, @Query('formationId') formationId?: string) {
    return this.service.listAdmin({
      ...(sessionId ? { sessionId } : {}),
      ...(formationId ? { formationId } : {}),
    });
  }

  /** Questionnaires à remplir par l'apprenant courant. */
  @Get('mine')
  @Auth('apprenant')
  mine(@CurrentUser() user: AccessClaims) {
    return this.service.listPourApprenant(user);
  }

  @Get(':id')
  @Auth('admin_of', 'formateur')
  detail(@Param('id') id: string) {
    return this.service.getDetail(id);
  }

  @Get(':id/restitution')
  @Auth('admin_of')
  restitution(@Param('id') id: string) {
    return this.service.restitution(id);
  }

  @Get(':id/restitution.csv')
  @Auth('admin_of')
  async restitutionCsv(@Param('id') id: string, @Res() res: Response) {
    const { buffer, filename } = await this.service.restitutionCsv(id);
    res
      .set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      })
      .send(buffer);
  }

  @Post(':id/soumettre')
  @Auth('apprenant')
  soumettre(
    @Param('id') id: string,
    @CurrentUser() user: AccessClaims,
    @Body(new ZodValidationPipe(soumettreSchema)) body: { reponses: { questionId: string; valeur?: string }[] },
  ) {
    return this.service.soumettre(id, user, body.reponses);
  }
}
