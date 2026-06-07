// SPDX-License-Identifier: AGPL-3.0-or-later
import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { z } from 'zod';
import { Auth } from '../auth/auth.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  SuperAdminService,
  type CreatePlanInput,
  type OnboardTenantInput,
} from './superadmin.service';

const onboardSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{2,40}$/, 'Slug invalide (a-z, 0-9, tiret).'),
  name: z.string().min(1).max(200),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(12),
  planCode: z.string().optional(),
});

const planSchema = z.object({
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(120),
  priceCents: z.number().int().nonnegative().optional(),
  interval: z.enum(['mensuel', 'annuel']).optional(),
  maxUsers: z.number().int().positive().optional(),
  maxActiveSessions: z.number().int().positive().optional(),
});

const quotaSchema = z.object({
  maxUsers: z.number().int().positive().optional(),
  maxActiveSessions: z.number().int().positive().optional(),
});

const statusSchema = z.object({ status: z.enum(['active', 'suspended']) });

/** Exploitation SaaS — réservé au super_admin. Module séparé du cœur AGPL (ADR 0007). */
@Controller('admin')
@Auth('super_admin')
export class SuperAdminController {
  constructor(private readonly service: SuperAdminService) {}

  @Post('tenants')
  onboard(@Body(new ZodValidationPipe(onboardSchema)) body: OnboardTenantInput) {
    return this.service.onboardTenant(body);
  }

  @Get('tenants')
  listTenants() {
    return this.service.listTenants();
  }

  @Patch('tenants/:id/status')
  setStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(statusSchema)) body: { status: 'active' | 'suspended' },
  ) {
    return this.service.setTenantStatus(id, body.status);
  }

  @Put('tenants/:id/quota')
  setQuota(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(quotaSchema)) body: { maxUsers?: number; maxActiveSessions?: number },
  ) {
    return this.service.setQuota(id, body);
  }

  @Get('plans')
  listPlans() {
    return this.service.listPlans();
  }

  @Post('plans')
  createPlan(@Body(new ZodValidationPipe(planSchema)) body: CreatePlanInput) {
    return this.service.createPlan(body);
  }
}
