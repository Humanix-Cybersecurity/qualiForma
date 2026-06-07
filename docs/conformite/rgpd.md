<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
# RGPD — registre & mesures

> Bonnes pratiques encodées, **pas un avis juridique**. À valider avec le DPO / un·e juriste.

## Registre des traitements (extrait)

| Traitement | Finalité | Base légale | Données | Conservation |
| --- | --- | --- | --- | --- |
| Comptes utilisateurs | Authentification, RBAC | Contrat / intérêt légitime | email, nom, rôle, hash mdp, secret MFA (chiffré) | Durée du compte + purge |
| **Émargement / preuves** | Preuve de réalisation (Qualiopi, OPCO) | Obligation légale | identité, créneau, horodatage, IP/UA, géoloc (consentie) | **≥ 4 ans (legal hold)** |
| Questionnaires | Positionnement, satisfaction | Intérêt légitime / consentement | réponses (agrégées en restitution) | Durée utile + anonymisation |
| Documents | Mise à disposition pédagogique | Contrat | fichiers (chiffrés au repos) | Durée de la session + archivage |
| Journal d'audit | Sécurité, traçabilité | Obligation légale / intérêt légitime | action, acteur, IP/UA, hash | ≥ 4 ans |

## Droits des personnes

- **Accès / portabilité** : `GET /rgpd/me/export` (JSON structuré).
- **Effacement** : `POST /rgpd/users/:id/anonymiser` (admin OF) → **pseudonymisation**.
  Les données probatoires (émargements, preuves, audit) sont **conservées** sous *legal hold*
  (≥ 4 ans) ; l'identité est effacée et les sessions révoquées.
- **Rectification** : édition du profil (à exposer côté admin).
- **Consentement** explicite pour la géolocalisation d'émargement.

## Mesures techniques

- Minimisation (champs strictement nécessaires), pseudonymisation pour les statistiques.
- Chiffrement au repos (objets MinIO/SSE, secret MFA AES-256-GCM) et en transit (TLS).
- Isolation multi-tenant par RLS PostgreSQL (cf. [ADR 0002](../adr/0002-isolation-multi-tenant-rls.md)).
- Hébergement UE/France (souveraineté). DPA à fournir aux clients.
- Durées de conservation paramétrables (`PREUVE_RETENTION_YEARS`).
