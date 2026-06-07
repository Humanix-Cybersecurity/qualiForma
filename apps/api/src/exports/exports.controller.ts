// SPDX-License-Identifier: AGPL-3.0-or-later
import { BadRequestException, Controller, Get, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { AccessClaims } from '@humanix/domain';
import { Auth } from '../auth/auth.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { ExportsService, type ExportFile } from './exports.service';

@Controller()
export class ExportsController {
  constructor(private readonly exports: ExportsService) {}

  @Get('sessions/:id/feuille-emargement.pdf')
  @Auth('admin_of', 'formateur')
  async feuille(@Param('id') id: string, @Res() res: Response) {
    send(res, await this.exports.feuilleEmargement(id));
  }

  @Get('inscriptions/:id/certificat.pdf')
  @Auth('admin_of')
  async certificat(@Param('id') id: string, @Res() res: Response) {
    send(res, await this.exports.certificat(id));
  }

  @Get('formations/:id/programme.pdf')
  @Auth('admin_of', 'formateur')
  async programme(@Param('id') id: string, @Res() res: Response) {
    send(res, await this.exports.programme(id));
  }

  @Get('reglement-interieur.pdf')
  @Auth('admin_of', 'formateur')
  async reglement(@Res() res: Response) {
    send(res, await this.exports.reglementInterieur());
  }

  @Get('inscriptions/:id/convocation.pdf')
  @Auth('admin_of', 'formateur')
  async convocation(@Param('id') id: string, @Res() res: Response) {
    send(res, await this.exports.convocation(id));
  }

  @Get('conventions/:id/convention.pdf')
  @Auth('admin_of')
  async convention(@Param('id') id: string, @Res() res: Response) {
    send(res, await this.exports.convention(id));
  }

  /** Attestation de l'apprenant courant (contrôle de propriété). */
  @Get('me/certificat/:inscriptionId')
  @Auth('apprenant')
  async myCertificat(
    @Param('inscriptionId') inscriptionId: string,
    @CurrentUser() user: AccessClaims,
    @Res() res: Response,
  ) {
    send(res, await this.exports.certificat(inscriptionId, user.sub));
  }

  /** Décompte de facturation. ?format=pdf|csv|xlsx (défaut pdf). */
  @Get('sessions/:id/decompte')
  @Auth('admin_of')
  async decompte(@Param('id') id: string, @Query('format') format = 'pdf', @Res() res: Response) {
    if (!['pdf', 'csv', 'xlsx'].includes(format)) {
      throw new BadRequestException('Format invalide (pdf, csv ou xlsx).');
    }
    send(res, await this.exports.decompte(id, format as 'pdf' | 'csv' | 'xlsx'));
  }
}

function send(res: Response, file: ExportFile): void {
  res
    .set({
      'Content-Type': file.contentType,
      'Content-Disposition': `attachment; filename="${file.filename}"`,
      'Content-Length': String(file.buffer.length),
    })
    .send(file.buffer);
}
