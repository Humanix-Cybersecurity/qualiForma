// SPDX-License-Identifier: AGPL-3.0-or-later
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import yazl from 'yazl';
import type { ProofPack, ProofPackSignature, SignataireType } from '@humanix/signature-engine';
import type { AccessClaims } from '@humanix/domain';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';
import { ExportsService } from '../exports/exports.service';

const LISEZMOI = `Pack de preuve d'émargement — vérification HORS-LIGNE
======================================================

Contenu :
  - preuve.json            : preuve auto-portante (empreintes, chaîne d'audit, métadonnées)
  - feuille-emargement.pdf : feuille consolidée lisible
  - horodatage.tsr         : jeton d'horodatage RFC 3161 (si horodatage qualifié)

1) Revalider les empreintes et la chaîne d'intégrité (sans réseau) :
     npx @humanix/proof-verifier preuve.json
   (ou, depuis le dépôt : pnpm --filter @humanix/proof-verifier start preuve.json)

2) Vérifier le certificat de la TSA (horodatage qualifié), avec OpenSSL :
     openssl ts -reply -in horodatage.tsr -token_in -text
     openssl ts -verify -data <feuille> -in horodatage.tsr -token_in -CAfile <chaine_tsa.pem>

Niveau juridique : voir le champ "niveau" de preuve.json (signature avancée AES + horodatage qualifié eIDAS).
`;

@Injectable()
export class ProofPackService {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly exports: ExportsService,
  ) {}

  /** Construit le pack de preuve (JSON auto-portant) du dernier scellement d'un créneau. */
  async build(creneauId: string, user: AccessClaims): Promise<ProofPack> {
    return this.tenantPrisma.withTenant(async (tx) => {
      const creneau = await tx.creneau.findFirst({
        where: { id: creneauId },
        include: { session: { include: { formation: true } } },
      });
      if (!creneau) throw new NotFoundException('Créneau introuvable.');
      const estFormateur = user.sub === creneau.formateurId || user.sub === creneau.session.formateurId;
      if (user.role !== 'admin_of' && !estFormateur) {
        throw new ForbiddenException('Accès au pack de preuve réservé au formateur/administrateur.');
      }

      const scellement = await tx.scellementCreneau.findFirst({
        where: { creneauId },
        orderBy: { createdAt: 'desc' },
      });
      if (!scellement) {
        throw new NotFoundException('Créneau non scellé : générez d\'abord le scellement consolidé.');
      }

      const tenant = await tx.tenant.findFirst();
      const convention = await tx.convention.findFirst({ where: { sessionId: creneau.sessionId } });
      const emargements = await tx.emargement.findMany({
        where: { creneauId, statut: 'signe' },
        include: { preuve: true },
        orderBy: { userId: 'asc' },
      });

      const signatures: ProofPackSignature[] = emargements
        .filter((e) => e.preuve)
        .map((e) => ({
          emargementId: e.id,
          signataire: e.signataire,
          methode: e.methode,
          payload: {
            emargementId: e.id,
            creneau: {
              creneauId: creneau.id,
              sessionId: creneau.sessionId,
              date: creneau.date.toISOString().slice(0, 10),
              periode: creneau.periode,
              heureDebut: creneau.heureDebut,
              heureFin: creneau.heureFin,
              ...(creneau.lieu ? { lieu: creneau.lieu } : {}),
            },
            signataire: { userId: e.userId, type: e.signataire as SignataireType },
            methode: e.methode,
            timestampServeur: (e.timestampServeur ?? new Date(0)).toISOString(),
          },
          payloadSha256: e.preuve!.payloadSha256,
          auditPrevHash: e.preuve!.auditPrevHash,
          auditHash: e.preuve!.auditHash,
          verificationToken: e.preuve!.verificationToken,
          timestampServeur: e.timestampServeur?.toISOString() ?? null,
        }));

      return {
        version: '1',
        niveau: scellement.niveau,
        generatedAt: new Date().toISOString(),
        organisme: { nom: tenant?.name ?? 'Organisme' },
        contexte: {
          formation: creneau.session.formation.intitule,
          ...(creneau.session.intitule ? { session: creneau.session.intitule } : {}),
          date: creneau.date.toISOString().slice(0, 10),
          periode: creneau.periode,
          ...(creneau.lieu ? { lieu: creneau.lieu } : {}),
          ...(convention ? { numeroConvention: convention.numero } : {}),
        },
        scellement: {
          consolidatedPayload: scellement.consolidatedPayload,
          consolidatedSha256: scellement.consolidatedSha256,
          nbSignatures: scellement.nbSignatures,
          auditPrevHash: scellement.auditPrevHash,
          auditHash: scellement.auditHash,
          horodatageType: scellement.horodatageType,
          ...(scellement.horodatageToken ? { horodatageTokenB64: scellement.horodatageToken } : {}),
          verificationToken: scellement.verificationToken,
          createdAt: scellement.createdAt.toISOString(),
        },
        signatures,
      };
    });
  }

  /** Bundle ZIP auto-portant : preuve.json + PDF + jeton .tsr + lisez-moi. */
  async buildZip(creneauId: string, user: AccessClaims): Promise<{ buffer: Buffer; filename: string }> {
    const pack = await this.build(creneauId, user);
    const sessionId = await this.sessionIdOf(creneauId);
    const pdf = await this.exports.feuilleEmargement(sessionId);

    const zip = new yazl.ZipFile();
    zip.addBuffer(Buffer.from(JSON.stringify(pack, null, 2), 'utf8'), 'preuve.json');
    zip.addBuffer(pdf.buffer, 'feuille-emargement.pdf');
    if (pack.scellement.horodatageTokenB64) {
      zip.addBuffer(Buffer.from(pack.scellement.horodatageTokenB64, 'base64'), 'horodatage.tsr');
    }
    zip.addBuffer(Buffer.from(LISEZMOI, 'utf8'), 'LISEZMOI-verification.txt');
    zip.end();

    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      zip.outputStream.on('data', (c: Buffer) => chunks.push(c));
      zip.outputStream.on('end', () => resolve());
      zip.outputStream.on('error', reject);
    });
    return { buffer: Buffer.concat(chunks), filename: `pack-preuve-${creneauId}.zip` };
  }

  private async sessionIdOf(creneauId: string): Promise<string> {
    return this.tenantPrisma.withTenant(async (tx) => {
      const c = await tx.creneau.findFirst({ where: { id: creneauId }, select: { sessionId: true } });
      if (!c) throw new NotFoundException('Créneau introuvable.');
      return c.sessionId;
    });
  }
}
