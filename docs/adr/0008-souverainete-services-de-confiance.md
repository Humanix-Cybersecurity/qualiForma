<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
# ADR 0008 — Souveraineté & services de confiance

- **Statut** : Proposé
- **Date** : 2026-06-07

## Contexte

Contrainte de souveraineté bloquante : services de confiance qualifiés **français/UE**, aucune
dépendance à un prestataire **US** ni à un service hors **EU Trusted List**. Niveau juridique
cible : **signature avancée (AES) + horodatage qualifié eIDAS** (pas la QES).

## Décision

### Horodatage (TSA)
- Horodatage **qualifié eIDAS** via un PSCo **français** inscrit sur la liste de confiance
  ANSSI / EU Trusted List. Cibles par défaut : **Universign**, **Datasure** (clients RFC 3161).
- **Pluggable** par config `TSA_MODE` : `qualified` (prod) · `internal` (dev) · `mock` (tests).
  L'API **refuse de démarrer en production** si le mode n'est pas `qualified` (`TsaService`).
  Liste blanche d'hôtes optionnelle (`TSA_ALLOWED_HOSTS`).
- **Interdit** : DocuSign US, Adobe Sign US, ou tout service non inscrit sur l'EU Trusted List.
- **Optimisation coût** : un seul jeton qualifié par **séquence (demi-journée)** scelle la feuille
  d'émargement consolidée, pas chaque signature (cf. `scellement_creneau`).

### Librairies (compatibles AGPLv3)
- Stack Node/TS → client **RFC 3161 via ASN.1 open-source** (`@peculiar/asn1-tsp`/`-schema`/`-x509`,
  MIT). Alternatives selon stack : **DSS** (Java, LGPL 2.1), **pyHanko** (Python, MIT),
  **digitorus** (Go, BSD) — toutes OSI et AGPLv3-compatibles.
- Aucune dépendance propriétaire, SSPL, BSL ni SaaS US.

### Infrastructure & composants
- Hébergement **France** : **Scaleway** ; cible **SecNumCloud** documentée pour clients sensibles.
- Base : **PostgreSQL**. Stockage objet : **MinIO** ou **Garage** (AGPLv3) en **WORM / object-lock**
  (rétention immuable des preuves), ou stockage objet FR avec rétention. Émargements/preuves : la
  rétention objet complète l'immuabilité applicative (triggers SGBD).
- **E-mail / SMS** : opérateurs **FR** uniquement — **Brevo**, **OVH SMS**, **Octopush**.
  Interdits : Twilio, SendGrid. Intégration via un port `NotificationProvider` (à brancher, P1).

### Niveau juridique
- **AES + horodatage qualifié**. Le pack de preuve et `scellement_creneau.niveau` citent le niveau
  atteint. La QES n'est pas visée (coût/UX disproportionnés pour l'émargement).

## Alternatives écartées
- TSA/signature US (DocuSign, Adobe Sign) : non souverain, hors cadre. Rejeté.
- Horodatage interne seul en production : non opposable comme « qualifié ». Réservé au dev,
  bloqué au démarrage en prod.
- Un jeton qualifié par signature : coût TSA disproportionné. Rejeté au profit du scellement consolidé.

## Conséquences
- (+) Conformité souveraineté ; coût TSA maîtrisé ; bascule de PSCo sans changement de code.
- (+) Refus de démarrage en prod si configuration non conforme (fail-safe).
- (−) Dépendance opérationnelle à un PSCo FR (contrat, quotas) — atténuée par le port pluggable.
- (−) E-mail/SMS et stockage WORM : intégrations à finaliser (P1) ; ports prévus.
