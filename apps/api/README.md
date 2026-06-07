<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
# apps/api — API NestJS

Backend NestJS : modules fonctionnels (admin OF, formateur, apprenant, super-admin),
validation, **RBAC**, **MFA TOTP**, middleware **tenant + RLS** ([ADR 0002](../../docs/adr/0002-isolation-multi-tenant-rls.md)),
jobs BullMQ (PDF, scan ClamAV, horodatage, notifications), audit log hash-chaîné.

Consomme `@humanix/domain`, `@humanix/signature-engine`, `@humanix/pdf-templates`.

> Squelette — implémentation à partir de l'étape 2 du [PLAN](../../PLAN.md).
