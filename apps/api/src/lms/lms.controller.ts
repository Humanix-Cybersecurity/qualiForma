// SPDX-License-Identifier: AGPL-3.0-or-later
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import type { AccessClaims } from '@humanix/domain';
import { Auth } from '../auth/auth.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { LmsService, type CreateLeconInput, type CreateModuleInput } from './lms.service';

const moduleSchema = z.object({
  formationId: z.string().uuid(),
  titre: z.string().min(1).max(300),
  description: z.string().max(4000).optional(),
  publie: z.boolean().optional(),
});
const moduleUpdateSchema = moduleSchema.partial();
const leconSchema = z.object({
  titre: z.string().min(1).max(300),
  type: z.enum(['texte', 'video', 'pdf']),
  contenu: z.string().max(50000).optional(),
});
const leconUpdateSchema = leconSchema.partial();
const marquerSchema = z.object({ fait: z.boolean() });

@Controller()
export class LmsController {
  constructor(private readonly lms: LmsService) {}

  // --- Apprenant ---
  @Get('me/modules')
  @Auth('apprenant')
  mesModules(@CurrentUser() user: AccessClaims) {
    return this.lms.mesModules(user);
  }

  @Post('lecons/:id/progression')
  @Auth('apprenant')
  marquer(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(marquerSchema)) body: { fait: boolean },
    @CurrentUser() user: AccessClaims,
  ) {
    return this.lms.marquerLecon(id, body.fait, user);
  }

  // --- Admin ---
  @Get('modules')
  @Auth('admin_of', 'formateur')
  list(@Query('formationId') formationId?: string) {
    return this.lms.listModules(formationId);
  }

  @Post('modules')
  @Auth('admin_of')
  createModule(@Body(new ZodValidationPipe(moduleSchema)) body: CreateModuleInput) {
    return this.lms.createModule(body);
  }

  @Patch('modules/:id')
  @Auth('admin_of')
  updateModule(@Param('id') id: string, @Body(new ZodValidationPipe(moduleUpdateSchema)) body: Partial<CreateModuleInput>) {
    return this.lms.updateModule(id, body);
  }

  @Delete('modules/:id')
  @Auth('admin_of')
  deleteModule(@Param('id') id: string) {
    return this.lms.deleteModule(id);
  }

  @Post('modules/:id/lecons')
  @Auth('admin_of')
  addLecon(@Param('id') id: string, @Body(new ZodValidationPipe(leconSchema)) body: CreateLeconInput) {
    return this.lms.addLecon(id, body);
  }

  @Patch('lecons/:id')
  @Auth('admin_of')
  updateLecon(@Param('id') id: string, @Body(new ZodValidationPipe(leconUpdateSchema)) body: Partial<CreateLeconInput>) {
    return this.lms.updateLecon(id, body);
  }

  @Delete('lecons/:id')
  @Auth('admin_of')
  deleteLecon(@Param('id') id: string) {
    return this.lms.deleteLecon(id);
  }
}
