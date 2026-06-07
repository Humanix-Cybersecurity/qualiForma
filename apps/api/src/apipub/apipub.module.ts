// SPDX-License-Identifier: AGPL-3.0-or-later
import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TenantModule } from '../tenant/tenant.module';
import { ApiKeyService } from './api-key.service';
import { WebhookService } from './webhook.service';
import { ApiKeyMiddleware } from './api-key.middleware';
import { ApiV1Controller } from './api-v1.controller';
import { ApiAdminController } from './admin.controller';

@Module({
  imports: [AuthModule, TenantModule],
  controllers: [ApiV1Controller, ApiAdminController],
  providers: [ApiKeyService, WebhookService, ApiKeyMiddleware],
  exports: [WebhookService],
})
export class ApiPubModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Authentification par clé d'API sur toute l'API publique v1.
    consumer.apply(ApiKeyMiddleware).forRoutes(ApiV1Controller);
  }
}
