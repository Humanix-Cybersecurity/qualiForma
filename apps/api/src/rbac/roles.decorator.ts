// SPDX-License-Identifier: AGPL-3.0-or-later
import { SetMetadata } from '@nestjs/common';
import type { Role } from '@humanix/domain';

export const ROLES_KEY = 'rbac:roles';

/** Restreint l'accès d'un handler/contrôleur aux rôles indiqués. Combiné à JwtAuthGuard. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
