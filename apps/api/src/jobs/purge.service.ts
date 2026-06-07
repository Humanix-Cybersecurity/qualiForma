// SPDX-License-Identifier: AGPL-3.0-or-later
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { loadEnv } from '../config/env';
import { SuperAdminPrismaService } from '../superadmin/superadmin-prisma.service';

/**
 * Purge RGPD automatique : supprime les données probantes au-delà de la durée de conservation
 * (`PREUVE_RETENTION_YEARS`, défaut 10 ans). Le *legal hold* est matérialisé par la fenêtre de
 * conservation : RIEN n'est supprimé avant son terme (garanti aussi par le trigger SGBD).
 * Job privilégié (cross-tenant) ; désactivé si JOBS_ENABLED=false ou client non configuré.
 */
@Injectable()
export class PurgeService {
  private readonly logger = new Logger(PurgeService.name);
  private readonly env = loadEnv();

  constructor(private readonly prisma: SuperAdminPrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async planifie(): Promise<void> {
    if (!this.env.JOBS_ENABLED || !this.prisma.enabled) return;
    await this.purger();
  }

  async purger(): Promise<{ emargements: number; scellements: number; audit: number }> {
    const years = this.env.PREUVE_RETENTION_YEARS;
    const cutoff = new Date();
    cutoff.setUTCFullYear(cutoff.getUTCFullYear() - years);

    return this.prisma.$transaction(async (tx) => {
      // Autorise la suppression post-conservation auprès du trigger d'immuabilité.
      await tx.$executeRaw`SELECT set_config('app.retention_years', ${String(years)}, true)`;
      // Supprime les émargements échus → cascade sur les preuves (toutes > conservation).
      const em = await tx.emargement.deleteMany({ where: { createdAt: { lt: cutoff } } });
      const sc = await tx.scellementCreneau.deleteMany({ where: { createdAt: { lt: cutoff } } });
      const au = await tx.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
      this.logger.log(
        `Purge RGPD (>${years} ans) : ${em.count} émargements, ${sc.count} scellements, ${au.count} audit.`,
      );
      return { emargements: em.count, scellements: sc.count, audit: au.count };
    });
  }
}
