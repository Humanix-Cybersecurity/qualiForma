// SPDX-License-Identifier: AGPL-3.0-or-later
import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantContext {
  /** UUID du tenant résolu pour la requête courante. */
  tenantId: string;
  tenantSlug: string;
}

const storage = new AsyncLocalStorage<TenantContext>();

/** Exécute `fn` avec le contexte tenant attaché (propagé à tout le call-stack async). */
export function runWithTenant<T>(ctx: TenantContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

/** Contexte tenant courant, ou `undefined` hors d'une requête résolue. */
export function getTenantContext(): TenantContext | undefined {
  return storage.getStore();
}

/** Contexte tenant courant. Lève si absent (fail-closed : aucune requête hors tenant). */
export function requireTenantContext(): TenantContext {
  const ctx = storage.getStore();
  if (!ctx) {
    throw new Error('Aucun contexte tenant : requête hors périmètre tenant interdite.');
  }
  return ctx;
}
