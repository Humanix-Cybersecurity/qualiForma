// SPDX-License-Identifier: AGPL-3.0-or-later
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { z } from 'zod';
import type { AccessClaims } from '@humanix/domain';
import { Auth } from '../auth/auth.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  CatalogService,
  type CreateFormationInput,
  type CreateSessionInput,
  type CreneauInput,
} from './catalog.service';

const formationSchema = z.object({
  intitule: z.string().min(1).max(300),
  objectifs: z.string().max(4000).optional(),
  prerequis: z.string().max(4000).optional(),
  dureeHeures: z.number().positive(),
  tarifCents: z.number().int().nonnegative().optional(),
  modalitesAccesHandicap: z.string().max(4000).optional(),
  indicateursQualiopi: z.array(z.string()).optional(),
});

const sessionSchema = z.object({
  formationId: z.string().uuid(),
  intitule: z.string().max(300).optional(),
  dateDebut: z.string(),
  dateFin: z.string(),
  lieu: z.string().max(300).optional(),
  formateurId: z.string().uuid().optional(),
});

const creneauxSchema = z.object({
  creneaux: z
    .array(
      z.object({
        date: z.string(),
        periode: z.enum(['matin', 'apres_midi']),
        heureDebut: z.string().regex(/^\d{2}:\d{2}$/),
        heureFin: z.string().regex(/^\d{2}:\d{2}$/),
        lieu: z.string().optional(),
      }),
    )
    .min(1),
});

const enrollSchema = z.object({ apprenantEmail: z.string().email() });

const clotureSchema = z.object({ force: z.boolean().optional() });

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('formations')
  @Auth('admin_of', 'formateur')
  formations() {
    return this.catalog.listFormations();
  }

  @Post('formations')
  @Auth('admin_of')
  createFormation(@Body(new ZodValidationPipe(formationSchema)) body: CreateFormationInput) {
    return this.catalog.createFormation(body);
  }

  @Patch('formations/:id')
  @Auth('admin_of')
  updateFormation(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(formationSchema.partial())) body: Partial<CreateFormationInput>,
  ) {
    return this.catalog.updateFormation(id, body);
  }

  @Get('sessions')
  @Auth('admin_of', 'formateur')
  sessions() {
    return this.catalog.listSessions();
  }

  @Post('sessions')
  @Auth('admin_of')
  createSession(@Body(new ZodValidationPipe(sessionSchema)) body: CreateSessionInput) {
    return this.catalog.createSession(body);
  }

  @Post('sessions/:id/creneaux')
  @Auth('admin_of')
  addCreneaux(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(creneauxSchema)) body: { creneaux: CreneauInput[] },
  ) {
    return this.catalog.addCreneaux(id, body.creneaux);
  }

  @Post('sessions/:id/inscriptions')
  @Auth('admin_of')
  enroll(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(enrollSchema)) body: { apprenantEmail: string },
  ) {
    return this.catalog.enroll(id, body.apprenantEmail);
  }

  @Get('sessions/:id/creneaux')
  @Auth('admin_of', 'formateur')
  listCreneaux(@Param('id') id: string) {
    return this.catalog.listCreneaux(id);
  }

  @Delete('creneaux/:id')
  @Auth('admin_of')
  deleteCreneau(@Param('id') id: string) {
    return this.catalog.deleteCreneau(id);
  }

  @Get('sessions/:id/inscriptions')
  @Auth('admin_of', 'formateur')
  listInscrits(@Param('id') id: string) {
    return this.catalog.listInscrits(id);
  }

  @Patch('inscriptions/:id/annuler')
  @Auth('admin_of')
  annulerInscription(@Param('id') id: string) {
    return this.catalog.annulerInscription(id);
  }

  @Get('sessions/:id/completude')
  @Auth('admin_of', 'formateur')
  completude(@Param('id') id: string) {
    return this.catalog.sessionCompletude(id);
  }

  @Post('sessions/:id/cloture')
  @Auth('admin_of')
  cloturer(
    @Param('id') id: string,
    @CurrentUser() user: AccessClaims,
    @Body(new ZodValidationPipe(clotureSchema)) body: { force?: boolean },
  ) {
    return this.catalog.cloturerSession(id, user, body.force ?? false);
  }

  @Get('me/inscriptions')
  @Auth('apprenant')
  myInscriptions(@CurrentUser() user: AccessClaims) {
    return this.catalog.myInscriptions(user);
  }
}
