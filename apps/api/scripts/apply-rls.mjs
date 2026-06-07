// SPDX-License-Identifier: AGPL-3.0-or-later
// Applique prisma/sql/rls-policies.sql avec le rôle PROPRIÉTAIRE (DATABASE_MIGRATION_URL).
// À lancer après `prisma migrate deploy`. Idempotent (CREATE OR REPLACE / DROP POLICY IF EXISTS).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const here = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(here, '..', 'prisma', 'sql', 'rls-policies.sql');
const connectionString = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_MIGRATION_URL (ou DATABASE_URL) requis.');
  process.exit(1);
}

const sql = readFileSync(sqlPath, 'utf8');
const client = new pg.Client({ connectionString });

try {
  await client.connect();
  await client.query(sql);
  console.log('✓ Policies RLS appliquées.');
} catch (err) {
  console.error('✗ Échec application RLS :', err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
