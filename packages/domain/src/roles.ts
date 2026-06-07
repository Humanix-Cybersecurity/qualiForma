// SPDX-License-Identifier: AGPL-3.0-or-later
import { z } from 'zod';

/**
 * Rôles RBAC du produit. `super_admin` opère au niveau SaaS (cross-tenant via un rôle
 * PostgreSQL dédié et audité — jamais via le rôle applicatif courant, cf. ADR 0002).
 */
export const ROLES = [
  'super_admin',
  'admin_of',
  'formateur',
  'apprenant',
  'referent_handicap',
] as const;

export const roleSchema = z.enum(ROLES);
export type Role = (typeof ROLES)[number];

/** Rôles internes à un tenant (organisme de formation). Exclut le super-admin SaaS. */
export const TENANT_ROLES = ROLES.filter((r) => r !== 'super_admin') as Exclude<
  Role,
  'super_admin'
>[];

export function isRole(value: unknown): value is Role {
  return roleSchema.safeParse(value).success;
}
