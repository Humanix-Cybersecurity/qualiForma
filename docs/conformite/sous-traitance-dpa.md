<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
# Sous-traitance & accord de traitement des données (DPA — RGPD art. 28)

> Modèle versionné, **pas un avis juridique**. À contractualiser entre le responsable de
> traitement (organisme de formation) et chaque sous-traitant.

## 1. Principe de souveraineté

La solution est conçue pour fonctionner **sans aucun service obligatoire hors UE**. Tous les
sous-traitants par défaut sont établis en **France/UE** et soumis au RGPD sans recours aux
clauses contractuelles types pour transfert hors UE. **Aucun transfert de données vers les
États-Unis** n'est requis par le socle.

## 2. Registre des sous-traitants (ultérieurs)

| Sous-traitant | Rôle | Localisation | Données | Garanties |
| --- | --- | --- | --- | --- |
| **Scaleway** (cible SecNumCloud) | Hébergement infra/DB/stockage | France | Toutes (chiffrées) | RGPD, ISO 27001, cible SecNumCloud |
| **Brevo** (ex-Sendinblue) | Envoi e-mails transactionnels | France/UE | E-mail, contenu transactionnel | RGPD, DPA fournisseur |
| **OVHcloud** | (Option) e-mail / hébergement | France/UE | E-mail | RGPD, SecNumCloud (gammes dédiées) |
| **Octopush** | Envoi SMS | France/UE | Téléphone, contenu | RGPD, DPA fournisseur |
| **Datasure / Universign** | Horodatage **qualifié eIDAS** (TSA RFC 3161) | France/UE | Empreinte SHA-256 (jamais de données personnelles en clair) | **PSCo qualifié** liste de confiance ANSSI/UE |
| PSP européen (option facturation) | Encaissement | UE | Données de paiement | DPA, PCI-DSS |

> ⚠️ **Interdits** : DocuSign US, Adobe Sign US, Twilio, SendGrid, ou tout service non inscrit
> sur la liste de confiance eIDAS de l'UE. L'horodatage `internal`/`mock` est **refusé au
> démarrage en production** (cf. `TsaService`).

## 3. Données transmises à la TSA

Le service d'horodatage ne reçoit qu'une **empreinte cryptographique (SHA-256)** de la feuille
d'émargement consolidée — **aucune donnée personnelle** ne quitte le système vers la TSA. Le
jeton RFC 3161 retourné est stocké de façon immuable dans la preuve.

## 4. Obligations du sous-traitant (clauses art. 28)

- Traiter sur **instruction documentée** du responsable, pour les seules finalités convenues.
- **Confidentialité** des personnes habilitées.
- **Sécurité** (art. 32) : chiffrement, contrôle d'accès, journalisation.
- **Sous-traitance ultérieure** soumise à autorisation écrite préalable.
- **Assistance** aux droits des personnes et aux notifications de violation (≤ 72 h).
- **Sort des données** en fin de contrat : restitution puis suppression certifiée.
- **Audit** : mise à disposition des éléments de conformité.

## 5. Hébergement & WORM

- Stockage des preuves en **object-lock / WORM** (MinIO ou Garage, AGPLv3) avec rétention,
  ou stockage objet FR équivalent.
- Chiffrement au repos (SSE/KMS) et en transit (TLS).
- Localisation des données : **France** (zone Scaleway), cible **SecNumCloud**.
