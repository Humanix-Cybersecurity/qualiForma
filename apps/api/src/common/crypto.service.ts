// SPDX-License-Identifier: AGPL-3.0-or-later
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { loadEnv } from '../config/env';

/**
 * Chiffrement symétrique au repos (AES-256-GCM) des secrets sensibles applicatifs
 * (ex. secret TOTP). Format stocké : `iv.tag.ciphertext` (base64url). Clé = APP_ENCRYPTION_KEY.
 */
@Injectable()
export class CryptoService {
  private readonly key = Buffer.from(loadEnv().APP_ENCRYPTION_KEY, 'base64');

  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv, tag, ct].map((b) => b.toString('base64url')).join('.');
  }

  decrypt(payload: string): string {
    const [ivB64, tagB64, ctB64] = payload.split('.');
    if (!ivB64 || !tagB64 || !ctB64) {
      throw new Error('Charge chiffrée malformée.');
    }
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.key,
      Buffer.from(ivB64, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
    const pt = Buffer.concat([
      decipher.update(Buffer.from(ctB64, 'base64url')),
      decipher.final(),
    ]);
    return pt.toString('utf8');
  }
}
