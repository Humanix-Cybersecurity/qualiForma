#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Démarrage de l'API : attente DB → migrations → policies RLS → seed → serveur.
set -e

DB_HOST="${DB_HOST:-postgres}"
DB_OWNER="${DB_OWNER:-humanix_admin}"

echo "→ Attente de PostgreSQL (${DB_HOST})…"
until pg_isready -h "$DB_HOST" -p 5432 -U "$DB_OWNER" >/dev/null 2>&1; do
  sleep 1
done

echo "→ Migrations Prisma…"
pnpm --filter @humanix/api exec prisma migrate deploy

echo "→ Application des policies RLS…"
node apps/api/scripts/apply-rls.mjs

echo "→ Seed de démonstration…"
node apps/api/prisma/seed.mjs || echo "(seed ignoré)"

echo "→ Démarrage de l'API sur le port ${API_PORT:-3000}…"
exec node apps/api/dist/main.js
