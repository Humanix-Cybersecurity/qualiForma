// SPDX-License-Identifier: AGPL-3.0-or-later
import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { z } from 'zod';
import type { AccessClaims } from '@humanix/domain';
import { Auth } from '../auth/auth.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PublicService } from './public.service';

const statutSchema = z.object({ statut: z.enum(['nouvelle', 'traitee', 'convertie', 'refusee']) });

/** Gestion des préinscriptions (admin OF). */
@Controller('demandes')
export class DemandesController {
  constructor(private readonly publicSvc: PublicService) {}

  @Get()
  @Auth('admin_of')
  list() {
    return this.publicSvc.listDemandes();
  }

  @Patch(':id/statut')
  @Auth('admin_of')
  setStatut(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(statutSchema)) body: { statut: 'nouvelle' | 'traitee' | 'convertie' | 'refusee' },
  ) {
    return this.publicSvc.setDemandeStatut(id, body.statut);
  }

  @Post(':id/convertir')
  @Auth('admin_of')
  convertir(@Param('id') id: string, @CurrentUser() user: AccessClaims) {
    return this.publicSvc.convertirDemande(id, user);
  }
}
