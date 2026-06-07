// SPDX-License-Identifier: AGPL-3.0-or-later
import { Body, Controller, Get, Param, Patch, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import type { AccessClaims } from '@humanix/domain';
import { Auth } from '../auth/auth.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { FacturationService, type CreateFactureInput } from './facturation.service';

const financeurEnum = z.enum(['entreprise', 'opco', 'particulier', 'pole_emploi', 'cpf', 'region', 'etat', 'autre_of', 'autre']);

const createSchema = z.object({
  sessionId: z.string().uuid().optional(),
  entrepriseId: z.string().uuid().optional(),
  apprenantId: z.string().uuid().optional(),
  financeur: financeurEnum.optional(),
  dateEcheance: z.string().optional(),
  notes: z.string().max(2000).optional(),
  lignes: z
    .array(
      z.object({
        designation: z.string().min(1).max(300),
        quantite: z.number().positive().optional(),
        prixUnitaireCents: z.number().int(),
        tvaTauxBp: z.number().int().min(0).max(10000).optional(),
      }),
    )
    .min(1),
});

const paiementSchema = z.object({
  montantCents: z.number().int().positive(),
  moyen: z.enum(['virement', 'cheque', 'carte', 'especes', 'prelevement', 'autre']).optional(),
  reference: z.string().max(120).optional(),
  datePaiement: z.string().optional(),
});

@Controller('factures')
export class FacturationController {
  constructor(private readonly facturation: FacturationService) {}

  @Post()
  @Auth('admin_of')
  create(@Body(new ZodValidationPipe(createSchema)) body: CreateFactureInput, @CurrentUser() user: AccessClaims) {
    return this.facturation.create(body, user);
  }

  @Get()
  @Auth('admin_of')
  list() {
    return this.facturation.list();
  }

  @Get('financeurs')
  @Auth('admin_of')
  financeurs() {
    return this.facturation.financeurs();
  }

  @Get('bpf')
  @Auth('admin_of')
  bpf(@Query('annee') annee?: string) {
    const y = Number(annee) || new Date().getUTCFullYear();
    return this.facturation.bpf(y);
  }

  @Get('export-comptable')
  @Auth('admin_of')
  async exportComptable(@Query('annee') annee: string | undefined, @Res() res: Response): Promise<void> {
    const y = Number(annee) || new Date().getUTCFullYear();
    const { buffer, filename } = await this.facturation.exportComptable(y);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get(':id/facture.pdf')
  @Auth('admin_of')
  async pdf(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const { buffer, filename } = await this.facturation.pdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Post(':id/paiements')
  @Auth('admin_of')
  addPaiement(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(paiementSchema)) body: z.infer<typeof paiementSchema>,
    @CurrentUser() user: AccessClaims,
  ) {
    return this.facturation.addPaiement(id, body, user);
  }

  @Patch(':id/annuler')
  @Auth('admin_of')
  annuler(@Param('id') id: string, @CurrentUser() user: AccessClaims) {
    return this.facturation.annuler(id, user);
  }
}
