// SPDX-License-Identifier: AGPL-3.0-or-later
import { Body, Controller, Get, Param, Patch, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import type { AccessClaims } from '@humanix/domain';
import { Auth } from '../auth/auth.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { DevisService, type CreateDevisInput } from './devis.service';

const financeurEnum = z.enum(['entreprise', 'opco', 'particulier', 'pole_emploi', 'cpf', 'region', 'etat', 'autre_of', 'autre']);

const createSchema = z.object({
  sessionId: z.string().uuid().optional(),
  entrepriseId: z.string().uuid().optional(),
  apprenantId: z.string().uuid().optional(),
  financeur: financeurEnum.optional(),
  validiteJours: z.number().int().positive().max(365).optional(),
  notes: z.string().max(2000).optional(),
  lignes: z
    .array(z.object({
      designation: z.string().min(1).max(300),
      quantite: z.number().positive().optional(),
      prixUnitaireCents: z.number().int(),
      tvaTauxBp: z.number().int().min(0).max(10000).optional(),
    }))
    .min(1),
});

const statutSchema = z.object({ statut: z.enum(['brouillon', 'envoye', 'accepte', 'refuse', 'expire']) });

@Controller('devis')
export class DevisController {
  constructor(private readonly devis: DevisService) {}

  @Post()
  @Auth('admin_of')
  create(@Body(new ZodValidationPipe(createSchema)) body: CreateDevisInput, @CurrentUser() user: AccessClaims) {
    return this.devis.create(body, user);
  }

  @Get()
  @Auth('admin_of')
  list() {
    return this.devis.list();
  }

  @Get(':id/devis.pdf')
  @Auth('admin_of')
  async pdf(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const { buffer, filename } = await this.devis.pdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Patch(':id/statut')
  @Auth('admin_of')
  setStatut(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(statutSchema)) body: { statut: 'brouillon' | 'envoye' | 'accepte' | 'refuse' | 'expire' },
    @CurrentUser() user: AccessClaims,
  ) {
    return this.devis.setStatut(id, body.statut, user);
  }

  @Post(':id/convertir')
  @Auth('admin_of')
  convertir(@Param('id') id: string, @CurrentUser() user: AccessClaims) {
    return this.devis.convertir(id, user);
  }
}
