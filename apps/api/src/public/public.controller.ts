// SPDX-License-Identifier: AGPL-3.0-or-later
import { Body, Controller, Get, Post } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PublicService, type DemandeInput } from './public.service';

const demandeSchema = z.object({
  sessionId: z.string().uuid().optional(),
  formationId: z.string().uuid().optional(),
  nom: z.string().min(1).max(120),
  prenom: z.string().max(120).optional(),
  email: z.string().email(),
  telephone: z.string().max(30).optional(),
  message: z.string().max(2000).optional(),
});

/**
 * Endpoints PUBLICS (sans authentification). Le tenant est résolu par le TenantMiddleware
 * (en-tête `x-tenant-slug` ou sous-domaine), donc toutes les requêtes restent sous RLS.
 */
@Controller('public')
export class PublicController {
  constructor(private readonly publicSvc: PublicService) {}

  @Get('catalogue')
  catalogue() {
    return this.publicSvc.catalogue();
  }

  @Post('demandes')
  demande(@Body(new ZodValidationPipe(demandeSchema)) body: DemandeInput) {
    return this.publicSvc.createDemande(body);
  }
}
