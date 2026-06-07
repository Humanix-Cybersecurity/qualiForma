// SPDX-License-Identifier: AGPL-3.0-or-later
// Seed minimal (étape 2) : un tenant démo + un compte admin_of, via le rôle superuser
// (DATABASE_MIGRATION_URL) car créer un tenant écrit hors contexte tenant. Le seed complet
// (formation, session multi-créneaux, formateur, apprenants) arrive à l'étape 3.
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const url = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
const prisma = new PrismaClient({ datasources: { db: { url } } });

const SLUG = 'demo';
const ADMIN_EMAIL = 'admin@demo.test';
const ADMIN_PASSWORD = 'Demo!Passw0rd';

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: SLUG },
    update: {},
    create: { slug: SLUG, name: 'Organisme de formation démo' },
  });

  const passwordHash = await argon2.hash(ADMIN_PASSWORD, { type: argon2.argon2id });
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: ADMIN_EMAIL } },
    update: {},
    create: { tenantId: tenant.id, email: ADMIN_EMAIL, passwordHash, role: 'admin_of' },
  });

  console.log(`✓ Tenant "${SLUG}" + admin ${ADMIN_EMAIL} (mot de passe : ${ADMIN_PASSWORD})`);
  console.log(`  Login : POST /auth/login  (en-tête x-tenant-slug: ${SLUG})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
