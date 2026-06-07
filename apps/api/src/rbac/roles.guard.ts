// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AccessClaims, Role } from '@humanix/domain';
import { ROLES_KEY } from './roles.decorator';

/**
 * Autorise selon les rôles déclarés par @Roles(). À placer APRÈS JwtAuthGuard
 * (s'appuie sur `req.user`). Aucun rôle requis → laisse passer (l'auth suffit).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest<{ user?: AccessClaims }>();
    const user = req.user;
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException('Rôle insuffisant.');
    }
    return true;
  }
}
