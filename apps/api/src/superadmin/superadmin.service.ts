// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { SuperAdminPrismaService } from './superadmin-prisma.service';

export interface OnboardTenantInput {
  slug: string;
  name: string;
  adminEmail: string;
  adminPassword: string;
  planCode?: string;
}

export interface CreatePlanInput {
  code: string;
  name: string;
  priceCents?: number;
  interval?: 'mensuel' | 'annuel';
  maxUsers?: number;
  maxActiveSessions?: number;
}

@Injectable()
export class SuperAdminService {
  constructor(private readonly prisma: SuperAdminPrismaService) {}

  private ensureEnabled(): void {
    if (!this.prisma.enabled) {
      throw new ServiceUnavailableException(
        'Espace super-admin désactivé (DATABASE_ADMIN_URL non configurée).',
      );
    }
  }

  /** Onboarding d'un tenant : crée l'organisme, son admin et (option) son abonnement. */
  async onboardTenant(input: OnboardTenantInput) {
    this.ensureEnabled();
    const passwordHash = await argon2.hash(input.adminPassword, { type: argon2.argon2id });

    try {
      return await this.prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: { slug: input.slug.toLowerCase(), name: input.name },
        });
        const admin = await tx.user.create({
          data: {
            tenantId: tenant.id,
            email: input.adminEmail.toLowerCase(),
            passwordHash,
            role: 'admin_of',
          },
        });
        if (input.planCode) {
          const plan = await tx.plan.findUnique({ where: { code: input.planCode } });
          if (plan) {
            await tx.subscription.create({
              data: { tenantId: tenant.id, planId: plan.id, status: 'active' },
            });
          }
        }
        return { tenantId: tenant.id, slug: tenant.slug, adminId: admin.id };
      });
    } catch (e) {
      if (typeof e === 'object' && e && (e as { code?: string }).code === 'P2002') {
        throw new ConflictException('Slug ou e-mail déjà utilisé.');
      }
      throw e;
    }
  }

  /** Liste tous les tenants avec quelques métriques (supervision). */
  async listTenants() {
    this.ensureEnabled();
    const tenants = await this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { users: true, sessions: true } },
        subscriptions: { include: { plan: { select: { code: true } } }, take: 1, orderBy: { createdAt: 'desc' } },
        quota: true,
      },
    });
    return tenants.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      status: t.status,
      createdAt: t.createdAt,
      utilisateurs: t._count.users,
      sessions: t._count.sessions,
      plan: t.subscriptions[0]?.plan.code ?? null,
      quota: t.quota,
    }));
  }

  async setTenantStatus(id: string, status: 'active' | 'suspended') {
    this.ensureEnabled();
    return this.prisma.tenant.update({ where: { id }, data: { status } });
  }

  async listPlans() {
    this.ensureEnabled();
    return this.prisma.plan.findMany({ orderBy: { priceCents: 'asc' } });
  }

  async createPlan(input: CreatePlanInput) {
    this.ensureEnabled();
    try {
      return await this.prisma.plan.create({
        data: {
          code: input.code,
          name: input.name,
          priceCents: input.priceCents ?? 0,
          interval: input.interval ?? 'mensuel',
          maxUsers: input.maxUsers ?? null,
          maxActiveSessions: input.maxActiveSessions ?? null,
        },
      });
    } catch (e) {
      if (typeof e === 'object' && e && (e as { code?: string }).code === 'P2002') {
        throw new ConflictException('Code de plan déjà utilisé.');
      }
      throw e;
    }
  }

  async setQuota(tenantId: string, data: { maxUsers?: number; maxActiveSessions?: number }) {
    this.ensureEnabled();
    return this.prisma.quota.upsert({
      where: { tenantId },
      create: { tenantId, maxUsers: data.maxUsers ?? null, maxActiveSessions: data.maxActiveSessions ?? null },
      update: { maxUsers: data.maxUsers ?? null, maxActiveSessions: data.maxActiveSessions ?? null },
    });
  }
}
