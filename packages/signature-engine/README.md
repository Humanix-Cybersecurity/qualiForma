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

## API

```ts
import { SignatureEngine, verifyChain, evaluateCreneauCompletude } from '@humanix/signature-engine';

const engine = new SignatureEngine(); // SES + horodatage serveur par défaut
const proof = await engine.sign(emargementInput, { prevAuditHash });   // → ProofRecord
engine.verify(proof, payload);          // intégrité contenu + maillon d'audit
verifyChain(entries);                   // intégrité de toute la chaîne
```

- **Déterministe & testable** : horloge, générateur de jeton, `SignatureProvider` et
  `TimestampAuthority` sont injectables. 24 tests unitaires.
- **Pur** : aucune dépendance base de données ni réseau (node:crypto uniquement).
- Bascule **SES → SEA** et **horodatage serveur → RFC 3161** par simple injection, sans
  toucher au moteur.

> ✅ Implémenté (étape 5). L'intégration API (persistance PreuveSignature + chaîne d'audit
> par tenant + endpoints d'émargement) arrive avec le mode formateur (étape 6).
