// SPDX-License-Identifier: AGPL-3.0-or-later
import type { FileScanner, ScanResult } from './file-scanner';
import type { ObjectStorage } from './object-storage';

describe('DocumentsService (pipeline fail-closed)', () => {
  let DocumentsService: typeof import('./documents.service').DocumentsService;
  let runWithTenant: typeof import('../tenant/tenant-context').runWithTenant;

  const ctx = { tenantId: '00000000-0000-0000-0000-000000000001', tenantSlug: 'demo' };

  beforeAll(async () => {
    process.env.DATABASE_URL = 'postgresql://app:app@localhost:5432/humanix';
    process.env.JWT_ACCESS_SECRET = 'x'.repeat(16);
    process.env.JWT_REFRESH_SECRET = 'y'.repeat(16);
    process.env.APP_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64');
    process.env.UPLOAD_MAX_BYTES = '2048'; // petit pour tester la limite
    ({ DocumentsService } = await import('./documents.service'));
    ({ runWithTenant } = await import('../tenant/tenant-context'));
  });

  function makeStorage(): jest.Mocked<ObjectStorage> {
    return {
      put: jest.fn(async () => undefined),
      copy: jest.fn(async () => undefined),
      delete: jest.fn(async () => undefined),
      getStream: jest.fn(),
    } as unknown as jest.Mocked<ObjectStorage>;
  }
  function makeScanner(result: ScanResult): FileScanner {
    return { scan: jest.fn(async () => result) };
  }
  function makeTenantPrisma() {
    const create = jest.fn(async (args: { data: Record<string, unknown> }) => ({
      ...args.data,
      tailleOctets: args.data.tailleOctets,
    }));
    const withTenant = jest.fn(async (cb: (tx: unknown) => unknown) => cb({ document: { create } }));
    return { svc: { withTenant } as never, create, withTenant };
  }

  const pdf = Buffer.from('%PDF-1.4 contenu de test');

  it('promeut et enregistre un PDF sain', async () => {
    const storage = makeStorage();
    const scanner = makeScanner({ clean: true });
    const { svc, create } = makeTenantPrisma();
    const service = new DocumentsService(svc, storage, scanner);

    const doc = await runWithTenant(ctx, () =>
      service.upload({ buffer: pdf, originalName: 'cours.pdf', type: 'pdf', scope: 'tenant' }),
    );

    expect(scanner.scan).toHaveBeenCalledTimes(1);
    expect(storage.put).toHaveBeenCalledTimes(1); // quarantaine
    expect(storage.copy).toHaveBeenCalledTimes(1); // promotion
    expect(create).toHaveBeenCalledTimes(1);
    expect(doc.scanStatus).toBe('clean');
  });

  it('rejette un fichier infecté sans le promouvoir ni l\'enregistrer', async () => {
    const storage = makeStorage();
    const scanner = makeScanner({ clean: false, signature: 'Eicar-Test-Signature' });
    const { svc, create } = makeTenantPrisma();
    const service = new DocumentsService(svc, storage, scanner);

    await expect(
      runWithTenant(ctx, () =>
        service.upload({ buffer: pdf, originalName: 'virus.pdf', type: 'pdf', scope: 'tenant' }),
      ),
    ).rejects.toThrow(/menace détectée/i);

    expect(storage.put).toHaveBeenCalledTimes(1); // déposé en quarantaine
    expect(storage.delete).toHaveBeenCalledTimes(1); // puis supprimé
    expect(storage.copy).not.toHaveBeenCalled(); // jamais promu
    expect(create).not.toHaveBeenCalled(); // aucun enregistrement
  });

  it('rejette un type non autorisé avant tout stockage', async () => {
    const storage = makeStorage();
    const scanner = makeScanner({ clean: true });
    const { svc } = makeTenantPrisma();
    const service = new DocumentsService(svc, storage, scanner);

    const garbage = Buffer.from([0x00, 0x01, 0x02, 0xff, 0x00]);
    await expect(
      runWithTenant(ctx, () =>
        service.upload({ buffer: garbage, originalName: 'x.bin', type: 'autre', scope: 'tenant' }),
      ),
    ).rejects.toThrow(/non autorisé/i);

    expect(storage.put).not.toHaveBeenCalled();
    expect(scanner.scan).not.toHaveBeenCalled();
  });

  it('rejette un fichier trop volumineux avant tout stockage', async () => {
    const storage = makeStorage();
    const scanner = makeScanner({ clean: true });
    const { svc } = makeTenantPrisma();
    const service = new DocumentsService(svc, storage, scanner);

    const big = Buffer.alloc(4096, 0x25); // > UPLOAD_MAX_BYTES (2048)
    await expect(
      runWithTenant(ctx, () =>
        service.upload({ buffer: big, originalName: 'big.pdf', type: 'pdf', scope: 'tenant' }),
      ),
    ).rejects.toThrow(/volumineux/i);

    expect(storage.put).not.toHaveBeenCalled();
  });
});
