// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { z } from 'zod';
import type { AccessClaims } from '@humanix/domain';
import { Auth } from '../auth/auth.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { DocumentsService } from './documents.service';

const metaSchema = z.object({
  type: z.enum(['pdf', 'txt', 'zip', 'syllabus', 'autre']),
  scope: z.enum(['tenant', 'formation', 'session', 'apprenant']),
  formationId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  apprenantId: z.string().uuid().optional(),
});

const scopeSchema = z.enum(['tenant', 'formation', 'session', 'apprenant']);

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  /** Dépôt documentaire. Admin OF et formateur uniquement. Pipeline fail-closed (ADR 0006). */
  @Post()
  @Auth('admin_of', 'formateur')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AccessClaims,
    // Les champs multipart (texte) arrivent en chaînes : on les valide via Zod.
    @Body() body: Record<string, unknown>,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Champ « file » manquant.');
    }
    const meta = metaSchema.parse(body ?? {});

    const doc = await this.documents.upload({
      buffer: file.buffer,
      originalName: file.originalname,
      type: meta.type,
      scope: meta.scope,
      ...(meta.formationId && { formationId: meta.formationId }),
      ...(meta.sessionId && { sessionId: meta.sessionId }),
      ...(meta.apprenantId && { apprenantId: meta.apprenantId }),
      uploadedById: user.sub,
    });

    return {
      id: doc.id,
      nomFichier: doc.nomFichier,
      mimeType: doc.mimeType,
      tailleOctets: Number(doc.tailleOctets),
      checksumSha256: doc.checksumSha256,
      scanStatus: doc.scanStatus,
    };
  }

  /** Liste des documents sains (métadonnées). */
  @Get()
  @Auth('admin_of', 'formateur')
  list(@Query('scope') scope?: string, @Query('sessionId') sessionId?: string, @Query('formationId') formationId?: string) {
    const parsedScope = scopeSchema.safeParse(scope);
    return this.documents.list({
      ...(parsedScope.success ? { scope: parsedScope.data } : {}),
      ...(sessionId ? { sessionId } : {}),
      ...(formationId ? { formationId } : {}),
    });
  }

  /**
   * Récupération d'un document sain. `?disposition=inline` pour la visualisation dans le
   * navigateur (PDF), sinon téléchargement.
   */
  @Get(':id/download')
  @Auth('admin_of', 'formateur')
  async download(
    @Param('id') id: string,
    @Res() res: Response,
    @Query('disposition') disposition?: string,
  ): Promise<void> {
    const { stream, nomFichier, mimeType } = await this.documents.getForDownload(id);
    const dispo = disposition === 'inline' ? 'inline' : 'attachment';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `${dispo}; filename="${encodeURIComponent(nomFichier)}"`);
    stream.pipe(res);
  }

  /** Suppression d'un document (admin OF). */
  @Delete(':id')
  @Auth('admin_of')
  remove(@Param('id') id: string, @CurrentUser() user: AccessClaims) {
    return this.documents.remove(id, user.sub);
  }
}
