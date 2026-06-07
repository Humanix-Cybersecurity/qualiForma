// SPDX-License-Identifier: AGPL-3.0-or-later
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { loadEnv } from '../config/env';
import { NotificationService } from '../notification/notification.service';
import { SuperAdminPrismaService } from '../superadmin/superadmin-prisma.service';

/**
 * Relances automatiques des signatures manquantes (exigence transverse). Job planifié
 * cross-tenant (client privilégié). Désactivé si JOBS_ENABLED=false ou client non configuré.
 */
@Injectable()
export class RelancesService {
  private readonly logger = new Logger(RelancesService.name);
  private readonly env = loadEnv();

  constructor(
    private readonly prisma: SuperAdminPrismaService,
    private readonly notif: NotificationService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async planifie(): Promise<void> {
    if (!this.env.JOBS_ENABLED || !this.prisma.enabled) return;
    await this.relancer();
  }

  /** Envoie une relance aux apprenants inscrits n'ayant pas signé un créneau ouvert. */
  async relancer(): Promise<{ relances: number }> {
    const creneaux = await this.prisma.creneau.findMany({
      where: { signatureOuverte: true },
      include: { session: { include: { formation: { select: { intitule: true } } } } },
    });
    let relances = 0;
    for (const c of creneaux) {
      const inscriptions = await this.prisma.inscription.findMany({
        where: { sessionId: c.sessionId, statut: { not: 'annulee' } },
        include: { apprenant: { select: { email: true } } },
      });
      const signes = await this.prisma.emargement.findMany({
        where: { creneauId: c.id, statut: 'signe' },
        select: { userId: true },
      });
      const signesSet = new Set(signes.map((s) => s.userId));
      for (const ins of inscriptions) {
        if (signesSet.has(ins.apprenantId) || !ins.apprenant.email) continue;
        await this.notif
          .sendEmail({
            to: ins.apprenant.email,
            subject: `Émargement à signer — ${c.session.formation.intitule}`,
            html: `<p>Votre émargement pour le créneau du ${c.date.toISOString().slice(0, 10)} (${c.periode}) est ouvert. Merci de signer.</p>`,
          })
          .catch((e) => this.logger.warn(`Relance échouée (${ins.apprenant.email}) : ${(e as Error).message}`));
        relances += 1;
      }
    }
    this.logger.log(`Relances envoyées : ${relances}`);
    return { relances };
  }
}
