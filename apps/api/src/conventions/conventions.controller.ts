// SPDX-License-Identifier: AGPL-3.0-or-later
import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { z } from 'zod';
import type { AccessClaims } from '@humanix/domain';
import { Auth } from '../auth/auth.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ConventionsService, type CreateConventionInput } from './conventions.service';

const createSchema = z.object({
  sessionId: z.string().uuid(),
  entrepriseId: z.string().uuid().optional(),
  entreprise: z
    .object({
      raisonSociale: z.string().min(1).max(200),
      siret: z.string().max(20).optional(),
      adresse: z.string().max(300).optional(),
      contactEmail: z.string().email().optional(),
      contactNom: z.string().max(120).optional(),
    })
    .optional(),
  montantCents: z.number().int().nonnegative().optional(),
});

const statutSchema = z.object({ statut: z.enum(['brouillon', 'envoyee', 'signee', 'annulee']) });

@Controller('conventions')
export class ConventionsController {
  constructor(private readonly conventions: ConventionsService) {}

  @Post()
  @Auth('admin_of')
  create(@Body(new ZodValidationPipe(createSchema)) body: CreateConventionInput, @CurrentUser() user: AccessClaims) {
    return this.conventions.create(body, user);
  }

  @Get()
  @Auth('admin_of')
  list() {
    return this.conventions.list();
  }

  @Get('entreprises')
  @Auth('admin_of')
  entreprises() {
    return this.conventions.listEntreprises();
  }

  @Patch(':id/statut')
  @Auth('admin_of')
  setStatut(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(statutSchema)) body: { statut: 'brouillon' | 'envoyee' | 'signee' | 'annulee' },
    @CurrentUser() user: AccessClaims,
  ) {
    return this.conventions.setStatut(id, body.statut, user);
  }
}
