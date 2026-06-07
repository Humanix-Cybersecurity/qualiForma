// SPDX-License-Identifier: AGPL-3.0-or-later
import { sniffMime } from './mime-sniffer';

describe('sniffMime', () => {
  it('détecte un PDF par sa signature %PDF', () => {
    expect(sniffMime(Buffer.from('%PDF-1.7\n...'))).toBe('application/pdf');
  });

  it('détecte un ZIP par sa signature PK', () => {
    expect(sniffMime(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00]))).toBe('application/zip');
  });

  it('détecte du texte brut UTF-8', () => {
    expect(sniffMime(Buffer.from('Bonjour, ceci est un fichier texte.\nLigne 2.'))).toBe('text/plain');
  });

  it('rejette un binaire inconnu (octets de contrôle / NUL)', () => {
    expect(sniffMime(Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe, 0x00, 0x03]))).toBeNull();
  });

  it('ne se fie pas à l\'extension : des octets PDF restent un PDF', () => {
    // Même si nommé .txt en amont, le contenu prime.
    expect(sniffMime(Buffer.from('%PDF-1.4'))).toBe('application/pdf');
  });
});
