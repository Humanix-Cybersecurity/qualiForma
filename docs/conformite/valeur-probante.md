<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
# Valeur probante de l'émargement (P0)

Renforce l'émargement vers une valeur probante opposable (Qualiopi, art. L.6362-6, eIDAS,
RFC 3161). Trois briques livrées. Voir aussi [ADR 0003](../adr/0003-moteur-signature-ses-eidas.md).

## 1. QR code dynamique anti-fraude
- Modèle `signature_jeton` : jeton aléatoire (192 bits, `base64url`) **lié au créneau (séquence
  = demi-journée)**, **TTL court** (`JETON_TTL_SECONDS`, défaut 60 s), **rotatif** (régénéré par le
  formateur côté écran via `POST /creneaux/:id/jetons`).
- Deux portées : `partage` (QR projeté, réutilisable pendant le TTL) et `apprenant` (lien e-mail
  personnel, **usage unique** via `used_at`, lié au `user_id`).
- L'URL du QR pointe vers l'écran de signature de l'app avec `?jeton=…`. La signature exige en plus
  l'**authentification** de l'apprenant (le jeton prouve la présence, l'identité vient du JWT).
- Validation à la signature : présence, liaison au créneau, non-expiration, usage unique (personnel).

## 2. Scellement d'intégrité (immuabilité)
- Empreinte **SHA-256** du contenu canonique signé (identité + créneau + méthode + horodatage),
  via `@humanix/signature-engine`.
- Faisceau de preuves : IP, user-agent, géoloc **avec consentement explicite** (`consentement_geoloc`,
  refus = 400), horodatage serveur faisant foi, horodatage client indicatif.
- **Audit hash-chaîné** : `hash(n) = SHA-256(payload(n) ‖ hash(n-1))`, sérialisé par tenant.
- **Immuabilité au niveau SGBD** : `preuve_signature` et `audit_log` sont append-only — `GRANT`
  SELECT/INSERT seulement **et** trigger PostgreSQL `refuser_mutation()` qui lève sur tout
  UPDATE/DELETE, **même pour le propriétaire** (cf. `prisma/sql/rls-policies.sql`).

## 3. Horodatage qualifié RFC 3161 / eIDAS
- Client RFC 3161 réel (codec ASN.1 pur `signature-engine/rfc3161.ts` : `TimeStampReq`/`TimeStampResp`,
  empreinte SHA-256, `certReq`, politique optionnelle) + requête HTTP `application/timestamp-query`
  dans `TsaService`. Jeton (`TimeStampToken` CMS) stocké en base64 dans `preuve_signature.horodatage_token`.
- **Configurable** : `TSA_ENABLED`, `TSA_URL`, `TSA_POLICY_OID`.
- **Mode dégradé documenté** : si `TSA_ENABLED=false`, horodatage **serveur** (NTP) faisant foi,
  `horodatage_type = serveur`, sans jeton qualifié. Bascule sans changement de code applicatif.

## Dépendances ajoutées (compatibilité AGPLv3)

| Dépendance | Version | Licence | Compatibilité AGPLv3 |
| --- | --- | --- | --- |
| `@peculiar/asn1-schema` | ^2.7 | **MIT** | ✅ permissive, compatible |
| `@peculiar/asn1-tsp` | ^2.7 | **MIT** | ✅ permissive, compatible |
| `@peculiar/asn1-x509` | ^2.7 | **MIT** | ✅ permissive, compatible |
| `qrcode` (front, rendu QR) | ^1.5 | **MIT** | ✅ permissive, compatible |

Aucune dépendance propriétaire, SSPL ou BSL. MIT est compatible avec une distribution AGPLv3.

## Tests
- Unitaires : hashing & canonicalisation (`hash.spec`), audit chaîné (`audit-chain.spec`),
  **codec RFC 3161** (`rfc3161.spec`), vérification d'intégrité (`engine.spec`).
- Intégration (validée en exécution) : `ouvrir → jeton QR → signer → preuve → /verification`
  (recalcul d'empreinte) ; **TSA réelle** (freeTSA) → `horodatage_type=rfc3161` + jeton stocké ;
  jeton invalide/expiré → 400 ; géoloc sans consentement → 400 ; UPDATE/DELETE preuve → bloqué.

## RGPD
- Consentement géoloc explicite et tracé. Minimisation (seules les métadonnées probantes).
- Conservation des preuves **10 ans** par défaut (`PREUVE_RETENTION_YEARS`). Purge automatique :
  job à câbler (P1) ; le *legal hold* prime (cf. [rgpd.md](rgpd.md)).

## Note de sécurité — surface d'attaque

**QR dynamique**
- *Relais/partage de QR à un absent* → atténué par le **TTL court** (60 s) + rotation : un cliché
  expire avant exploitation à distance. Le jeton ne porte aucune donnée personnelle.
- *Rejeu* → jeton personnel **à usage unique** ; jeton partagé borné au créneau et au TTL.
- *Devinette* → 192 bits d'entropie (`randomBytes(24)`), non séquentiel.
- *Fuite inter-tenant* → `signature_jeton` porte `tenant_id` et passe la **RLS** ; validation
  vérifie la liaison au créneau du tenant courant.
- *Usurpation d'identité* → la signature exige l'**authentification** (JWT) ; le jeton ne se
  substitue pas à l'identité, il atteste la présence.

**Flux de signature**
- Fenêtre de signature ouverte/fermée par le formateur (contrôle temporel).
- Écritures sérialisées par tenant (`pg_advisory_xact_lock`) → chaîne d'audit linéaire fiable.
- Preuve **immuable** (trigger + GRANT) → pas d'altération a posteriori, même par un administrateur DB.
- Horodatage **serveur faisant foi** (jamais le client), renforcé par RFC 3161 quand configuré.
- Idempotence de la signature (unique `(créneau, utilisateur)`) → pas de doublon en cas de rejeu réseau.
