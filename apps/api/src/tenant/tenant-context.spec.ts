// SPDX-License-Identifier: AGPL-3.0-or-later
import { getTenantContext, requireTenantContext, runWithTenant } from './tenant-context';

describe('tenant-context', () => {
  it('renvoie undefined hors de tout contexte', () => {
    expect(getTenantContext()).toBeUndefined();
  });

  it('lève (fail-closed) quand le contexte est requis mais absent', () => {
    expect(() => requireTenantContext()).toThrow(/contexte tenant/i);
  });

  it('propage le contexte dans le call-stack async', async () => {
    const ctx = { tenantId: 't-1', tenantSlug: 'acme' };
    await runWithTenant(ctx, async () => {
      await Promise.resolve();
      expect(requireTenantContext()).toEqual(ctx);
    });
    // Hors du run, le contexte n'existe plus.
    expect(getTenantContext()).toBeUndefined();
  });
});
