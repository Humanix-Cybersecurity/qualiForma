// SPDX-License-Identifier: AGPL-3.0-or-later
// Inspection ZIP sécurisée (ADR 0006) : défense anti zip-bomb et anti path-traversal.
// Les tailles décompressées proviennent du répertoire central → détection SANS décompresser.
import yauzl from 'yauzl';

export interface SafeZipLimits {
  maxEntries: number;
  maxTotalUncompressedBytes: number;
  /** Ratio max décompressé/compressé par entrée (détection zip-bomb). */
  maxCompressionRatio: number;
}

export const DEFAULT_ZIP_LIMITS: SafeZipLimits = {
  maxEntries: 2_000,
  maxTotalUncompressedBytes: 500 * 1024 * 1024, // 500 Mio
  maxCompressionRatio: 200,
};

export interface ZipEntryInfo {
  fileName: string;
  uncompressedSize: number;
  compressedSize: number;
}

export class UnsafeZipError extends Error {}

/** Rejette les chemins absolus, la remontée de répertoire et les séparateurs Windows. */
function assertSafePath(name: string): void {
  if (name.startsWith('/') || name.startsWith('\\') || /^[a-zA-Z]:/.test(name)) {
    throw new UnsafeZipError(`Chemin absolu interdit dans l'archive : "${name}".`);
  }
  const normalized = name.replace(/\\/g, '/');
  if (normalized.split('/').some((seg) => seg === '..')) {
    throw new UnsafeZipError(`Remontée de répertoire interdite (path traversal) : "${name}".`);
  }
}

/**
 * Inspecte une archive ZIP en mémoire et valide ses entrées contre les limites de sécurité.
 * Ne décompresse RIEN. Lève `UnsafeZipError` à la première violation (fail-closed).
 */
export function inspectZip(
  buffer: Buffer,
  limits: SafeZipLimits = DEFAULT_ZIP_LIMITS,
): Promise<ZipEntryInfo[]> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zip) => {
      if (err || !zip) {
        reject(new UnsafeZipError(`Archive ZIP illisible : ${err?.message ?? 'inconnue'}`));
        return;
      }

      const entries: ZipEntryInfo[] = [];
      let totalUncompressed = 0;

      zip.on('entry', (entry: yauzl.Entry) => {
        try {
          if (entries.length + 1 > limits.maxEntries) {
            throw new UnsafeZipError(`Trop d'entrées (> ${limits.maxEntries}).`);
          }
          assertSafePath(entry.fileName);

          const isDir = entry.fileName.endsWith('/');
          if (!isDir) {
            totalUncompressed += entry.uncompressedSize;
            if (totalUncompressed > limits.maxTotalUncompressedBytes) {
              throw new UnsafeZipError('Taille décompressée totale excessive (zip-bomb suspectée).');
            }
            const ratio =
              entry.compressedSize > 0 ? entry.uncompressedSize / entry.compressedSize : 0;
            if (ratio > limits.maxCompressionRatio) {
              throw new UnsafeZipError(
                `Ratio de compression suspect (${Math.round(ratio)}x) sur "${entry.fileName}".`,
              );
            }
            entries.push({
              fileName: entry.fileName,
              uncompressedSize: entry.uncompressedSize,
              compressedSize: entry.compressedSize,
            });
          }
          zip.readEntry();
        } catch (e) {
          zip.close();
          reject(e instanceof UnsafeZipError ? e : new UnsafeZipError(String(e)));
        }
      });

      zip.on('end', () => resolve(entries));
      zip.on('error', (e: Error) => reject(new UnsafeZipError(e.message)));
      zip.readEntry();
    });
  });
}
