<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
# Sécurité — mesures (DevSecOps)

Synthèse des contrôles implémentés (§12). Voir aussi [ADR 0002](../adr/0002-isolation-multi-tenant-rls.md)
et [ADR 0006](../adr/0006-stockage-objet-et-scan-uploads.md).

## Authentification & accès
- Mots de passe **argon2id** ; politique de complexité (≥ 12 caractères).
- **MFA TOTP** (secret chiffré AES-256-GCM au repos).
- Anti-brute-force : verrouillage après 5 échecs ; réponse leurre anti-énumération.
- JWT d'accès court + refresh **hashé** avec **rotation** et révocation.
- **RBAC** (`@Auth(...roles)`) + vérification que le tenant du token == tenant résolu.

## Isolation multi-tenant
- **Row-Level Security** PostgreSQL, rôle applicatif `NOSUPERUSER`/`NOBYPASSRLS`, `FORCE RLS`.
- Contexte tenant par transaction (`SET LOCAL`) ; tests d'isolation bloquants en CI.

## Uploads (fail-closed)
- Validation taille + **type MIME réel** (magic bytes), **scan ClamAV** avant disponibilité,
  **dézippage sécurisé** (anti zip-bomb / path traversal), checksum SHA-256, chiffrement.

## Intégrité & audit
- Émargement : faisceau de preuves + horodatage serveur + **audit hash-chaîné**, vérifiable.
- Journal d'audit général **append-only hash-chaîné** (`audit_log`, INSERT/SELECT only).

## En-têtes & transport
- Helmet : **CSP verrouillée** (`default-src 'none'`), HSTS, X-Content-Type-Options, etc.
- CORS restreint aux origines configurées. TLS en transit. Secrets via env/vault (jamais en repo).

## CI sécurité
- ESLint, vérification **SPDX**, `pnpm audit` (≥ high), **gitleaks** (secrets), **SBOM** CycloneDX.
- À compléter : SAST (semgrep/CodeQL), scan d'image conteneur (trivy) au packaging.
