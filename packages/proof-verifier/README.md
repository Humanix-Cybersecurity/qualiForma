<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
# @humanix/proof-verifier

Vérifieur **hors-ligne** et **open-source (AGPLv3)** d'un pack de preuve d'émargement Humanix.
Permet à un auditeur (DREETS, OPCO, certificateur) de revalider, sans accès au serveur :

- les empreintes **SHA-256** de chaque signature et de la feuille consolidée ;
- la **chaîne d'audit** (hash-chaînage) ;
- l'**empreinte horodatée** par la TSA (RFC 3161) == empreinte consolidée.

## Usage
```bash
# via le dépôt
pnpm --filter @humanix/proof-verifier build
node packages/proof-verifier/dist/cli.js preuve.json

# ou publié
npx @humanix/proof-verifier preuve.json
```
Code de sortie `0` = pack authentique, `1` = altéré.

## Vérification du certificat de la TSA (complément)
La validation cryptographique du certificat de la TSA et de son ancrage sur l'EU Trusted List
se fait avec OpenSSL sur le jeton `horodatage.tsr` du pack :
```bash
openssl ts -reply -in horodatage.tsr -token_in -text
openssl ts -verify -digest <sha256_consolidé> -in horodatage.tsr -token_in -CAfile chaine_tsa.pem
```
