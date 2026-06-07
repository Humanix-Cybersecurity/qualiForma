// SPDX-License-Identifier: AGPL-3.0-or-later
import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module';
import { TenantModule } from './tenant/tenant.module';
import { TenantMiddleware } from './tenant/tenant.middleware';
import { AuthModule } from './auth/auth.module';
import { DocumentsModule } from './documents/documents.module';
import { EmargementModule } from './emargement/emargement.module';
import { QuestionnairesModule } from './questionnaires/questionnaires.module';
import { ExportsModule } from './exports/exports.module';
import { SuperAdminModule } from './superadmin/superadmin.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        // Ne jamais logger en clair les en-têtes sensibles.
        redact: ['req.headers.authorization', 'req.headers.cookie'],
      },
    }),
    PrismaModule,
    TenantModule,
    AuthModule,
    DocumentsModule,
    EmargementModule,
    QuestionnairesModule,
    ExportsModule,
    SuperAdminModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Le contexte tenant est requis partout SAUF la sonde de santé.
    consumer
      .apply(TenantMiddleware)
      .exclude('health')
      .forRoutes('*');
  }
}
