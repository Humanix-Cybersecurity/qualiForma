// SPDX-License-Identifier: AGPL-3.0-or-later
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { DevisStatut, Financeur } from '@prisma/client';
import { renderDevis } from '@humanix/pdf-templates';
import type { AccessClaims } from '@humanix/domain';
import { requireTenantContext } from '../tenant/tenant-context';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';
import { AuditService } from '../audit/audit.service';
import { FacturationService } from '../facturation/facturation.service';

export interface DevisLigneInput {
  designation: string;
  quantite?: number;
  prixUnitaireCents: number;
  tvaTauxBp?: number;
}
export interface CreateDevisInput {
  sessionId?: string;
  entrepriseId?: string;
  apprenantId?: string;
  financeur?: Financeur;
  validiteJours?: number;
  notes?: string;
  lignes: DevisLigneInput[];
}

const FINANCEUR_LABEL: Record<string, string> = {
  entreprise: 'Entreprise (fonds propres)', opco: 'OPCO', particulier: 'Particulier',
  pole_emploi: 'France Travail', cpf: 'CPF / CDC', region: 'Conseil régional',
  etat: 'État / pouvoirs publics', autre_of: 'Autre organisme de formation', autre: 'Autre',
};
const ht = (l: DevisLigneInput) => Math.round((l.quantite ?? 1) * l.prixUnitaireCents);

@Injectable()
export class DevisService {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly audit: AuditService,
    private readonly facturation: FacturationService,
  ) {}

  async create(input: CreateDevisInput, actor: AccessClaims) {
    if (!input.lignes?.length) throw new BadRequestException('Au moins une ligne est requise.');
    return this.tenantPrisma.withTenant(async (tx) => {
      const { tenantId } = requireTenantContext();
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${tenantId}))`;

      const totalHt = input.lignes.reduce((a, l) => a + ht(l), 0);
      const totalTva = input.lignes.reduce((a, l) => a + Math.round((ht(l) * (l.tvaTauxBp ?? 0)) / 10000), 0);
      const annee = new Date().getUTCFullYear();
      const count = await tx.devis.count();
      const numero = `DEV-${annee}-${String(count + 1).padStart(4, '0')}`;

      const devis = await tx.devis.create({
        data: {
          tenantId, numero, statut: 'envoye',
          ...(input.sessionId ? { sessionId: input.sessionId } : {}),
          ...(input.entrepriseId ? { entrepriseId: input.entrepriseId } : {}),
          ...(input.apprenantId ? { apprenantId: input.apprenantId } : {}),
          ...(input.financeur ? { financeur: input.financeur } : {}),
          ...(input.validiteJours ? { validiteJours: input.validiteJours } : {}),
          ...(input.notes ? { notes: input.notes } : {}),
          totalHtCents: totalHt, totalTvaCents: totalTva, totalTtcCents: totalHt + totalTva,
          lignes: {
            create: input.lignes.map((l) => ({
              tenantId, designation: l.designation, quantite: l.quantite ?? 1,
              prixUnitaireCents: l.prixUnitaireCents, tvaTauxBp: l.tvaTauxBp ?? 0,
            })),
          },
        },
        select: { id: true, numero: true, statut: true, totalTtcCents: true },
      });
      await this.audit.record(tx, { action: 'devis.create', entity: 'devis', entityId: devis.id, actorUserId: actor.sub, payload: { numero } });
      return devis;
    });
  }

  async list() {
    return this.tenantPrisma.withTenant(async (tx) => {
      const devis = await tx.devis.findMany({ orderBy: { dateDevis: 'desc' } });
      return devis.map((d) => ({
        id: d.id, numero: d.numero, statut: d.statut, financeur: d.financeur,
        dateDevis: d.dateDevis, validiteJours: d.validiteJours, totalTtcCents: d.totalTtcCents,
        factureId: d.factureId,
      }));
    });
  }

  async setStatut(id: string, statut: DevisStatut, actor: AccessClaims) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const devis = await tx.devis.findFirst({ where: { id }, select: { id: true } });
      if (!devis) throw new NotFoundException('Devis introuvable.');
      const updated = await tx.devis.update({ where: { id }, data: { statut }, select: { id: true, statut: true } });
      await this.audit.record(tx, { action: 'devis.statut', entity: 'devis', entityId: id, actorUserId: actor.sub, payload: { statut } });
      return updated;
    });
  }

  /** Convertit un devis accepté en facture (réutilise le moteur de facturation). */
  async convertir(id: string, actor: AccessClaims) {
    const devis = await this.tenantPrisma.withTenant((tx) =>
      tx.devis.findFirst({ where: { id }, include: { lignes: true } }),
    );
    if (!devis) throw new NotFoundException('Devis introuvable.');
    if (devis.factureId) throw new BadRequestException('Devis déjà converti en facture.');

    const facture = await this.facturation.create(
      {
        ...(devis.sessionId ? { sessionId: devis.sessionId } : {}),
        ...(devis.entrepriseId ? { entrepriseId: devis.entrepriseId } : {}),
        ...(devis.apprenantId ? { apprenantId: devis.apprenantId } : {}),
        ...(devis.financeur ? { financeur: devis.financeur } : {}),
        ...(devis.notes ? { notes: devis.notes } : {}),
        lignes: devis.lignes.map((l) => ({
          designation: l.designation, quantite: Number(l.quantite),
          prixUnitaireCents: l.prixUnitaireCents, tvaTauxBp: l.tvaTauxBp,
        })),
      },
      actor,
    );

    await this.tenantPrisma.withTenant((tx) =>
      tx.devis.update({ where: { id }, data: { statut: 'accepte', factureId: facture.id } }),
    );
    return { devisId: id, factureId: facture.id, numero: facture.numero };
  }

  async pdf(id: string): Promise<{ buffer: Buffer; filename: string }> {
    return this.tenantPrisma.withTenant(async (tx) => {
      const d = await tx.devis.findFirst({ where: { id }, include: { lignes: true } });
      if (!d) throw new NotFoundException('Devis introuvable.');
      const tenant = await tx.tenant.findFirst();
      const entreprise = d.entrepriseId
        ? await tx.entrepriseCliente.findFirst({ where: { id: d.entrepriseId }, select: { raisonSociale: true } })
        : null;
      const session = d.sessionId
        ? await tx.session.findFirst({ where: { id: d.sessionId }, include: { formation: { select: { intitule: true } } } })
        : null;
      const bytes = await renderDevis({
        organisme: { nom: tenant?.name ?? 'Organisme' },
        numero: d.numero,
        dateDevis: d.dateDevis.toISOString(),
        validiteJours: d.validiteJours,
        ...(entreprise ? { client: entreprise.raisonSociale } : {}),
        ...(d.financeur ? { financeur: FINANCEUR_LABEL[d.financeur] ?? d.financeur } : {}),
        ...(session ? { formationIntitule: session.formation.intitule } : {}),
        lignes: d.lignes.map((l) => ({
          designation: l.designation, quantite: Number(l.quantite),
          prixUnitaireCents: l.prixUnitaireCents, tvaTauxBp: l.tvaTauxBp,
          montantHtCents: Math.round(Number(l.quantite) * l.prixUnitaireCents),
        })),
        totalHtCents: d.totalHtCents, totalTvaCents: d.totalTvaCents, totalTtcCents: d.totalTtcCents,
        ...(d.notes ? { notes: d.notes } : {}),
        generatedAt: new Date().toISOString(),
      });
      return { buffer: Buffer.from(bytes), filename: `${d.numero}.pdf` };
    });
  }
}
