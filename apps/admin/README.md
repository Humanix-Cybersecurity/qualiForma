<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
# apps/admin — Back-office super-admin SaaS

Espace `super_admin` (exploitation SaaS Humanix) : onboarding tenants, plans, quotas, facturation
SaaS, supervision, conformité *data residency*.

> **Frontière de licence** ([ADR 0007](../../docs/adr/0007-licence-agplv3-et-modele-saas.md)) :
> la logique purement *exploitation commerciale* (facturation Humanix, métrologie) est un **module
> séparé** ; le cœur AGPL doit fonctionner sans elle (un OF auto-hébergé n'a pas besoin de cet espace).
> À l'étape 10, arbitrer : app dédiée vs rôle dans `web`.

> Squelette — implémentation à l'étape 10 du [PLAN](../../PLAN.md).
