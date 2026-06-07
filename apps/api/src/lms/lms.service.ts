// SPDX-License-Identifier: AGPL-3.0-or-later
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { LeconType } from '@prisma/client';
import type { AccessClaims } from '@humanix/domain';
import { requireTenantContext } from '../tenant/tenant-context';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';

export interface CreateModuleInput {
  formationId: string;
  titre: string;
  description?: string;
  publie?: boolean;
}
export interface CreateLeconInput {
  titre: string;
  type: LeconType;
  contenu?: string;
}

@Injectable()
export class LmsService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  // --- Administration (admin OF) ---

  async createModule(input: CreateModuleInput) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const { tenantId } = requireTenantContext();
      const formation = await tx.formation.findFirst({ where: { id: input.formationId }, select: { id: true } });
      if (!formation) throw new NotFoundException('Formation introuvable.');
      const ordre = await tx.moduleFormation.count({ where: { formationId: input.formationId } });
      return tx.moduleFormation.create({
        data: {
          tenantId,
          formationId: input.formationId,
          titre: input.titre,
          description: input.description ?? null,
          publie: input.publie ?? false,
          ordre,
        },
        select: { id: true, titre: true, publie: true },
      });
    });
  }

  /** Liste des modules (admin) avec nombre de leçons, filtrable par formation. */
  async listModules(formationId?: string) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const modules = await tx.moduleFormation.findMany({
        where: formationId ? { formationId } : {},
        orderBy: [{ formationId: 'asc' }, { ordre: 'asc' }],
        include: {
          lecons: { orderBy: { ordre: 'asc' }, select: { id: true, titre: true, type: true, contenu: true, ordre: true } },
          _count: { select: { lecons: true } },
        },
      });
      return modules;
    });
  }

  async updateModule(id: string, input: Partial<CreateModuleInput>) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const m = await tx.moduleFormation.findFirst({ where: { id }, select: { id: true } });
      if (!m) throw new NotFoundException('Module introuvable.');
      return tx.moduleFormation.update({
        where: { id },
        data: {
          ...(input.titre !== undefined ? { titre: input.titre } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.publie !== undefined ? { publie: input.publie } : {}),
        },
        select: { id: true, titre: true, publie: true },
      });
    });
  }

  async deleteModule(id: string) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const m = await tx.moduleFormation.findFirst({ where: { id }, select: { id: true } });
      if (!m) throw new NotFoundException('Module introuvable.');
      await tx.moduleFormation.delete({ where: { id } });
      return { id, deleted: true };
    });
  }

  async addLecon(moduleId: string, input: CreateLeconInput) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const { tenantId } = requireTenantContext();
      const mod = await tx.moduleFormation.findFirst({ where: { id: moduleId }, select: { id: true } });
      if (!mod) throw new NotFoundException('Module introuvable.');
      const ordre = await tx.lecon.count({ where: { moduleId } });
      return tx.lecon.create({
        data: { tenantId, moduleId, titre: input.titre, type: input.type, contenu: input.contenu ?? null, ordre },
        select: { id: true, titre: true, type: true },
      });
    });
  }

  async updateLecon(id: string, input: Partial<CreateLeconInput>) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const l = await tx.lecon.findFirst({ where: { id }, select: { id: true } });
      if (!l) throw new NotFoundException('Leçon introuvable.');
      return tx.lecon.update({
        where: { id },
        data: {
          ...(input.titre !== undefined ? { titre: input.titre } : {}),
          ...(input.type !== undefined ? { type: input.type } : {}),
          ...(input.contenu !== undefined ? { contenu: input.contenu } : {}),
        },
        select: { id: true, titre: true, type: true },
      });
    });
  }

  async deleteLecon(id: string) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const l = await tx.lecon.findFirst({ where: { id }, select: { id: true } });
      if (!l) throw new NotFoundException('Leçon introuvable.');
      await tx.lecon.delete({ where: { id } });
      return { id, deleted: true };
    });
  }

  // --- Apprenant ---

  /** Modules publiés des formations auxquelles l'apprenant est inscrit, avec sa progression. */
  async mesModules(user: AccessClaims) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const inscriptions = await tx.inscription.findMany({
        where: { apprenantId: user.sub, statut: { not: 'annulee' } },
        select: { session: { select: { formationId: true } } },
      });
      const formationIds = [...new Set(inscriptions.map((i) => i.session.formationId))];
      if (formationIds.length === 0) return [];

      const modules = await tx.moduleFormation.findMany({
        where: { formationId: { in: formationIds }, publie: true },
        orderBy: [{ ordre: 'asc' }],
        include: { lecons: { orderBy: { ordre: 'asc' } } },
      });
      const leconIds = modules.flatMap((m) => m.lecons.map((l) => l.id));
      const done = await tx.leconProgression.findMany({
        where: { userId: user.sub, leconId: { in: leconIds } },
        select: { leconId: true },
      });
      const doneSet = new Set(done.map((d) => d.leconId));

      return modules.map((m) => {
        const lecons = m.lecons.map((l) => ({
          id: l.id, titre: l.titre, type: l.type, contenu: l.contenu, fait: doneSet.has(l.id),
        }));
        const faits = lecons.filter((l) => l.fait).length;
        return {
          id: m.id,
          titre: m.titre,
          description: m.description,
          lecons,
          total: lecons.length,
          faits,
          progression: lecons.length > 0 ? Math.round((faits / lecons.length) * 100) : 0,
        };
      });
    });
  }

  /** Marque une leçon faite/non faite pour l'apprenant courant (vérifie l'accès). */
  async marquerLecon(leconId: string, fait: boolean, user: AccessClaims) {
    return this.tenantPrisma.withTenant(async (tx) => {
      const { tenantId } = requireTenantContext();
      // Vérifie que la leçon appartient à une formation où l'apprenant est inscrit.
      const lecon = await tx.lecon.findFirst({
        where: { id: leconId },
        select: { id: true, module: { select: { formationId: true, publie: true } } },
      });
      if (!lecon) throw new NotFoundException('Leçon introuvable.');
      const inscrit = await tx.inscription.count({
        where: { apprenantId: user.sub, statut: { not: 'annulee' }, session: { formationId: lecon.module.formationId } },
      });
      if (!inscrit || !lecon.module.publie) throw new BadRequestException('Leçon non accessible.');

      if (fait) {
        await tx.leconProgression.upsert({
          where: { leconId_userId: { leconId, userId: user.sub } },
          create: { tenantId, leconId, userId: user.sub },
          update: {},
        });
      } else {
        await tx.leconProgression.deleteMany({ where: { leconId, userId: user.sub } });
      }
      return { leconId, fait };
    });
  }
}
