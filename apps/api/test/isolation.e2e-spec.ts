// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Tests d'isolation inter-tenant (ADR 0002). Prérequis :
//   docker compose -f infra/docker/docker-compose.dev.yml up -d postgres
//   pnpm --filter @humanix/api prisma:migrate && pnpm --filter @humanix/api db:rls
//
// Deux connexions :
//   - ownerClient  : DATABASE_MIGRATION_URL (superuser) → provisionne les fixtures (bypass RLS).
//   - appClient    : DATABASE_URL (rôle `app`, NON BYPASSRLS) → SOUMIS à la RLS = ce qu'on teste.
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const APP_URL = process.env.DATABASE_URL;
const OWNER_URL = process.env.DATABASE_MIGRATION_URL;

const ownerClient = new PrismaClient({ datasources: { db: { url: OWNER_URL ?? APP_URL ?? '' } } });
const appClient = new PrismaClient({ datasources: { db: { url: APP_URL ?? '' } } });

/** Exécute une opération sous contexte tenant (réplique TenantPrismaService.withTenantId). */
async function withTenant<T>(tenantId: string, fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
  return appClient.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    return fn(tx as unknown as PrismaClient);
  });
}

const suffix = randomUUID().slice(0, 8);
let tenantA = '';
let tenantB = '';
let userA = '';
let userB = '';

beforeAll(async () => {
  if (!OWNER_URL) {
    throw new Error(
      'DATABASE_MIGRATION_URL requis (rôle superuser) pour provisionner les fixtures de test.',
    );
  }

  const a = await ownerClient.tenant.create({
    data: { slug: `tenant-a-${suffix}`, name: 'Tenant A' },
  });
  const b = await ownerClient.tenant.create({
    data: { slug: `tenant-b-${suffix}`, name: 'Tenant B' },
  });
  tenantA = a.id;
  tenantB = b.id;

  const ua = await ownerClient.user.create({
    data: { tenantId: tenantA, email: `admin@a-${suffix}.test`, passwordHash: 'x', role: 'admin_of' },
  });
  const ub = await ownerClient.user.create({
    data: { tenantId: tenantB, email: `admin@b-${suffix}.test`, passwordHash: 'x', role: 'admin_of' },
  });
  userA = ua.id;
  userB = ub.id;

  // Table métier (étape 3) : vérifie que la RLS dynamique la couvre aussi.
  await ownerClient.formation.create({
    data: { tenantId: tenantA, intitule: 'Formation A', dureeHeures: '7', indicateursQualiopi: ['1'] },
  });
});

afterAll(async () => {
  // Cascade supprime users/tokens. Bypass RLS via superuser.
  await ownerClient.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await ownerClient.$disconnect();
  await appClient.$disconnect();
});

describe('Isolation multi-tenant (RLS)', () => {
  it('ne voit que les utilisateurs de son propre tenant', async () => {
    const usersOfA = await withTenant(tenantA, (tx) => tx.user.findMany());
    expect(usersOfA).toHaveLength(1);
    expect(usersOfA[0]?.id).toBe(userA);
    expect(usersOfA.every((u) => u.tenantId === tenantA)).toBe(true);
  });

  it("ne peut pas lire un utilisateur d'un autre tenant, même par id exact", async () => {
    const leaked = await withTenant(tenantA, (tx) => tx.user.findFirst({ where: { id: userB } }));
    expect(leaked).toBeNull();
  });

  it('ne peut pas modifier les données d\'un autre tenant (UPDATE → 0 ligne)', async () => {
    const res = await withTenant(tenantA, (tx) =>
      tx.user.updateMany({ where: { id: userB }, data: { isActive: false } }),
    );
    expect(res.count).toBe(0);

    // Confirmation côté propriétaire : la ligne de B est intacte.
    const stillActive = await ownerClient.user.findUnique({ where: { id: userB } });
    expect(stillActive?.isActive).toBe(true);
  });

  it('ne peut pas supprimer les données d\'un autre tenant (DELETE → 0 ligne)', async () => {
    const res = await withTenant(tenantA, (tx) => tx.user.deleteMany({ where: { id: userB } }));
    expect(res.count).toBe(0);
  });

  it('ne peut pas créer une ligne pour un autre tenant (WITH CHECK)', async () => {
    await expect(
      withTenant(tenantA, (tx) =>
        tx.user.create({
          data: { tenantId: tenantB, email: `evil-${suffix}@x.test`, passwordHash: 'x', role: 'apprenant' },
        }),
      ),
    ).rejects.toThrow();
  });

  it('sans contexte tenant, aucune ligne n\'est visible (fail-closed)', async () => {
    const count = await appClient.user.count();
    expect(count).toBe(0);
  });

  it('applique la RLS dynamiquement aux tables métier (Formation)', async () => {
    const vuesParA = await withTenant(tenantA, (tx) => tx.formation.count());
    const vuesParB = await withTenant(tenantB, (tx) => tx.formation.count());
    const sansContexte = await appClient.formation.count();
    expect(vuesParA).toBe(1);
    expect(vuesParB).toBe(0);
    expect(sansContexte).toBe(0);
  });

  it('resolve_tenant fonctionne hors contexte (SECURITY DEFINER) et reste limité au slug', async () => {
    const rows = await appClient.$queryRaw<{ id: string }[]>`
      SELECT id FROM resolve_tenant(${`tenant-a-${suffix}`})
    `;
    expect(rows[0]?.id).toBe(tenantA);
  });
});
