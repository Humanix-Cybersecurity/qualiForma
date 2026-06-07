# Multi-plateforme — PWA hors-ligne + applications natives

Le front (`apps/web`) est une **PWA installable** doublée d'un packaging natif **Capacitor**
(iOS/Android) à partir de la même base de code. Aucune dépendance propriétaire ni service US.

## 1. PWA installable

- Manifeste + Service Worker générés par `vite-plugin-pwa` (Workbox, MIT) — voir `vite.config.ts`.
- Icônes de marque `public/icon-192.png`, `public/icon-512.png` (purpose `any` + `maskable`)
  et `public/apple-touch-icon.png`, générées de façon reproductible par `scripts/gen-icons.mjs`
  (encodeur PNG sans dépendance, `zlib` natif de Node).
- App shell pré-cachée (`globPatterns`) → l'interface se charge hors-ligne.

### Émargement hors-ligne (ADR 0005)

Quand le réseau est absent au moment de signer :

1. `apps/web/src/lib/offline.ts` met l'émargement en file dans **IndexedDB** (`idb`, MIT).
2. L'apprenant voit « enregistré sur cet appareil, transmis au retour de la connexion ».
3. À la reconnexion (`window` event `online`) **et** au montage de session,
   `AuthProvider` vide la file via `flushQueue`.

La synchronisation est **idempotente** : la signature backend a une contrainte d'unicité
`(creneauId, userId)` et un ré-envoi renvoie la preuve existante sans la dupliquer.
**L'horodatage qualifié fait foi à la réception serveur, pas à la saisie hors-ligne** —
le scellement consolidé d'une demi-journée n'intervient qu'après réception de tous les
émargements (voir `docs/conformite/valeur-probante.md`). Une erreur applicative (4xx)
retire l'élément de la file (non rejouable) ; une erreur réseau le conserve.

## 2. Build natif (Capacitor)

> Le build natif requiert Xcode (iOS) / Android SDK et n'est donc pas exécuté dans
> l'environnement CI Linux. Procédure sur poste de développeur :

```bash
# Depuis apps/web
pnpm build                 # produit dist/
pnpm exec cap add ios      # une seule fois — crée ios/
pnpm exec cap add android  # une seule fois — crée android/
pnpm cap:sync              # copie dist/ + plugins dans les projets natifs
pnpm exec cap open ios     # ouvre Xcode
pnpm exec cap open android # ouvre Android Studio
```

- `capacitor.config.ts` : `appId = app.humanix.suivi`, `webDir = dist`.
- Les projets `ios/` et `android/` sont générés localement et **ne sont pas versionnés**
  (ajoutés au `.gitignore`) ; ils se régénèrent via `cap add`.
- Signature des binaires : certificats Apple / clés Android gérés hors dépôt (secrets CI).

## Licences ajoutées (Jalon F)

| Paquet               | Version | Licence | Rôle                         |
| -------------------- | ------- | ------- | ---------------------------- |
| `idb`                | ^8.0.0  | ISC     | File hors-ligne IndexedDB    |
| `@capacitor/ios`     | ^6.1.2  | MIT     | Cible native iOS             |
| `@capacitor/android` | ^6.1.2  | MIT     | Cible native Android         |

Toutes OSI, compatibles AGPLv3, sans composant propriétaire ni SaaS US.
