<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
# Facturation électronique (N3) & financeurs / dématérialisation (N9)

État : **socles livrés**, branchements externes documentés (dépendent d'identifiants/accès
non disponibles en environnement de développement). 100 % souverain, OSI.

## N3 — Facturation électronique (Factur-X / Chorus Pro / PDP)

### Livré
- **Génération du XML Factur-X** (profil **MINIMUM**, EN 16931 / Factur-X 1.0) à partir de
  chaque facture : `buildFacturXXml()` (`@humanix/pdf-templates`).
- **PDF hybride** : le `factur-x.xml` est **embarqué en pièce jointe** du PDF de facture
  (`PdfBuilder.attachFile`, relation AF *Alternative*).
- **Endpoint** `GET /factures/:id/factur-x.xml` + bouton « Factur-X » dans l'UI.

### À brancher (réforme 2026)
1. **Conformité PDF/A-3** complète : métadonnées XMP Factur-X, profil colorimétrique (sRGB),
   `OutputIntent`. pdf-lib embarque déjà le fichier ; il reste à poser le XMP + l'OutputIntent.
2. **Profils BASIC / EN16931** : enrichir le XML (lignes détaillées, ventilation TVA par taux,
   identifiants SIRET/TVA, adresses). Le générateur est isolé et extensible.
3. **Dépôt sur une PDP** (Plateforme de Dématérialisation Partenaire) ou le PPF : connecteur
   HTTP à implémenter (API de la PDP retenue). **Point d'extension** : `interface EInvoiceSink`
   à créer (méthode `submit(facturX: Buffer): Promise<{ id: string }>`), pluggable par config,
   sur le modèle de la TSA (`qualified | internal | mock`).
4. **Chorus Pro** (secteur public B2G) : dépôt via l'API Chorus Pro (requiert un compte +
   certificat). Même point d'extension `EInvoiceSink`.

> Aucune dépendance US : Factur-X est un standard franco-allemand ; les PDP retenues sont
> françaises/UE.

## N9 — Financeurs / dématérialisation (OPCO, EDOF/CPF, Kairos)

### Livré
- **Typage du financeur** sur l'inscription et la facture (`Financeur` : entreprise, OPCO,
  particulier, France Travail, CPF/CDC, région, État, autre OF, autre).
- **BPF** ventilé par financeur + **export comptable CSV** (base de saisie / rapprochement).

### À brancher (API externes, accès restreint)
| Cible | Usage | Accès requis |
| --- | --- | --- |
| **EDOF** (CDC / Mon Compte Formation) | Catalogue CPF, entrées en formation, service fait | Habilitation EDOF + API EDESS |
| **Kairos** (France Travail) | Entrées/sorties demandeurs d'emploi | Convention + accès Kairos |
| **OPCO** | Subrogation, dépôt des pièces, NPEC (apprentissage) | Comptes OPCO (11 OPCO) |

**Point d'extension** : `interface FinanceurConnector { exporterEntrees(sessionId): Promise<…>;
declarerServiceFait(inscriptionId): Promise<…> }`, une implémentation par financeur, activée
par configuration. Les données nécessaires (financeur, heures réalisées, preuves d'émargement
scellées) sont déjà disponibles dans le modèle. L'**émargement signé + horodaté qualifié**
constitue la pièce probante du *service fait* — c'est notre différenciateur.

> Ces connecteurs ne sont pas vérifiables sans habilitations officielles ; ils sont conçus
> comme adaptateurs isolés pour ne pas alourdir le cœur AGPL.
