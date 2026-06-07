// SPDX-License-Identifier: AGPL-3.0-or-later
import { ForbiddenException } from '@nestjs/common';
import { QuotasService } from './quotas.service';
import type { TenantClient } from '../prisma/tenant-prisma.service';

/** Fabrique un faux TenantClient minimal pour les besoins du test. */
function fakeTx(opts: {
  quota?: { maxUsers?: number | null; maxActiveSessions?: number | null } | null;
  plan?: { maxUsers?: number | null; maxActiveSessions?: number | null } | null;
  activeSessions?: number;
  users?: number;
}): TenantClient {
  return {
    quota: { findUnique: async () => opts.quota ?? null },
    subscription: {
      findFirst: async () => (opts.plan ? { plan: opts.plan } : null),
    },
    session: { count: async () => opts.activeSessions ?? 0 },
    user: { count: async () => opts.users ?? 0 },
  } as unknown as TenantClient;
}

describe('QuotasService', () => {
  const svc = new QuotasService();
  const T = 'tenant-1';

  it('illimité quand ni quota ni plan ne fixent de limite', async () => {
    const tx = fakeTx({ quota: null, plan: null, activeSessions: 999 });
    await expect(svc.assertCanCreateSession(tx, T)).resolves.toBeUndefined();
  });

  it('utilise la limite du plan en l’absence de quota tenant', async () => {
    const tx = fakeTx({ quota: null, plan: { maxActiveSessions: 2 }, activeSessions: 2 });
    await expect(svc.assertCanCreateSession(tx, T)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('le quota tenant surcharge le plan', async () => {
    const tx = fakeTx({
      quota: { maxActiveSessions: 5 },
      plan: { maxActiveSessions: 1 },
      activeSessions: 3,
    });
    await expect(svc.assertCanCreateSession(tx, T)).resolves.toBeUndefined();
  });

  it('autorise quand le compte est strictement sous la limite', async () => {
    const tx = fakeTx({ plan: { maxActiveSessions: 3 }, activeSessions: 2 });
    await expect(svc.assertCanCreateSession(tx, T)).resolves.toBeUndefined();
  });

  it('refuse l’ajout d’utilisateur au-delà du quota', async () => {
    const tx = fakeTx({ quota: { maxUsers: 10 }, users: 10 });
    await expect(svc.assertCanAddUser(tx, T)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
