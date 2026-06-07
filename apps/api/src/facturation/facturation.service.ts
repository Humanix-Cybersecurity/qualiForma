// SPDX-License-Identifier: AGPL-3.0-or-later
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Financeur, MoyenPaiement } from '@prisma/client';
import { renderFacture, buildFacturXXml } from '@humanix/pdf-templates';
import type { AccessClaims } from '@humanix/domain';
import { requireTenantContext } from '../tenant/tenant-context';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';
import { AuditService } from '../audit/audit.service';

export interface FactureLigneInput {
  designation: string;
  quantite?: number;
  prixUnitaireCents: number;
  tvaTauxBp?: number;
}
export interface CreateFactureInput {
  sessionId?: string;
  entrepriseId?: string;
  apprenantId?: string;
  financeur?: Financeur;
  dateEcheance?: string;
  notes?: string;
  lignes: FactureLigneInput[];
}

const FINANCEUR_LABEL: Record<string, string> = {
  entreprise: 'Entreprise (fonds propres)',
  opco: 'OPCO',
  particulier: 'Particulier',
  pole_emploi: 'France Travail',
  cpf: 'CPF / CDC',
  region: 'Conseil régional',
  etat: 'État / pouvoirs publics',
  autre_of: 'Autre organisme de formation',
  autre: 'Autre',
};

function ligneHt(l: FactureLigneInput): number {
  return Math.round((l.quantite ?? 1) * l.prixUnitaireCents);
}

@Injectable()
export class FacturationService {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Crée une facture (statut émise) avec ses lignes ; numéro auto FAC-AAAA-NNNN. */
  async create(input: CreateFactureInput, actor: AccessClaims) {
    if (!input.lignes?.length) throw new BadRequestException('Au moins une ligne est requise.');
    return this.tenantPrisma.withTenant(async (tx) => {
      const { tenantId } = requireTenantContext();
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${tenantId}))`;

      const totalHt = input.lignes.reduce((acc, l) => acc + ligneHt(l), 0);
      const totalTva = input.lignes.reduce((acc, l) => acc + Math.round((ligneHt(l) * (l.tvaTauxBp ?? 0)) / 10000), 0);
      const totalTtc = totalHt + totalTva;

      const annee = new Date().getUTCFullYear();
      const count = await tx.facture.count();
      const numero = `FAC-${annee}-${String(count + 1).padStart(4, '0')}`;

      const facture = await tx.facture.create({
        data: {
          tenantId,
          numero,
          statut: 'emise',
          ...(input.sessionId ? { sessionId: input.sessionId } : {}),
          ...(input.entrepriseId ? { entrepriseId: input.entrepriseId } : {}),
          ...(input.apprenantId ? { apprenantId: input.apprenantId } : {}),
          ...(input.financeur ? { financeur: input.financeur } : {}),
          ...(input.dateEcheance ? { dateEcheance: new Date(input.dateEcheance) } : {}),
          ...(input.notes ? { notes: input.notes } : {}),
          totalHtCents: totalHt,
          totalTvaCents: totalTva,
          totalTtcCents: totalTtc,
          lignes: {
            create: input.lignes.map((l) => ({
              tenantId,
              designation: l.designation,
              quantite: l.quantite ?? 1,
              prixUnitaireCents: l.prixUnitaireCents,
              tvaTauxBp: l.tvaTauxBp ?? 0,
            })),
          },
        },
        select: { id: true, numero: true, statut: true, totalTtcCents: true },
      });

      await this.audit.record(tx, {
        action: 'facture.create',
        entity: 'facture',
        entityId: facture.id,
        actorUserId: actor.sub,
        payload: { numero, totalTtcCents: totalTtc },
      });
      return facture;
    });
  }

  /** Liste les factures avec total payé et reste à payer. */
  async list() {
    return this.tenantPrisma.withTenant(async (tx) => {
      const factures = await tx.facture.findMany({
        orderBy: { dateEmission: 'desc' },
        include: { paiements: { select: { montantCents: true } } },
      });
      return factures.map((f) => {
        const paye = f.paiements.reduce((a, p) => a + p.montantCents, 0);
        return {
          id: f.id,
          numero: f.numero,
          statut: f.statut,
          financeur: f.financeur,
          dateEmission: f.dateEmission,
          dateEcheance: f.dateEcheance,
          totalTtcCents: f.totalTtcCents,
          payeCents: paye,
          resteCents: f.totalTtcCents - paye,
        };
      });
    });
  }

  /** Enregistre un paiement et recalcule le statut (payée / partiellement payée). */
  async addPaiement(
    factureId: string,
    input: { montantCents: number; moyen?: MoyenPaiement; reference?: string; datePaiement?: string },
    actor: AccessClaims,
  ) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const { tenantId } = requireTenantContext();
      const facture = await tx.facture.findFirst({
        where: { id: factureId },
        include: { paiements: { select: { montantCents: true } } },
      });
      if (!facture) throw new NotFoundException('Facture introuvable.');
      if (facture.statut === 'annulee') throw new BadRequestException('Facture annulée.');

      await tx.paiement.create({
        data: {
          tenantId,
          factureId,
          montantCents: input.montantCents,
          moyen: input.moyen ?? 'virement',
          ...(input.reference ? { reference: input.reference } : {}),
          ...(input.datePaiement ? { datePaiement: new Date(input.datePaiement) } : {}),
        },
      });

      const totalPaye = facture.paiements.reduce((a, p) => a + p.montantCents, 0) + input.montantCents;
      const statut = totalPaye >= facture.totalTtcCents ? 'payee' : totalPaye > 0 ? 'partiellement_payee' : 'emise';
      await tx.facture.update({ where: { id: factureId }, data: { statut } });

      await this.audit.record(tx, {
        action: 'facture.paiement',
        entity: 'facture',
        entityId: factureId,
        actorUserId: actor.sub,
        payload: { montantCents: input.montantCents, statut },
      });
      return { factureId, statut, payeCents: totalPaye, resteCents: facture.totalTtcCents - totalPaye };
    });
  }

  /** Annule une facture. */
  async annuler(id: string, actor: AccessClaims) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const facture = await tx.facture.findFirst({ where: { id }, select: { id: true } });
      if (!facture) throw new NotFoundException('Facture introuvable.');
      await tx.facture.update({ where: { id }, data: { statut: 'annulee' } });
      await this.audit.record(tx, { action: 'facture.annuler', entity: 'facture', entityId: id, actorUserId: actor.sub });
      return { id, statut: 'annulee' as const };
    });
  }

  /** Génère le PDF d'une facture. */
  async pdf(id: string): Promise<{ buffer: Buffer; filename: string }> {
    return this.tenantPrisma.withTenant(async (tx) => {
      const f = await tx.facture.findFirst({ where: { id }, include: { lignes: true, paiements: true } });
      if (!f) throw new NotFoundException('Facture introuvable.');
      const tenant = await tx.tenant.findFirst();
      const entreprise = f.entrepriseId
        ? await tx.entrepriseCliente.findFirst({ where: { id: f.entrepriseId }, select: { raisonSociale: true } })
        : null;
      const session = f.sessionId
        ? await tx.session.findFirst({ where: { id: f.sessionId }, include: { formation: { select: { intitule: true } } } })
        : null;
      const paye = f.paiements.reduce((a, p) => a + p.montantCents, 0);
      const bytes = await renderFacture({
        organisme: { nom: tenant?.name ?? 'Organisme' },
        numero: f.numero,
        dateEmission: f.dateEmission.toISOString(),
        ...(f.dateEcheance ? { dateEcheance: f.dateEcheance.toISOString() } : {}),
        ...(entreprise ? { client: entreprise.raisonSociale } : {}),
        ...(f.financeur ? { financeur: FINANCEUR_LABEL[f.financeur] ?? f.financeur } : {}),
        ...(session ? { formationIntitule: session.formation.intitule } : {}),
        lignes: f.lignes.map((l) => {
          const ht = Math.round(Number(l.quantite) * l.prixUnitaireCents);
          return {
            designation: l.designation,
            quantite: Number(l.quantite),
            prixUnitaireCents: l.prixUnitaireCents,
            tvaTauxBp: l.tvaTauxBp,
            montantHtCents: ht,
          };
        }),
        totalHtCents: f.totalHtCents,
        totalTvaCents: f.totalTvaCents,
        totalTtcCents: f.totalTtcCents,
        montantPayeCents: paye,
        ...(f.notes ? { notes: f.notes } : {}),
        generatedAt: new Date().toISOString(),
      });
      return { buffer: Buffer.from(bytes), filename: `${f.numero}.pdf` };
    });
  }

  /** XML Factur-X (profil MINIMUM) d'une facture, pour dépôt PDP / archivage structuré. */
  async facturXXml(id: string): Promise<{ xml: string; filename: string }> {
    return this.tenantPrisma.withTenant(async (tx) => {
      const f = await tx.facture.findFirst({ where: { id }, include: { lignes: true, paiements: true } });
      if (!f) throw new NotFoundException('Facture introuvable.');
      const tenant = await tx.tenant.findFirst();
      const entreprise = f.entrepriseId
        ? await tx.entrepriseCliente.findFirst({ where: { id: f.entrepriseId }, select: { raisonSociale: true } })
        : null;
      const paye = f.paiements.reduce((a, p) => a + p.montantCents, 0);
      const xml = buildFacturXXml({
        organisme: { nom: tenant?.name ?? 'Organisme' },
        numero: f.numero,
        dateEmission: f.dateEmission.toISOString(),
        ...(entreprise ? { client: entreprise.raisonSociale } : {}),
        lignes: f.lignes.map((l) => ({
          designation: l.designation,
          quantite: Number(l.quantite),
          prixUnitaireCents: l.prixUnitaireCents,
          tvaTauxBp: l.tvaTauxBp,
          montantHtCents: Math.round(Number(l.quantite) * l.prixUnitaireCents),
        })),
        totalHtCents: f.totalHtCents,
        totalTvaCents: f.totalTvaCents,
        totalTtcCents: f.totalTtcCents,
        montantPayeCents: paye,
        generatedAt: new Date().toISOString(),
      });
      return { xml, filename: `factur-x-${f.numero}.xml` };
    });
  }

  /**
   * Bilan Pédagogique et Financier (BPF) simplifié pour une année civile :
   * produits par type de financeur, nombre de stagiaires, heures de formation.
   */
  async bpf(annee: number) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const debut = new Date(Date.UTC(annee, 0, 1));
      const fin = new Date(Date.UTC(annee + 1, 0, 1));

      // Produits : factures émises/payées de l'année, regroupées par financeur (TTC).
      const factures = await tx.facture.findMany({
        where: { statut: { in: ['emise', 'partiellement_payee', 'payee'] }, dateEmission: { gte: debut, lt: fin } },
        select: { financeur: true, totalHtCents: true, totalTtcCents: true },
      });
      const produits: Record<string, { ht: number; ttc: number; nb: number }> = {};
      for (const f of factures) {
        const k = f.financeur ?? 'autre';
        const e = produits[k] ?? { ht: 0, ttc: 0, nb: 0 };
        e.ht += f.totalHtCents;
        e.ttc += f.totalTtcCents;
        e.nb += 1;
        produits[k] = e;
      }

      // Bilan pédagogique : sessions de l'année + heures + stagiaires distincts.
      const sessions = await tx.session.findMany({
        where: { dateDebut: { gte: debut, lt: fin } },
        include: { creneaux: { select: { heureDebut: true, heureFin: true } }, _count: { select: { inscriptions: true } } },
      });
      const toMin = (s: string) => {
        const m = /^(\d{2}):(\d{2})$/.exec(s);
        return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
      };
      let heures = 0;
      for (const s of sessions) {
        for (const c of s.creneaux) heures += Math.max(0, toMin(c.heureFin) - toMin(c.heureDebut));
      }
      const inscriptions = await tx.inscription.count({
        where: { session: { dateDebut: { gte: debut, lt: fin } }, statut: { not: 'annulee' } },
      });
      const stagiairesDistincts = await tx.inscription.findMany({
        where: { session: { dateDebut: { gte: debut, lt: fin } }, statut: { not: 'annulee' } },
        select: { apprenantId: true },
        distinct: ['apprenantId'],
      });

      const totalHt = factures.reduce((a, f) => a + f.totalHtCents, 0);
      const totalTtc = factures.reduce((a, f) => a + f.totalTtcCents, 0);

      return {
        annee,
        produits,
        totalHtCents: totalHt,
        totalTtcCents: totalTtc,
        nbSessions: sessions.length,
        heuresFormation: Math.round((heures / 60) * 10) / 10,
        nbInscriptions: inscriptions,
        nbStagiairesDistincts: stagiairesDistincts.length,
        financeurLabels: FINANCEUR_LABEL,
      };
    });
  }

  /** Export comptable (CSV) des factures et paiements de l'année — base pour saisie/FEC. */
  async exportComptable(annee: number): Promise<{ buffer: Buffer; filename: string }> {
    return this.tenantPrisma.withTenant(async (tx) => {
      const debut = new Date(Date.UTC(annee, 0, 1));
      const fin = new Date(Date.UTC(annee + 1, 0, 1));
      const factures = await tx.facture.findMany({
        where: { dateEmission: { gte: debut, lt: fin } },
        orderBy: { dateEmission: 'asc' },
        include: { paiements: true },
      });
      const sep = ';';
      const lines = [
        ['Type', 'Numero', 'Date', 'Financeur', 'Statut', 'HT', 'TVA', 'TTC', 'Paye', 'Reference'].join(sep),
      ];
      const euro = (c: number) => (c / 100).toFixed(2).replace('.', ',');
      for (const f of factures) {
        const paye = f.paiements.reduce((a, p) => a + p.montantCents, 0);
        lines.push(
          ['Facture', f.numero, f.dateEmission.toISOString().slice(0, 10), f.financeur ?? '', f.statut,
            euro(f.totalHtCents), euro(f.totalTvaCents), euro(f.totalTtcCents), euro(paye), ''].join(sep),
        );
        for (const p of f.paiements) {
          lines.push(
            ['Paiement', f.numero, p.datePaiement.toISOString().slice(0, 10), '', p.moyen, '', '', '', euro(p.montantCents), p.reference ?? ''].join(sep),
          );
        }
      }
      // BOM UTF-8 pour Excel.
      const buffer = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(lines.join('\r\n'), 'utf8')]);
      return { buffer, filename: `export-comptable-${annee}.csv` };
    });
  }

  /** Liste les financeurs disponibles (pour les sélecteurs). */
  financeurs(): { value: string; label: string }[] {
    return Object.entries(FINANCEUR_LABEL).map(([value, label]) => ({ value, label }));
  }
}
