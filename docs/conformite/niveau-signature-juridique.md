<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
# Note de qualification juridique de la signature (eIDAS)

> Analyse d'ingénierie de conformité, **pas un avis juridique**. À faire valider par un·e
> juriste / le DPO. Complète [valeur-probante.md](valeur-probante.md).

## 1. Les trois niveaux eIDAS (règlement UE n° 910/2014)

| Niveau | Sigle | Exigences | Effet juridique |
| --- | --- | --- | --- |
| Simple | **SES** | Donnée associée logiquement au signataire | Recevable, non rejetée du seul fait d'être électronique (art. 25.1) |
| Avancée | **AES** | Liée uniquement au signataire, l'identifie, sous son contrôle exclusif, détecte toute modification ultérieure (art. 26) | Forte valeur probante |
| Qualifiée | **QES** | AES + dispositif qualifié (QSCD) + certificat qualifié | **Équivalente à la signature manuscrite** (art. 25.2) |

## 2. Niveau visé par la solution : **AES + horodatage qualifié**

Décision d'architecture (constante du projet) : **viser la signature AVANCÉE (AES)** assortie
d'un **horodatage QUALIFIÉ eIDAS**, **sans** viser la signature qualifiée (QES). Justification :
la QES impose un certificat qualifié par signataire et un QSCD (coût/friction incompatibles avec
l'émargement de masse), alors que l'obligation Qualiopi/OPCO porte sur la **preuve de réalisation**,
pour laquelle l'AES horodatée qualifiée est proportionnée et robuste.

### Comment les critères AES (art. 26) sont satisfaits

| Critère art. 26 | Mise en œuvre |
| --- | --- |
| (a) Liée uniquement au signataire | Émargement authentifié (compte + MFA possible), lié à `userId`/créneau, méthode tracée |
| (b) Permet d'identifier le signataire | Identité du compte, IP, user-agent, géoloc consentie, faisceau d'indices |
| (c) Sous le contrôle exclusif du signataire | Authentification individuelle ; QR dynamique anti-fraude à TTL court ; lien personnel à usage unique |
| (d) Détecte toute modification ultérieure | Empreinte SHA-256 par signature, **chaîne d'audit** `hash(n)=SHA256(payload‖hash(n-1))`, scellement **immuable** (trigger SGBD), **horodatage qualifié RFC 3161** sur la feuille consolidée |

### Horodatage qualifié
Le scellement consolidé d'une demi-journée est horodaté par un **PSCo qualifié** (TSA RFC 3161
sur la liste de confiance ANSSI/UE — Datasure/Universign par défaut). L'horodatage qualifié
bénéficie de la **présomption d'exactitude de la date et heure** (eIDAS art. 41). Le mode TSA est
*pluggable* ; les modes `internal`/`mock` sont **refusés en production**.

## 3. Optimisation et portée

- **Scellement consolidé** : un seul jeton qualifié couvre l'empreinte de toute la feuille
  d'émargement de la séquence (coût maîtrisé) — l'intégrité de chaque signature individuelle
  reste vérifiable via la chaîne d'audit incluse dans le payload consolidé.
- **Extension QES/SEA** : les ports `SignatureProvider` et `TimestampAuthority` permettent de
  passer à un cachet/scellement électronique qualifié (SEA) ou à la QES sans refonte, si un
  usage l'exige.

## 4. Ce que le pack de preuve atteste explicitement

Le pack de preuve (`ProofPack`, champ `niveau`) **cite le niveau atteint** :
> « Signature avancée (AES) + horodatage qualifié eIDAS (PSCo qualifié, liste de confiance UE) ».

Il est **vérifiable hors-ligne** par un tiers via `@humanix/proof-verifier` (recalcul des
empreintes, de la chaîne d'audit et de l'empreinte du jeton RFC 3161 ; vérification du
certificat TSA via `openssl ts -verify`).

## 5. Limites / réserves

- L'effet « équivalence manuscrite » (art. 25.2) **n'est PAS revendiqué** (réservé à la QES).
- La valeur probante de l'AES s'apprécie *in concreto* par le juge ; la robustesse du faisceau
  d'indices (authentification, horodatage qualifié, immuabilité) est l'objectif.
- La qualification du PSCo d'horodatage doit être vérifiée sur la liste de confiance en vigueur.
