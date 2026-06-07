// SPDX-License-Identifier: AGPL-3.0-or-later
import { Body, Controller, Get, HttpCode, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import type { AccessClaims } from '@humanix/domain';
import { Auth } from '../auth/auth.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { EmargementService, type SignInput } from './emargement.service';

const signSchema = z.object({
  methode: z.enum(['code', 'qr', 'manuscrite']),
  code: z.string().regex(/^\d{6}$/).optional(),
  geoloc: z
    .object({ lat: z.number(), lng: z.number(), accuracy: z.number().optional() })
    .optional(),
  timestampClient: z.string().datetime().optional(),
});

@Controller()
export class EmargementController {
  constructor(private readonly emargement: EmargementService) {}

  /** Le formateur ouvre la fenêtre de signature ; renvoie le code à projeter en salle. */
  @Post('creneaux/:id/signature/ouvrir')
  @Auth('formateur', 'admin_of')
  ouvrir(@Param('id') id: string, @CurrentUser() user: AccessClaims) {
    return this.emargement.ouvrirSignature(id, user);
  }

  @Post('creneaux/:id/signature/fermer')
  @Auth('formateur', 'admin_of')
  @HttpCode(204)
  async fermer(@Param('id') id: string, @CurrentUser() user: AccessClaims) {
    await this.emargement.fermerSignature(id, user);
  }

  /** L'apprenant ou le formateur signe le créneau (code / QR / manuscrite). */
  @Post('creneaux/:id/signer')
  @Auth('formateur', 'apprenant')
  signer(
    @Param('id') id: string,
    @CurrentUser() user: AccessClaims,
    @Body(new ZodValidationPipe(signSchema)) body: SignInput,
    @Req() req: Request,
  ) {
    return this.emargement.signer(id, user, body, reqMeta(req));
  }

  /** Contrôle formateur : état des signatures du créneau + complétude. */
  @Get('creneaux/:id/emargement')
  @Auth('formateur', 'admin_of')
  etat(@Param('id') id: string, @CurrentUser() user: AccessClaims) {
    return this.emargement.etatCreneau(id, user);
  }

  /** Vérification d'authenticité (lien/QR du PDF). Tenant-scoped, sans authentification. */
  @Get('verification/:token')
  verifier(@Param('token') token: string) {
    return this.emargement.verifier(token);
  }
}

function reqMeta(req: Request): { ip?: string; userAgent?: string } {
  const meta: { ip?: string; userAgent?: string } = {};
  if (req.ip) meta.ip = req.ip;
  const ua = req.headers['user-agent'];
  if (typeof ua === 'string') meta.userAgent = ua;
  return meta;
}
