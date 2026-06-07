// SPDX-License-Identifier: AGPL-3.0-or-later
import { BadRequestException, Controller, Get, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Auth } from '../auth/auth.decorator';
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
