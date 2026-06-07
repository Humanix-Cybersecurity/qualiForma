<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
# @humanix/signature-engine — Moteur d'émargement & signature

Cœur du produit ([ADR 0003](../../docs/adr/0003-moteur-signature-ses-eidas.md)). Package isolé,
sans dépendance au framework HTTP, entièrement testé.

- **SES** par défaut + faisceau de preuves complet (horodatage serveur, IP/UA, géoloc optionnelle,
  SHA-256 du payload, audit log append-only **hash-chaîné**, lien+QR de vérification).
- Émargement indexé sur le **`Creneau` (demi-journée)**, **co-signature formateur** obligatoire,
  gestion retards/départs anticipés.
- Ports d'extension : `SignatureProvider` (→ **SEA via QTSP eIDAS**), `TimestampAuthority`
  (→ **horodatage qualifié RFC 3161 / eIDAS**).

> Squelette — implémentation à l'étape 5 (priorité produit) du [PLAN](../../PLAN.md).
