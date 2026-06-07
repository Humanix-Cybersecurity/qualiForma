<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
# Valeur probante de l'émargement (P0)

Émargement à valeur probante opposable, **souverain** (Qualiopi art. L.6362-6, eIDAS, RFC 3161).
Voir aussi [ADR 0003](../adr/0003-moteur-signature-ses-eidas.md) et
[ADR 0008 — Souveraineté](../adr/0008-souverainete-services-de-confiance.md).

## Niveau juridique visé
**Signature électronique AVANCÉE (AES)** — faisceau de preuves (identité authentifiée, IP/UA,
géoloc consentie, lien au créneau) — **+ horodatage QUALIFIÉ eIDAS**. La **signature qualifiée
(QES) n'est PAS visée**. Le pack de preuve (P1) cite explicitement le niveau atteint ; le champ
`scellement_creneau.niveau` le matérialise dès le scellement.

## 1. QR code dynamique anti-fraude
- `signature_jeton` : jeton 192 bits (`base64url`) **lié au créneau (séquence = demi-journée)**,
  **TTL court** (`JETON_TTL_SECONDS`, défaut 60 s), **rotatif** (`POST /creneaux/:id/jetons`).
- Portées : `partage` (QR projeté, réutilisable pendant le TTL) ; `apprenant` (lien e-mail/SMS
  personnel, **usage unique**, lié au `user_id`).
- La signature exige aussi l'**authentification** (JWT) : le jeton atteste la présence, l'identité
  vient de l'authentification.

## 2. Scellement d'intégrité immuable
- Empreinte **SHA-256** du contenu canonique signé (par signature) + faisceau de preuves.
- **Consentement géoloc explicite** (`consentement_geoloc`, refus → 400).
- **Audit hash-chaîné** (`hash(n)=SHA-256(payload(n) ‖ hash(n-1))`), sérialisé par tenant.
- **Immuabilité SGBD** : `preuve_signature`, `audit_log` et `scellement_creneau` sont append-only —
  `GRANT` SELECT/INSERT **et** trigger `refuser_mutation()` qui bloque tout UPDATE/DELETE, même
  pour le propriétaire de la base.

## 3. Horodatage QUALIFIÉ RFC 3161 — pluggable & souverain
- Codec ASN.1 pur (`signature-engine/rfc3161.ts`) + client HTTP `TsaService`.
- **`TSA_MODE`** : `qualified` (PSCo qualifié FR — Universign/Datasure) · `internal` (dev) · `mock` (tests).
- **Garde de démarrage** : en production, l'API **refuse de démarrer** si `TSA_MODE ≠ qualified`
  (validé). Liste blanche d'hôtes optionnelle (`TSA_ALLOWED_HOSTS`).
- INTERDIT : tout prestataire US ou hors EU Trusted List.

### Optimisation coût — scellement CONSOLIDÉ par séquence
La signature **individuelle** n'utilise PAS la TSA qualifiée (horodatage serveur faisant foi).
À la clôture de la séquence, `POST /creneaux/:id/sceller` calcule l'empreinte SHA-256 de la
**feuille consolidée** (toutes les signatures du créneau, ordonnées) et obtient **UN SEUL
jeton qualifié** (`scellement_creneau`). Soit **1 horodatage qualifié par demi-journée** au lieu
d'un par signataire — coût maîtrisé sans perte de valeur probante (la chaîne d'intégrité par
signature reste vérifiable, le jeton qualifié scelle l'ensemble).

## Dépendances ajoutées (compatibilité AGPLv3)

| Dépendance | Licence | Compatibilité AGPLv3 | Justification |
| --- | --- | --- | --- |
| `@peculiar/asn1-schema` | **MIT** | ✅ | ASN.1 — permissive |
| `@peculiar/asn1-tsp` | **MIT** | ✅ | RFC 3161 (TimeStampReq/Resp) |
| `@peculiar/asn1-x509` | **MIT** | ✅ | AlgorithmIdentifier |
| `qrcode` (front) | **MIT** | ✅ | rendu QR |

Stack **Node/TS** → DSS (Java, LGPL 2.1), pyHanko (Python, MIT), digitorus (Go, BSD) ne sont pas
applicables ici ; on emploie l'équivalent **client RFC 3161 via ASN.1 open-source** (peculiar, MIT),
vers un PSCo qualifié FR. Aucune dépendance propriétaire, SSPL, BSL ni SaaS US.

## Tests
- Unitaires : hashing/canonicalisation, audit chaîné, **codec RFC 3161** (`rfc3161.spec`), vérif d'intégrité.
- Intégration (validés) : QR (valide/invalide), géoloc sans consentement → 400, immuabilité
  UPDATE/DELETE bloqués, **garde prod** (démarrage refusé si TSA non qualifiée),
  **scellement consolidé** (N signatures → 1 empreinte + 1 jeton), TSA réelle (RFC 3161).

## RGPD
Consentement géoloc tracé, minimisation, conservation preuves **10 ans** (`PREUVE_RETENTION_YEARS`),
purge automatique à câbler (P1, le *legal hold* prime).

## Note de sécurité (surface d'attaque)
- **QR** : relais à un absent atténué par TTL court + rotation ; rejeu bloqué (usage unique perso) ;
  192 bits d'entropie ; cloisonnement RLS ; identité par JWT (le jeton ne porte aucune PII).
- **Signature** : fenêtre contrôlée par le formateur ; écritures sérialisées (`pg_advisory_xact_lock`) ;
  preuve immuable (trigger) ; horodatage serveur faisant foi par signature, **qualifié au scellement**.
