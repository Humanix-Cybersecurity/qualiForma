<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
# ADR 0006 — Stockage objet MinIO + scan ClamAV + chiffrement

- **Statut** : Proposé
- **Date** : 2026-06-07

## Contexte

Souveraineté exigée (hébergement UE/France, pas de dépendance à un service US obligatoire).
Les OF déposent des documents (PDF, TXT, **ZIP**, syllabus) potentiellement malveillants. Les
artefacts probatoires doivent être intègres et conservés.

## Décision

- **Stockage objet S3-compatible**, **MinIO par défaut** (auto-hébergeable). Compatible AWS S3 /
  Scaleway / OVH Object Storage pour le SaaS souverain.
- **Chiffrement au repos** (SSE) côté stockage + chiffrement applicatif des documents sensibles ;
  TLS en transit.
- **Pipeline d'upload fail-closed** :
  1. validation de la **taille** (limite) et du **type MIME réel** (sniffing, pas l'extension) ;
  2. **scan ClamAV systématique** avant tout stockage définitif (upload en quarantaine d'abord) ;
  3. pour les **ZIP** : dézippage sécurisé — protection **anti zip-bomb** (limites de ratio/taille
     décompressée/nombre d'entrées) et **anti path-traversal** (rejet des chemins `..`/absolus) ;
  4. calcul du **checksum** (SHA-256) stocké avec l'objet ;
  5. statut `scan_status` (`pending`/`clean`/`infected`) ; un objet non `clean` n'est jamais servi.
- Scan et dézippage exécutés en **jobs BullMQ** isolés (pas dans le thread requête).

## Alternatives écartées

- **Stockage cloud US obligatoire (S3 AWS seul)** : contraire à la souveraineté. S3 reste
  *compatible* mais non imposé.
- **Scan asynchrone après mise à disposition** : fenêtre d'exposition à un fichier infecté.
  Rejeté — quarantaine avant disponibilité.
- **Confiance dans l'extension/MIME déclaré** : contournable. On vérifie le type réel.

## Conséquences

- (+) Souveraineté et auto-hébergement préservés.
- (+) Surface d'attaque uploads fortement réduite (malware, zip-bomb, traversal).
- (−) Latence de mise à disposition (temps de scan) — masquée par un état « en analyse ».
- (−) ClamAV à maintenir (signatures à jour) ; ressources mémoire pour gros fichiers.
