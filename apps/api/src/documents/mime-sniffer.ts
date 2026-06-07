// SPDX-License-Identifier: AGPL-3.0-or-later
// Détection du type MIME RÉEL à partir des octets (jamais l'extension/déclaration, ADR 0006).

export type SniffedMime = 'application/pdf' | 'application/zip' | 'text/plain';

/** Types réellement acceptés à l'upload (PDF, ZIP, TXT ; syllabus = PDF). */
export const ALLOWED_MIME: readonly SniffedMime[] = [
  'application/pdf',
  'application/zip',
  'text/plain',
];

function startsWith(buf: Buffer, sig: number[]): boolean {
  if (buf.length < sig.length) return false;
  return sig.every((b, i) => buf[i] === b);
}

/** Heuristique texte : UTF-8 plausible, sans octet NUL ni excès de caractères de contrôle. */
function looksLikeText(buf: Buffer): boolean {
  if (buf.length === 0) return true;
  const sample = buf.subarray(0, 8192);
  if (sample.includes(0x00)) return false;
  let control = 0;
  for (const byte of sample) {
    // Autorise tab/LF/CR + plage imprimable ; UTF-8 multioctets (>=0x80) tolérés.
    if (byte < 0x09 || (byte > 0x0d && byte < 0x20)) control++;
  }
  return control / sample.length < 0.01;
}

/**
 * Renvoie le type MIME réel parmi les types autorisés, ou `null` si non reconnu/refusé.
 * Ordre : signatures binaires d'abord (PDF, ZIP), puis repli texte.
 */
export function sniffMime(buf: Buffer): SniffedMime | null {
  if (startsWith(buf, [0x25, 0x50, 0x44, 0x46])) return 'application/pdf'; // %PDF
  // En-têtes ZIP : local file (PK\x03\x04), empty (PK\x05\x06), spanned (PK\x07\x08).
  if (
    startsWith(buf, [0x50, 0x4b, 0x03, 0x04]) ||
    startsWith(buf, [0x50, 0x4b, 0x05, 0x06]) ||
    startsWith(buf, [0x50, 0x4b, 0x07, 0x08])
  ) {
    return 'application/zip';
  }
  if (looksLikeText(buf)) return 'text/plain';
  return null;
}
