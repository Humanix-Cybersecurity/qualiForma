// SPDX-License-Identifier: AGPL-3.0-or-later
import { createHash, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Inject,
  Injectable,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import type { DocumentScope, DocumentType } from '@prisma/client';
import { loadEnv } from '../config/env';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';
import { requireTenantContext } from '../tenant/tenant-context';
import { FILE_SCANNER, type FileScanner } from './file-scanner';
import { OBJECT_STORAGE, type ObjectStorage } from './object-storage';
import { ALLOWED_MIME, sniffMime, type SniffedMime } from './mime-sniffer';
import { inspectZip } from './safe-zip';

export interface UploadInput {
  buffer: Buffer;
  originalName: string;
  type: DocumentType;
  scope: DocumentScope;
  formationId?: string;
  sessionId?: string;
  apprenantId?: string;
  uploadedById?: string;
}

const MIME_TO_TYPES: Record<SniffedMime, DocumentType[]> = {
  'application/pdf': ['pdf', 'syllabus', 'autre'],
  'application/zip': ['zip', 'autre'],
  'text/plain': ['txt', 'autre'],
};

/**
 * Pipeline d'upload FAIL-CLOSED (ADR 0006). Un document n'est jamais rendu disponible
 * avant d'avoir été scanné sain. Ordre strict :
 *   1. taille  2. type MIME RÉEL  3. ZIP sûr (anti bomb/traversal)  4. checksum
 *   5. dépôt en QUARANTAINE  6. scan ClamAV  7. promotion si sain, suppression sinon.
 */
@Injectable()
export class DocumentsService {
  private readonly maxBytes = loadEnv().UPLOAD_MAX_BYTES;

  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    @Inject(FILE_SCANNER) private readonly scanner: FileScanner,
  ) {}

  async upload(input: UploadInput) {
    const { tenantId } = requireTenantContext();

    // 1. Taille.
    if (input.buffer.length === 0) {
      throw new BadRequestException('Fichier vide.');
    }
    if (input.buffer.length > this.maxBytes) {
      throw new PayloadTooLargeException(`Fichier trop volumineux (max ${this.maxBytes} octets).`);
    }

    // 2. Type MIME réel (sniffé, jamais l'extension/déclaration).
    const mime = sniffMime(input.buffer);
    if (!mime || !ALLOWED_MIME.includes(mime)) {
      throw new UnsupportedMediaTypeException('Type de fichier non autorisé (PDF, TXT ou ZIP).');
    }
    if (!MIME_TO_TYPES[mime].includes(input.type)) {
      throw new BadRequestException(
        `Le type déclaré « ${input.type} » est incohérent avec le contenu (${mime}).`,
      );
    }

    // 3. ZIP : inspection sécurisée AVANT tout stockage (anti zip-bomb / path traversal).
    if (mime === 'application/zip') {
      try {
        await inspectZip(input.buffer);
      } catch (err) {
        throw new BadRequestException(`Archive ZIP rejetée : ${(err as Error).message}`);
      }
    }

    // 4. Empreinte d'intégrité.
    const checksum = createHash('sha256').update(input.buffer).digest('hex');

    // 5. Dépôt en quarantaine.
    const id = randomUUID();
    const safeName = sanitizeName(input.originalName);
    const quarantineKey = `${tenantId}/quarantine/${id}-${safeName}`;
    await this.storage.put(quarantineKey, input.buffer, mime);

    // 6. Scan antivirus.
    let result;
    try {
      result = await this.scanner.scan(input.buffer);
    } catch (err) {
      // Indisponibilité du scanner = on ne prend AUCUN risque (fail-closed).
      await this.storage.delete(quarantineKey).catch(() => undefined);
      throw new BadRequestException(
        `Analyse antivirus indisponible : ${(err as Error).message}`,
      );
    }

    if (!result.clean) {
      await this.storage.delete(quarantineKey).catch(() => undefined);
      throw new BadRequestException(
        `Fichier rejeté : menace détectée (${result.signature ?? 'inconnue'}).`,
      );
    }

    // 7. Promotion vers l'espace servable + enregistrement.
    const objectKey = `${tenantId}/documents/${id}-${safeName}`;
    await this.storage.copy(quarantineKey, objectKey);
    await this.storage.delete(quarantineKey).catch(() => undefined);

    return this.tenantPrisma.withTenant((tx) =>
      tx.document.create({
        data: {
          id,
          tenantId,
          type: input.type,
          scope: input.scope,
          formationId: input.formationId ?? null,
          sessionId: input.sessionId ?? null,
          apprenantId: input.apprenantId ?? null,
          nomFichier: safeName,
          objectKey,
          mimeType: mime,
          tailleOctets: BigInt(input.buffer.length),
          checksumSha256: checksum,
          scanStatus: 'clean',
          chiffre: loadEnv().S3_SSE,
          uploadedById: input.uploadedById ?? null,
        },
      }),
    );
  }
}

/** Conserve uniquement le nom de base et des caractères sûrs. */
function sanitizeName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? 'fichier';
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200) || 'fichier';
}
