// SPDX-License-Identifier: AGPL-3.0-or-later
import { randomBytes } from 'node:crypto';

describe('CryptoService (AES-256-GCM)', () => {
  let CryptoService: typeof import('./crypto.service').CryptoService;

  beforeAll(async () => {
    // Environnement minimal requis par loadEnv() (lu à la construction du service).
    process.env.DATABASE_URL = 'postgresql://app:app@localhost:5432/humanix';
    process.env.JWT_ACCESS_SECRET = 'x'.repeat(16);
    process.env.JWT_REFRESH_SECRET = 'y'.repeat(16);
    process.env.APP_ENCRYPTION_KEY = randomBytes(32).toString('base64');
    ({ CryptoService } = await import('./crypto.service'));
  });

  it('chiffre puis déchiffre à l\'identique', () => {
    const svc = new CryptoService();
    const secret = 'JBSWY3DPEHPK3PXP';
    expect(svc.decrypt(svc.encrypt(secret))).toBe(secret);
  });

  it('produit un chiffré différent à chaque appel (IV aléatoire)', () => {
    const svc = new CryptoService();
    expect(svc.encrypt('same')).not.toBe(svc.encrypt('same'));
  });

  it('rejette un chiffré altéré (authentification GCM)', () => {
    const svc = new CryptoService();
    const enc = svc.encrypt('tamper-me');
    const parts = enc.split('.');
    const tampered = `${parts[0]}.${parts[1]}.${Buffer.from('zzzz').toString('base64url')}`;
    expect(() => svc.decrypt(tampered)).toThrow();
  });
});
