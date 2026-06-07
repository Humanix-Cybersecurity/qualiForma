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
import { AuditService } from '../audit/audit.service';
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
    private readonly audit: AuditService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    @Inject(FILE_SCANNER) private readonly scanner: FileScanner,
  ) {}

  /** Liste les documents sains du tenant (métadonnées uniquement). */
  async list(filter?: { scope?: DocumentScope; sessionId?: string; formationId?: string }) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const docs = await tx.document.findMany({
        where: {
          scanStatus: 'clean',
          ...(filter?.scope ? { scope: filter.scope } : {}),
          ...(filter?.sessionId ? { sessionId: filter.sessionId } : {}),
          ...(filter?.formationId ? { formationId: filter.formationId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          scope: true,
          nomFichier: true,
          mimeType: true,
          tailleOctets: true,
          createdAt: true,
        },
      });
      return docs.map((d) => ({ ...d, tailleOctets: Number(d.tailleOctets) }));
    });
  }

  /** Récupère le flux d'un document sain pour téléchargement (vérifie l'appartenance tenant via RLS). */
  async getForDownload(id: string) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const doc = await tx.document.findFirst({
        where: { id, scanStatus: 'clean' },
        select: { objectKey: true, nomFichier: true, mimeType: true },
      });
      if (!doc) throw new BadRequestException('Document introuvable ou non disponible.');
      const stream = await this.storage.getStream(doc.objectKey);
      return { stream, nomFichier: doc.nomFichier, mimeType: doc.mimeType };
    });
  }

  /** Supprime un document (objet + métadonnées). Tracé en audit. */
  async remove(id: string, actorUserId?: string) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const doc = await tx.document.findFirst({ where: { id }, select: { id: true, objectKey: true } });
      if (!doc) throw new BadRequestException('Document introuvable.');
      await this.storage.delete(doc.objectKey).catch(() => undefined);
      await tx.document.delete({ where: { id } });
      await this.audit.record(tx, {
        action: 'document.delete',
        entity: 'document',
        entityId: id,
        ...(actorUserId ? { actorUserId } : {}),
      });
      return { id, deleted: true };
    });
  }

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

    return this.tenantPrisma.withTenant(async (tx) => {
      const doc = await tx.document.create({
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
      });
      await this.audit.record(tx, {
        action: 'document.upload',
        entity: 'document',
        entityId: doc.id,
        ...(input.uploadedById ? { actorUserId: input.uploadedById } : {}),
        payload: { checksum, mime, scope: input.scope },
      });
      return doc;
    });
  }
}

/** Conserve uniquement le nom de base et des caractères sûrs. */
function sanitizeName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? 'fichier';
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200) || 'fichier';
}
