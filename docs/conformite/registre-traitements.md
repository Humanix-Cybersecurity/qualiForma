<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
# Registre des activités de traitement (RGPD art. 30)

> Modèle versionné, **pas un avis juridique**. À adapter et valider par le DPO de chaque
> organisme de formation (responsable de traitement) et de l'éditeur (sous-traitant le cas échéant).
> Complète [rgpd.md](rgpd.md).

## Rôles

- **Responsable de traitement** : l'organisme de formation (OF) client (multi-tenant).
- **Sous-traitant** (au sens art. 28) : l'hébergeur de la solution + sous-traitants ultérieurs
  listés dans [sous-traitance-dpa.md](sous-traitance-dpa.md). En auto-hébergement souverain,
  l'OF cumule les deux rôles.

## Fiches de traitement

### T1 — Gestion des comptes & authentification
- **Finalité** : identification, contrôle d'accès (RBAC), MFA.
- **Base légale** : exécution du contrat (art. 6.1.b) ; sécurité = intérêt légitime (6.1.f).
- **Personnes** : personnels OF, formateurs, apprenants.
- **Données** : e-mail, nom/prénom, rôle, hash de mot de passe (argon2id), secret TOTP chiffré (AES-256-GCM).
- **Destinataires** : administrateurs du tenant.
- **Conservation** : durée de la relation + purge à la clôture du compte.
- **Transferts hors UE** : aucun.

### T2 — Émargement & preuves de réalisation *(traitement central)*
- **Finalité** : preuve d'assiduité/réalisation (Qualiopi RNQ ind. 11/13, financement OPCO/CPF, art. L.6362-6).
- **Base légale** : obligation légale (art. 6.1.c) + intérêt légitime probatoire.
- **Personnes** : apprenants, formateurs.
- **Données** : identité, créneau (demi-journée), horodatage serveur, **horodatage qualifié eIDAS**
  au scellement, méthode de signature, IP, user-agent, **géolocalisation** (uniquement si consentie),
  empreintes/chaîne d'audit (SHA-256).
- **Destinataires** : OF, financeurs sur demande, autorités de contrôle.
- **Conservation** : **legal hold ≥ 4 ans** (paramétrable `PREUVE_RETENTION_YEARS`, défaut 10 ans) ;
  immuabilité garantie par trigger SGBD (UPDATE bloqué, DELETE bloqué avant échéance).
- **Mesures spécifiques** : signature **avancée (AES)** + horodatage **qualifié** ; voir
  [niveau-signature-juridique.md](niveau-signature-juridique.md).

### T3 — Questionnaires (positionnement / satisfaction)
- **Finalité** : adaptation pédagogique, amélioration continue (Qualiopi ind. 30/31).
- **Base légale** : intérêt légitime ; consentement pour les verbatims nominatifs.
- **Données** : réponses, échelles, verbatims.
- **Conservation** : durée utile puis **anonymisation** (restitutions agrégées conservées).

### T4 — Documents pédagogiques & administratifs
- **Finalité** : mise à disposition (convention, convocation, programme, RI, attestations).
- **Base légale** : exécution du contrat / obligation légale.
- **Données** : fichiers (chiffrés au repos, antivirus à l'upload).
- **Conservation** : durée de la session + archivage légal.

### T5 — Réclamations & actions correctives
- **Finalité** : traitement des réclamations (Qualiopi ind. 31).
- **Base légale** : obligation légale / intérêt légitime.
- **Conservation** : durée de traitement + archivage.

### T6 — Journal d'audit & sécurité
- **Finalité** : traçabilité, détection d'incident, valeur probante.
- **Base légale** : obligation légale / intérêt légitime.
- **Données** : action, acteur, IP, user-agent, hash chaîné.
- **Conservation** : ≥ 4 ans, immuable.

### T7 — Notifications (e-mail / SMS)
- **Finalité** : convocations, relances d'émargement, informations de session.
- **Base légale** : exécution du contrat.
- **Sous-traitants** : opérateurs **FR/UE uniquement** (Brevo, OVH, Octopush) — voir DPA.
- **Données transmises** : e-mail/téléphone, contenu transactionnel. Pas de prospection.

### T8 — Facturation / abonnement (si activé)
- **Finalité** : gestion de l'abonnement SaaS (Plan/Subscription/Quota).
- **Base légale** : exécution du contrat / obligation comptable.
- **Conservation** : durée légale comptable (10 ans).

## Durées de conservation — synthèse

| Donnée | Durée | Mécanisme |
| --- | --- | --- |
| Compte | Vie du compte + purge | Anonymisation / suppression |
| Preuves d'émargement | ≥ 4 ans (défaut 10) | Legal hold + trigger immuabilité + purge RGPD planifiée |
| Audit | ≥ 4 ans | Idem |
| Questionnaires | Durée utile | Anonymisation |
| Facturation | 10 ans | Obligation comptable |

## Droits des personnes
Voir [rgpd.md](rgpd.md) : accès/portabilité (`GET /rgpd/me/export`), effacement par
pseudonymisation (`POST /rgpd/users/:id/anonymiser`, preuves conservées sous legal hold),
rectification (profil), retrait du consentement géolocalisation.
