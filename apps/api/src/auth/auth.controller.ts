// SPDX-License-Identifier: AGPL-3.0-or-later
import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import {
  type AccessClaims,
  loginInputSchema,
  refreshInputSchema,
  totpCodeSchema,
  type LoginInput,
  type RefreshInput,
} from '@humanix/domain';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

const confirmMfaSchema = z.object({ code: totpCodeSchema });

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  login(
    @Body(new ZodValidationPipe(loginInputSchema)) body: LoginInput,
    @Req() req: Request,
  ) {
    return this.auth.login(body, reqMeta(req));
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(
    @Body(new ZodValidationPipe(refreshInputSchema)) body: RefreshInput,
    @Req() req: Request,
  ) {
    return this.auth.refresh(body, reqMeta(req));
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Body(new ZodValidationPipe(refreshInputSchema)) body: RefreshInput) {
    await this.auth.logout(body.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AccessClaims): AccessClaims {
    return user;
  }

  @Post('mfa/setup')
  @UseGuards(JwtAuthGuard)
  setupMfa(@CurrentUser() user: AccessClaims) {
    return this.auth.startMfaEnrollment(user);
  }

  @Post('mfa/confirm')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  async confirmMfa(
    @CurrentUser() user: AccessClaims,
    @Body(new ZodValidationPipe(confirmMfaSchema)) body: { code: string },
  ) {
    await this.auth.confirmMfaEnrollment(user, body.code);
  }
}

function reqMeta(req: Request): { ip?: string; userAgent?: string } {
  const meta: { ip?: string; userAgent?: string } = {};
  if (req.ip) meta.ip = req.ip;
  const ua = req.headers['user-agent'];
  if (typeof ua === 'string') meta.userAgent = ua;
  return meta;
}
