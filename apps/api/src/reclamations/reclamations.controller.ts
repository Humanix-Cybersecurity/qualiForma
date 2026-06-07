// SPDX-License-Identifier: AGPL-3.0-or-later
import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { z } from 'zod';
import type { AccessClaims } from '@humanix/domain';
import { Auth } from '../auth/auth.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ReclamationsService, type CreateReclamationInput } from './reclamations.service';

const createSchema = z.object({
  objet: z.string().min(1).max(300),
  description: z.string().min(1).max(4000),
  sessionId: z.string().uuid().optional(),
});
const statutSchema = z.object({ statut: z.enum(['ouverte', 'en_traitement', 'resolue', 'cloturee']) });
const actionSchema = z.object({ description: z.string().min(1).max(2000), dueDate: z.string().optional() });

@Controller('reclamations')
export class ReclamationsController {
  constructor(private readonly reclamations: ReclamationsService) {}

  /** Dépôt d'une réclamation par tout utilisateur authentifié. */
  @Post()
  @Auth()
  create(@CurrentUser() user: AccessClaims, @Body(new ZodValidationPipe(createSchema)) body: CreateReclamationInput) {
    return this.reclamations.create(user, body);
  }

  @Get()
  @Auth('admin_of')
  list() {
    return this.reclamations.list();
  }

  @Patch(':id/statut')
  @Auth('admin_of')
  setStatut(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(statutSchema)) body: { statut: 'ouverte' | 'en_traitement' | 'resolue' | 'cloturee' },
  ) {
    return this.reclamations.setStatut(id, body.statut);
  }

  @Post(':id/actions')
  @Auth('admin_of')
  addAction(
    @Param('id') id: string,
    @CurrentUser() user: AccessClaims,
    @Body(new ZodValidationPipe(actionSchema)) body: { description: string; dueDate?: string },
  ) {
    return this.reclamations.addAction(user, id, body.description, body.dueDate);
  }
}
