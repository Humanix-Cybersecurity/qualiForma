<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
# Conditions générales d'utilisation (CGU)

> Modèle à adapter par l'exploitant. **Pas un avis juridique.** Champs `{{…}}` à renseigner.
> Version : {{version}} — En vigueur le : {{date}}.

## 1. Objet
Les présentes CGU régissent l'accès et l'usage de la plateforme **{{nom_plateforme}}** de suivi
de formation et d'émargement électronique, éditée par {{raison_sociale}} (« l'Éditeur »).

## 2. Définitions
- **Organisme de formation (OF)** : client responsable de traitement, administrant un espace (tenant).
- **Utilisateur** : personne disposant d'un compte (admin OF, formateur, apprenant, référent handicap).
- **Émargement** : signature électronique de présence par demi-journée.
- **Preuve** : feuille consolidée scellée et horodatée de façon qualifiée.

## 3. Accès et comptes
- L'accès requiert un compte nominatif. L'Utilisateur garantit l'exactitude de ses informations.
- L'authentification est individuelle ; le MFA (TOTP) est recommandé. Le partage d'identifiants
  est interdit.
- L'isolation des espaces (tenants) est assurée techniquement (RLS PostgreSQL).

## 4. Émargement et valeur probante
- L'émargement vaut signature **avancée (AES)** au sens eIDAS, complétée d'un **horodatage
  qualifié** au scellement (voir [note de qualification](../conformite/niveau-signature-juridique.md)).
- L'Utilisateur s'engage à n'émarger que pour **lui-même** et seulement s'il est **réellement
  présent**. Toute fraude (usurpation, partage de QR/lien) engage sa responsabilité et peut
  constituer une faute, voire une infraction.
- Les preuves sont **immuables** et conservées sous *legal hold* (≥ 4 ans, défaut 10 ans).

## 5. Obligations des utilisateurs
- Usage licite et conforme à la destination de la plateforme.
- Pas d'atteinte à la sécurité (intrusion, contournement, extraction massive).
- Respect des droits des tiers et de la confidentialité des données auxquelles l'accès est donné.

## 6. Disponibilité et maintenance
La plateforme est fournie « en l'état » dans les limites de l'engagement de service souscrit.
Des interruptions pour maintenance peuvent survenir, avec information préalable quand possible.

## 7. Données personnelles
Le traitement des données est décrit dans la politique de confidentialité et le
[registre des traitements](../conformite/registre-traitements.md). L'Utilisateur dispose des
droits d'accès, rectification, effacement (pseudonymisation des données probatoires conservées),
portabilité et opposition.

## 8. Propriété intellectuelle
- Le logiciel est distribué sous **AGPL-3.0-or-later** ; le code source est mis à disposition.
- Les contenus déposés par l'OF/les Utilisateurs restent leur propriété ; ils concèdent à
  l'Éditeur les droits strictement nécessaires à l'exploitation du service.

## 9. Responsabilité
L'Éditeur ne saurait être tenu responsable des contenus publiés par les OF ni d'un usage non
conforme. La responsabilité de l'Éditeur est limitée aux dommages directs et prévisibles, dans
les limites légales.

## 10. Souveraineté et sous-traitance
Les données sont hébergées en **France/UE**. Aucun transfert hors UE n'est requis. La liste des
sous-traitants figure dans le [DPA](../conformite/sous-traitance-dpa.md).

## 11. Modification des CGU
L'Éditeur peut modifier les CGU ; les Utilisateurs sont informés et la version applicable est
horodatée. La poursuite de l'usage vaut acceptation.

## 12. Droit applicable et litiges
Droit **français**. À défaut de résolution amiable (médiation {{mediateur}} le cas échéant),
compétence des tribunaux de {{ressort}}.
