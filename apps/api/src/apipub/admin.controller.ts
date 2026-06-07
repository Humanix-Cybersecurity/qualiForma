// SPDX-License-Identifier: AGPL-3.0-or-later
import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import type { AccessClaims } from '@humanix/domain';
import { Auth } from '../auth/auth.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ApiKeyService } from './api-key.service';
import { WebhookService } from './webhook.service';

const keySchema = z.object({ nom: z.string().min(1).max(120) });
const webhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.enum(['scellement.created'])).min(1),
});

/** Gestion (admin OF) des clés d'API et des webhooks. */
@Controller('admin')
export class ApiAdminController {
  constructor(
    private readonly keys: ApiKeyService,
    private readonly webhooks: WebhookService,
  ) {}

  @Get('api-keys')
  @Auth('admin_of')
  listKeys() {
    return this.keys.list();
  }

  @Post('api-keys')
  @Auth('admin_of')
  createKey(@Body(new ZodValidationPipe(keySchema)) body: { nom: string }, @CurrentUser() user: AccessClaims) {
    return this.keys.create(body.nom, user);
  }

  @Delete('api-keys/:id')
  @Auth('admin_of')
  revokeKey(@Param('id') id: string, @CurrentUser() user: AccessClaims) {
    return this.keys.revoke(id, user);
  }

  @Get('webhooks')
  @Auth('admin_of')
  listWebhooks() {
    return this.webhooks.list();
  }

  @Post('webhooks')
  @Auth('admin_of')
  createWebhook(@Body(new ZodValidationPipe(webhookSchema)) body: { url: string; events: string[] }, @CurrentUser() user: AccessClaims) {
    return this.webhooks.create(body, user);
  }

  @Delete('webhooks/:id')
  @Auth('admin_of')
  removeWebhook(@Param('id') id: string) {
    return this.webhooks.remove(id);
  }
}
