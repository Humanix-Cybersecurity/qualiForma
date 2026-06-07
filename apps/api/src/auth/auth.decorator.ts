// SPDX-License-Identifier: AGPL-3.0-or-later
import { applyDecorators, UseGuards } from '@nestjs/common';
import type { Role } from '@humanix/domain';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { JwtAuthGuard } from './jwt-auth.guard';

/**
 * Protège un handler/contrôleur : authentification JWT puis (optionnel) contrôle de rôle.
 * L'ordre des guards garantit que `req.user` est posé par JwtAuthGuard avant RolesGuard.
 *
 *   @Auth()                       → authentifié, tout rôle
 *   @Auth('admin_of')             → authentifié + rôle admin_of
 *   @Auth('admin_of', 'formateur')→ authentifié + un de ces rôles
 */
export function Auth(...roles: Role[]) {
  return applyDecorators(UseGuards(JwtAuthGuard, RolesGuard), Roles(...roles));
}
