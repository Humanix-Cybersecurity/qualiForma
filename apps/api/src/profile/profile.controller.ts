// SPDX-License-Identifier: AGPL-3.0-or-later
import { Body, Controller, Get, HttpCode, Patch, Post } from '@nestjs/common';
import { z } from 'zod';
import type { AccessClaims } from '@humanix/domain';
import { Auth } from '../auth/auth.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ProfileService, type UpdateProfileInput } from './profile.service';

const updateSchema = z.object({
  prenom: z.string().max(100).nullable().optional(),
  nom: z.string().max(100).nullable().optional(),
  handicapAdaptations: z.string().max(2000).nullable().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12).max(256),
});

@Controller('profile')
@Auth()
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Get()
  me(@CurrentUser() user: AccessClaims) {
    return this.profile.me(user);
  }

  @Patch()
  update(
    @CurrentUser() user: AccessClaims,
    @Body(new ZodValidationPipe(updateSchema)) body: UpdateProfileInput,
  ) {
    return this.profile.update(user, body);
  }

  @Post('password')
  @HttpCode(200)
  changePassword(
    @CurrentUser() user: AccessClaims,
    @Body(new ZodValidationPipe(passwordSchema)) body: { currentPassword: string; newPassword: string },
  ) {
    return this.profile.changePassword(user, body.currentPassword, body.newPassword);
  }
}
