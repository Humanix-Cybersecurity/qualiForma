<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
# ADR 0005 — Émargement offline-first, horodatage serveur faisant foi

- **Statut** : Proposé
- **Date** : 2026-06-07

## Contexte

L'émargement se fait souvent en salle ou en visio avec **connexion dégradée**. Apprenant·e·s et
formateur·ice·s doivent pouvoir signer malgré tout, sans perdre ni dupliquer de preuve, et sans
permettre la falsification de l'heure réelle.

## Décision

- **PWA** (Workbox) avec **file d'attente offline** pour les émargements : la signature est
  capturée localement puis synchronisée à la reconnexion.
- **Synchronisation idempotente** : chaque tentative porte une clé d'idempotence
  (`creneau_id` + `user_id` + nonce client). Le serveur déduplique → un rejeu réseau ne crée pas
  de doublon.
- **Horodatage serveur faisant foi** : l'heure de référence opposable est posée **à la réception
  serveur** (voir ADR 0003). L'horodatage local est conservé comme **indicatif** dans le faisceau
  de preuves (utile pour expliquer un écart, jamais comme référence).
- La fenêtre de signature reste ouverte/fermée selon l'état décidé par le formateur ; en offline,
  le client applique l'état connu le plus récent et marque l'entrée « à confirmer » jusqu'à sync.
- Conflits (ex. créneau clôturé côté serveur entre-temps) : résolution **côté serveur**, l'entrée
  est horodatée et tracée, jamais silencieusement écrasée.

## Alternatives écartées

- **Online strict** : inacceptable au regard du terrain (salles sans réseau).
- **Horodatage client faisant foi** : non opposable, falsifiable. Rejeté.
- **Sync « last-write-wins » naïve** : risque de perte/écrasement de preuves. Rejeté au profit de
  l'idempotence + arbitrage serveur.

## Conséquences

- (+) Continuité de service en conditions dégradées sans compromettre l'intégrité probatoire.
- (+) Pas de doublons à la reconnexion.
- (−) Complexité : gestion de file, clés d'idempotence, état « à confirmer », UX hors-ligne
  accessible (ADR 0004).
- (−) Capacitor : valider l'accès au stockage local persistant et à la file en natif iOS/Android.
