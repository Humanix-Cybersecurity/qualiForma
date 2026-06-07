// SPDX-License-Identifier: AGPL-3.0-or-later
import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { SignatureModule } from './signature/signature.module';
import { NotificationModule } from './notification/notification.module';
import { TenantModule } from './tenant/tenant.module';
import { TenantMiddleware } from './tenant/tenant.middleware';
import { AuthModule } from './auth/auth.module';
import { DocumentsModule } from './documents/documents.module';
import { EmargementModule } from './emargement/emargement.module';
import { QuestionnairesModule } from './questionnaires/questionnaires.module';
import { ExportsModule } from './exports/exports.module';
import { SuperAdminModule } from './superadmin/superadmin.module';
import { RgpdModule } from './rgpd/rgpd.module';
import { ProfileModule } from './profile/profile.module';
import { CatalogModule } from './catalog/catalog.module';
import { ReclamationsModule } from './reclamations/reclamations.module';
import { UsersModule } from './users/users.module';
import { ConventionsModule } from './conventions/conventions.module';
import { StatsModule } from './stats/stats.module';
import { FacturationModule } from './facturation/facturation.module';
import { JobsModule } from './jobs/jobs.module';
import { MetricsModule } from './metrics/metrics.module';
import { QuotasModule } from './quotas/quotas.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        // Ne jamais logger en clair les en-têtes sensibles.
        redact: ['req.headers.authorization', 'req.headers.cookie'],
      },
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuditModule,
    SignatureModule,
    NotificationModule,
    TenantModule,
    AuthModule,
    DocumentsModule,
    EmargementModule,
    QuestionnairesModule,
    ExportsModule,
    SuperAdminModule,
    RgpdModule,
    ProfileModule,
    CatalogModule,
    ReclamationsModule,
    UsersModule,
    ConventionsModule,
    StatsModule,
    FacturationModule,
    JobsModule,
    MetricsModule,
    QuotasModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Le contexte tenant est requis partout SAUF la sonde de santé et l'exposition métriques.
    consumer
      .apply(TenantMiddleware)
      .exclude('health', 'metrics')
      .forRoutes('*');
  }
}
