// SPDX-License-Identifier: AGPL-3.0-or-later
import yazl from 'yazl';
import { inspectZip, UnsafeZipError, DEFAULT_ZIP_LIMITS } from './safe-zip';

/** Construit un buffer ZIP à partir d'entrées {nom → contenu}. */
function buildZip(entries: Record<string, Buffer>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const zip = new yazl.ZipFile();
    for (const [name, content] of Object.entries(entries)) {
      zip.addBuffer(content, name);
    }
    zip.end();
    const chunks: Buffer[] = [];
    zip.outputStream.on('data', (c: Buffer) => chunks.push(c));
    zip.outputStream.on('end', () => resolve(Buffer.concat(chunks)));
    zip.outputStream.on('error', reject);
  });
}

/**
 * yazl refuse de créer des entrées au nom dangereux. Pour fabriquer un ZIP malveillant
 * de test, on crée une entrée avec un placeholder de MÊME longueur puis on patche les octets
 * du nom (présent dans l'en-tête local ET le répertoire central) — les offsets restent valides.
 */
async function buildZipWithRawName(name: string, content: Buffer): Promise<Buffer> {
  const placeholder = 'p'.repeat(name.length);
  const buf = await buildZip({ [placeholder]: content });
  return Buffer.from(buf.toString('latin1').split(placeholder).join(name), 'latin1');
}

describe('inspectZip', () => {
  it('accepte une archive bénigne et liste ses entrées', async () => {
    const buf = await buildZip({
      'docs/a.txt': Buffer.from('contenu a'),
      'docs/b.txt': Buffer.from('contenu b'),
    });
    const entries = await inspectZip(buf);
    expect(entries.map((e) => e.fileName).sort()).toEqual(['docs/a.txt', 'docs/b.txt']);
  });

  it('rejette une entrée en path traversal (../)', async () => {
    const buf = await buildZipWithRawName('../../etc/passwd', Buffer.from('x'));
    await expect(inspectZip(buf)).rejects.toBeInstanceOf(UnsafeZipError);
  });

  it('rejette un chemin absolu', async () => {
    const buf = await buildZipWithRawName('/etc/shadow', Buffer.from('x'));
    await expect(inspectZip(buf)).rejects.toBeInstanceOf(UnsafeZipError);
  });

  it('rejette une zip-bomb (ratio de compression excessif)', async () => {
    // 2 Mio de zéros → fortement compressibles → ratio >> limite.
    const buf = await buildZip({ 'bomb.bin': Buffer.alloc(2 * 1024 * 1024, 0) });
    await expect(inspectZip(buf)).rejects.toBeInstanceOf(UnsafeZipError);
  });

  it('rejette une archive dépassant le nombre maximal d\'entrées', async () => {
    const many: Record<string, Buffer> = {};
    for (let i = 0; i < 5; i++) many[`f${i}.txt`] = Buffer.from('x');
    await expect(inspectZip(many ? await buildZip(many) : Buffer.alloc(0), {
      ...DEFAULT_ZIP_LIMITS,
      maxEntries: 3,
    })).rejects.toBeInstanceOf(UnsafeZipError);
  });
});
