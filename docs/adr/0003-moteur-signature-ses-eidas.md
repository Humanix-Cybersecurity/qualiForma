<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
# ADR 0003 — Moteur de signature SES + faisceau de preuves, extension SEA/QTSP

- **Statut** : Proposé
- **Date** : 2026-06-07

## Contexte

Cœur du produit. L'émargement doit être opposable pour OPCO/DGEFP. Le niveau requis pour
l'émargement est une **Signature Électronique Simple (SES)** — sa valeur probante dépend
**entièrement du faisceau de preuves** qui l'entoure. Les conventions/contrats peuvent exiger
plus tard une **Signature Électronique Avancée (SEA)** via un **QTSP eIDAS**.

## Décision

Package isolé et testé **`packages/signature-engine`**, sans dépendance au framework HTTP.

### Maille & règles métier
- Émargement indexé sur le **`Creneau` (demi-journée)**, jamais une « session » libre.
- **Co-signature formateur obligatoire** par créneau.
- Gestion des **retards / départs anticipés** (heures réelles de présence).
- Le formateur **ouvre** la fenêtre de signature ; l'apprenant signe via **code**, **QR code** ou
  **tracé manuscrit** tactile.

### Faisceau de preuves (capturé à chaque émargement)
- **Horodatage serveur faisant foi** (NTP) ; l'horodatage client est indicatif.
- IP, user-agent/device, **géoloc optionnelle** (consentement explicite).
- Empreinte **SHA-256** du payload signé (identité + créneau + contenu).
- Entrée d'**audit log append-only hash-chaînée** : `hash(n) = SHA-256(payload(n) ‖ hash(n-1))`.
- **Lien de vérification d'authenticité** (URL + QR) apposé sur le PDF généré.

### Interfaces d'extension (ports)
```ts
interface SignatureProvider {            // SES par défaut ; impl. QTSP → SEA pour conventions
  readonly level: 'SES' | 'SEA';
  sign(payload: SignaturePayload): Promise<SignatureResult>;
  verify(result: SignatureResult): Promise<VerificationReport>;
}
interface TimestampAuthority {           // horodatage serveur par défaut ; impl. RFC 3161/eIDAS
  stamp(digest: Uint8Array): Promise<TimestampToken>;
}
```
La présomption d'exactitude est renforcée en branchant un **horodatage qualifié RFC 3161 /
eIDAS** (`TSA_ENABLED=true`) sans changer le code métier.

### Conservation
- **≥ 4 ans**, archivage type coffre-fort (intégrité garantie).
- **`legal hold`** sur les preuves : empêche l'effacement RGPD des données probatoires
  (voir conformité RGPD).

## Alternatives écartées

- **SEA d'emblée pour l'émargement** : surdimensionné, coûteux (QTSP par signature), non requis
  par la réglementation pour l'émargement. SEA réservée aux conventions/contrats via le port.
- **Horodatage client** comme référence : non opposable. Le serveur fait foi.
- **Audit non chaîné** (simple journal) : ne prouve pas l'absence d'altération a posteriori.

## Conséquences

- (+) Opposabilité bâtie sur des preuves vérifiables, pas sur le « niveau » de signature seul.
- (+) Bascule SES→SEA et horodatage qualifié sans réécriture (inversion de dépendances).
- (−) Le chaînage d'audit impose une écriture sérialisée par tenant (ordre garanti) — à gérer
  via une file/verrou par tenant.
- (−) Le `legal hold` complexifie le workflow d'effacement RGPD : règles d'arbitrage à documenter.
