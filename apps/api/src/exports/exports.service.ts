// SPDX-License-Identifier: AGPL-3.0-or-later
import { randomInt } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import {
  renderCertificat,
  renderConvention,
  renderConvocation,
  renderDecompte,
  renderFeuilleEmargement,
  renderProgramme,
  renderReglementInterieur,
  type CreneauBloc,
  type DecompteLigneData,
} from '@humanix/pdf-templates';
import { computeHeuresPresence } from '@humanix/signature-engine';
import { loadEnv } from '../config/env';
import { TenantPrismaService, type TenantClient } from '../prisma/tenant-prisma.service';

export interface ExportFile {
  buffer: Buffer;
  filename: string;
  contentType: string;
}

const PDF = 'application/pdf';
const CSV = 'text/csv; charset=utf-8';
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@Injectable()
export class ExportsService {
  private readonly baseUrl = loadEnv().PUBLIC_BASE_URL;

  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  private verificationUrl(token: string): string {
    return `${this.baseUrl}/verification/${token}`;
  }

  /** Feuille d'émargement consolidée d'une session (tous créneaux + signatures + QR). */
  async feuilleEmargement(sessionId: string): Promise<ExportFile> {
    return this.tenantPrisma.withTenant(async (tx) => {
      const session = await tx.session.findFirst({
        where: { id: sessionId },
        include: { formation: true },
      });
      if (!session) throw new NotFoundException('Session introuvable.');

      const tenant = await tx.tenant.findFirst();
      const convention = await tx.convention.findFirst({ where: { sessionId } });
      const creneaux = await tx.creneau.findMany({
        where: { sessionId },
        orderBy: { ordre: 'asc' },
        include: { emargements: { include: { user: true, preuve: true } } },
      });

      const blocs: CreneauBloc[] = creneaux.map((c) => ({
        date: c.date.toISOString().slice(0, 10),
        periode: c.periode,
        heureDebut: c.heureDebut,
        heureFin: c.heureFin,
        ...(c.lieu ? { lieu: c.lieu } : {}),
        signatures: c.emargements.map((e) => ({
          nom: userName(e.user),
          role: e.signataire,
          statut: e.statut,
          ...(e.timestampServeur ? { timestampServeur: e.timestampServeur.toISOString() } : {}),
          ...(e.preuve ? { verificationUrl: this.verificationUrl(e.preuve.verificationToken) } : {}),
        })),
      }));

      const bytes = await renderFeuilleEmargement({
        organisme: { nom: tenant?.name ?? 'Organisme' },
        formationIntitule: session.formation.intitule,
        ...(convention ? { numeroConvention: convention.numero } : {}),
        sessionDateDebut: session.dateDebut.toISOString().slice(0, 10),
        sessionDateFin: session.dateFin.toISOString().slice(0, 10),
        ...(session.lieu ? { sessionLieu: session.lieu } : {}),
        creneaux: blocs,
        generatedAt: new Date().toISOString(),
      });

      return { buffer: Buffer.from(bytes), filename: `feuille-emargement-${sessionId}.pdf`, contentType: PDF };
    });
  }

  /**
   * Certificat de réalisation d'une inscription (+ upsert de CertificatRealisation).
   * Si `ownerUserId` est fourni, vérifie que l'inscription appartient à cet apprenant.
   */
  async certificat(inscriptionId: string, ownerUserId?: string): Promise<ExportFile> {
    return this.tenantPrisma.withTenant(async (tx) => {
      const inscription = await tx.inscription.findFirst({
        where: { id: inscriptionId },
        include: { apprenant: true, session: { include: { formation: true } } },
      });
      if (!inscription) throw new NotFoundException('Inscription introuvable.');
      if (ownerUserId && inscription.apprenantId !== ownerUserId) {
        throw new NotFoundException('Inscription introuvable.');
      }

      const tenant = await tx.tenant.findFirst();
      const heures = await this.heuresApprenant(tx, inscription.sessionId, inscription.apprenantId);

      const existant = await tx.certificatRealisation.findUnique({ where: { inscriptionId } });
      const numero = existant?.numero ?? `CERT-${yearOf(inscription.session.dateFin)}-${randomInt(1000, 9999)}`;
      await tx.certificatRealisation.upsert({
        where: { inscriptionId },
        create: {
          tenantId: inscription.tenantId,
          inscriptionId,
          numero,
          statut: 'emis',
          heuresRealisees: heures,
          dateEmission: new Date(),
        },
        update: { heuresRealisees: heures, statut: 'emis', dateEmission: new Date() },
      });

      const bytes = await renderCertificat({
        organisme: { nom: tenant?.name ?? 'Organisme' },
        apprenantNom: userName(inscription.apprenant),
        formationIntitule: inscription.session.formation.intitule,
        ...(inscription.session.formation.objectifs ? { objectifs: inscription.session.formation.objectifs } : {}),
        dateDebut: inscription.session.dateDebut.toISOString().slice(0, 10),
        dateFin: inscription.session.dateFin.toISOString().slice(0, 10),
        heuresRealisees: heures,
        numero,
        signatureLevel: 'SES',
        generatedAt: new Date().toISOString(),
      });

      return { buffer: Buffer.from(bytes), filename: `certificat-${numero}.pdf`, contentType: PDF };
    });
  }

  /** Décompte de facturation (heures réelles par apprenant) au format pdf/csv/xlsx. */
  async decompte(sessionId: string, format: 'pdf' | 'csv' | 'xlsx'): Promise<ExportFile> {
    return this.tenantPrisma.withTenant(async (tx) => {
      const session = await tx.session.findFirst({
        where: { id: sessionId },
        include: { formation: true },
      });
      if (!session) throw new NotFoundException('Session introuvable.');

      const tenant = await tx.tenant.findFirst();
      const convention = await tx.convention.findFirst({ where: { sessionId } });
      const inscriptions = await tx.inscription.findMany({
        where: { sessionId, statut: { not: 'annulee' } },
        include: { apprenant: true, entreprise: true },
      });

      const lignes: DecompteLigneData[] = [];
      for (const ins of inscriptions) {
        const heures = await this.heuresApprenant(tx, sessionId, ins.apprenantId);
        lignes.push({ apprenantNom: userName(ins.apprenant), heures });
      }
      const totalHeures = round2(lignes.reduce((s, l) => s + l.heures, 0));
      const entreprise = inscriptions.find((i) => i.entreprise)?.entreprise?.raisonSociale;

      if (format === 'csv') {
        return { buffer: this.decompteCsv(lignes, totalHeures), filename: `decompte-${sessionId}.csv`, contentType: CSV };
      }
      if (format === 'xlsx') {
        return {
          buffer: await this.decompteXlsx(session.formation.intitule, lignes, totalHeures),
          filename: `decompte-${sessionId}.xlsx`,
          contentType: XLSX,
        };
      }
      const bytes = await renderDecompte({
        organisme: { nom: tenant?.name ?? 'Organisme' },
        formationIntitule: session.formation.intitule,
        ...(entreprise ? { entreprise } : {}),
        ...(convention ? { numeroConvention: convention.numero } : {}),
        periodeDebut: session.dateDebut.toISOString().slice(0, 10),
        periodeFin: session.dateFin.toISOString().slice(0, 10),
        lignes,
        totalHeures,
        ...(convention?.montantCents != null ? { montantCents: convention.montantCents } : {}),
        generatedAt: new Date().toISOString(),
      });
      return { buffer: Buffer.from(bytes), filename: `decompte-${sessionId}.pdf`, contentType: PDF };
    });
  }

  // --- Documents Qualiopi ---

  async programme(formationId: string): Promise<ExportFile> {
    return this.tenantPrisma.withTenant(async (tx) => {
      const f = await tx.formation.findFirst({ where: { id: formationId } });
      if (!f) throw new NotFoundException('Formation introuvable.');
      const tenant = await tx.tenant.findFirst();
      const bytes = await renderProgramme({
        organisme: { nom: tenant?.name ?? 'Organisme' },
        formationIntitule: f.intitule,
        ...(f.objectifs ? { objectifs: f.objectifs } : {}),
        ...(f.prerequis ? { prerequis: f.prerequis } : {}),
        dureeHeures: Number(f.dureeHeures),
        ...(f.modalitesAccesHandicap ? { modalitesAccesHandicap: f.modalitesAccesHandicap } : {}),
        generatedAt: new Date().toISOString(),
      });
      return { buffer: Buffer.from(bytes), filename: `programme-${formationId}.pdf`, contentType: PDF };
    });
  }

  async reglementInterieur(): Promise<ExportFile> {
    return this.tenantPrisma.withTenant(async (tx) => {
      const tenant = await tx.tenant.findFirst();
      const bytes = await renderReglementInterieur({
        organisme: { nom: tenant?.name ?? 'Organisme' },
        generatedAt: new Date().toISOString(),
      });
      return { buffer: Buffer.from(bytes), filename: 'reglement-interieur.pdf', contentType: PDF };
    });
  }

  async convocation(inscriptionId: string): Promise<ExportFile> {
    return this.tenantPrisma.withTenant(async (tx) => {
      const ins = await tx.inscription.findFirst({
        where: { id: inscriptionId },
        include: { apprenant: true, session: { include: { formation: true } } },
      });
      if (!ins) throw new NotFoundException('Inscription introuvable.');
      const tenant = await tx.tenant.findFirst();
      const bytes = await renderConvocation({
        organisme: { nom: tenant?.name ?? 'Organisme' },
        apprenantNom: userName(ins.apprenant),
        formationIntitule: ins.session.formation.intitule,
        dateDebut: ins.session.dateDebut.toISOString().slice(0, 10),
        dateFin: ins.session.dateFin.toISOString().slice(0, 10),
        ...(ins.session.lieu ? { lieu: ins.session.lieu } : {}),
        generatedAt: new Date().toISOString(),
      });
      return { buffer: Buffer.from(bytes), filename: `convocation-${inscriptionId}.pdf`, contentType: PDF };
    });
  }

  async convention(conventionId: string): Promise<ExportFile> {
    return this.tenantPrisma.withTenant(async (tx) => {
      const conv = await tx.convention.findFirst({
        where: { id: conventionId },
        include: { entreprise: true, session: { include: { formation: true } } },
      });
      if (!conv || !conv.session) throw new NotFoundException('Convention/session introuvable.');
      const tenant = await tx.tenant.findFirst();
      const inscriptions = await tx.inscription.findMany({
        where: { sessionId: conv.sessionId ?? '', statut: { not: 'annulee' } },
        include: { apprenant: true },
      });
      const bytes = await renderConvention({
        organisme: { nom: tenant?.name ?? 'Organisme' },
        numero: conv.numero,
        ...(conv.entreprise ? { entreprise: conv.entreprise.raisonSociale } : {}),
        formationIntitule: conv.session.formation.intitule,
        ...(conv.session.formation.objectifs ? { objectifs: conv.session.formation.objectifs } : {}),
        dateDebut: conv.session.dateDebut.toISOString().slice(0, 10),
        dateFin: conv.session.dateFin.toISOString().slice(0, 10),
        dureeHeures: Number(conv.session.formation.dureeHeures),
        ...(conv.montantCents != null ? { montantCents: conv.montantCents } : {}),
        apprenants: inscriptions.map((i) => userName(i.apprenant)),
        generatedAt: new Date().toISOString(),
      });
      return { buffer: Buffer.from(bytes), filename: `convention-${conv.numero}.pdf`, contentType: PDF };
    });
  }

  // --- internes ---

  private async heuresApprenant(tx: TenantClient, sessionId: string, userId: string): Promise<number> {
    const creneaux = await tx.creneau.findMany({
      where: { sessionId },
      include: { emargements: { where: { userId } } },
    });
    let total = 0;
    for (const c of creneaux) {
      const e = c.emargements[0];
      if (e && e.statut === 'signe') {
        total += computeHeuresPresence(
          c.heureDebut,
          c.heureFin,
          e.heureArriveeReelle ?? undefined,
          e.heureDepartReelle ?? undefined,
        );
      }
    }
    return round2(total);
  }

  private decompteCsv(lignes: DecompteLigneData[], total: number): Buffer {
    const rows = [
      'Apprenant;Heures',
      ...lignes.map((l) => `${csvCell(l.apprenantNom)};${l.heures}`),
      `Total;${total}`,
    ];
    // BOM UTF-8 pour une ouverture correcte dans Excel.
    return Buffer.from('﻿' + rows.join('\r\n'), 'utf8');
  }

  private async decompteXlsx(formation: string, lignes: DecompteLigneData[], total: number): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Décompte');
    ws.addRow([`Décompte — ${formation}`]);
    ws.addRow([]);
    ws.addRow(['Apprenant', 'Heures']);
    for (const l of lignes) ws.addRow([l.apprenantNom, l.heures]);
    ws.addRow(['Total', total]);
    ws.getColumn(1).width = 40;
    const out = await wb.xlsx.writeBuffer();
    return Buffer.from(out);
  }
}

function userName(u: { prenom: string | null; nom: string | null; email: string }): string {
  return [u.prenom, u.nom].filter(Boolean).join(' ') || u.email;
}
function csvCell(v: string): string {
  return /[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
function yearOf(d: Date): number {
  return d.getUTCFullYear();
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
