// SPDX-License-Identifier: AGPL-3.0-or-later
import { Body, Controller, Get, Param, ParseIntPipe, Put } from '@nestjs/common';
import { z } from 'zod';
import type { AccessClaims } from '@humanix/domain';
import { Auth } from '../auth/auth.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { QualiopiService } from './qualiopi.service';

const statutSchema = z.object({
  statut: z.enum(['conforme', 'a_completer', 'non_applicable']).optional(),
  notes: z.string().max(4000).nullable().optional(),
  documentId: z.string().uuid().nullable().optional(),
});

@Controller('qualiopi')
export class QualiopiController {
  constructor(private readonly qualiopi: QualiopiService) {}

  @Get('indicateurs')
  @Auth('admin_of', 'formateur')
  dashboard() {
    return this.qualiopi.dashboard();
  }

  @Put('indicateurs/:numero')
  @Auth('admin_of')
  setStatut(
    @Param('numero', ParseIntPipe) numero: number,
    @Body(new ZodValidationPipe(statutSchema)) body: z.infer<typeof statutSchema>,
    @CurrentUser() user: AccessClaims,
  ) {
    return this.qualiopi.setStatut(numero, body, user);
  }
}
