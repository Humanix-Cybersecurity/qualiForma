// SPDX-License-Identifier: AGPL-3.0-or-later
import { Body, Controller, Get, HttpCode, Param, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { z } from 'zod';
import type { AccessClaims } from '@humanix/domain';
import { Auth } from '../auth/auth.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { EmargementService, type SignInput } from './emargement.service';
import { ScellementService } from './scellement.service';
import { ProofPackService } from './proof-pack.service';

const signSchema = z.object({
  methode: z.enum(['code', 'qr', 'manuscrite', 'lien']),
  code: z.string().regex(/^\d{6}$/).optional(),
  jeton: z.string().min(1).optional(),
  geoloc: z
    .object({ lat: z.number(), lng: z.number(), accuracy: z.number().optional() })
    .optional(),
  consentementGeoloc: z.boolean().optional(),
  timestampClient: z.string().datetime().optional(),
});

const jetonSchema = z.object({ pourUserId: z.string().uuid().optional() });

@Controller()
export class EmargementController {
  constructor(
    private readonly emargement: EmargementService,
    private readonly scellement: ScellementService,
    private readonly proofPack: ProofPackService,
  ) {}

  /**
   * Scelle la feuille d'émargement CONSOLIDÉE du créneau avec UN horodatage qualifié (eIDAS).
   * À appeler quand la séquence est complète. Réservé formateur/admin.
   */
  @Post('creneaux/:id/sceller')
  @Auth('formateur', 'admin_of')
  sceller(@Param('id') id: string, @CurrentUser() user: AccessClaims) {
    return this.scellement.sceller(id, user);
  }

  /** Pack de preuve auto-portant (JSON) du créneau scellé. */
  @Get('creneaux/:id/pack-preuve')
  @Auth('formateur', 'admin_of')
  packPreuve(@Param('id') id: string, @CurrentUser() user: AccessClaims) {
    return this.proofPack.build(id, user);
  }

  /** Pack de preuve exportable (ZIP : preuve.json + PDF + jeton + lisez-moi). */
  @Get('creneaux/:id/pack-preuve.zip')
  @Auth('formateur', 'admin_of')
  async packPreuveZip(@Param('id') id: string, @CurrentUser() user: AccessClaims, @Res() res: Response) {
    const { buffer, filename } = await this.proofPack.buildZip(id, user);
    res
      .set({
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
      })
      .send(buffer);
  }

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

  /**
   * Génère un jeton de signature anti-fraude (QR dynamique). À appeler en rotation côté écran
   * formateur (TTL court). `pourUserId` → jeton personnel à usage unique (lien e-mail).
   */
  @Post('creneaux/:id/jetons')
  @Auth('formateur', 'admin_of')
  jeton(
    @Param('id') id: string,
    @CurrentUser() user: AccessClaims,
    @Body(new ZodValidationPipe(jetonSchema)) body: { pourUserId?: string },
  ) {
    return this.emargement.genererJeton(id, user, body.pourUserId);
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

  /** Créneaux de l'utilisateur courant (liste pour les écrans apprenant/formateur). */
  @Get('me/creneaux')
  @Auth('apprenant', 'formateur')
  mesCreneaux(@CurrentUser() user: AccessClaims) {
    return this.emargement.mesCreneaux(user);
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
