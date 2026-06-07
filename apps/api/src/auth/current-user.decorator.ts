// SPDX-License-Identifier: AGPL-3.0-or-later
import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AccessClaims } from '@humanix/domain';

/** Injecte les claims du JWT validé (posés par JwtAuthGuard) dans un paramètre de handler. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AccessClaims => {
    const req = ctx.switchToHttp().getRequest<{ user?: AccessClaims }>();
    if (!req.user) {
      throw new Error('CurrentUser utilisé sans JwtAuthGuard.');
    }
    return req.user;
  },
);
