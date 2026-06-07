// SPDX-License-Identifier: AGPL-3.0-or-later
// Codec RFC 3161 (horodatage qualifié eIDAS) — pur, sans I/O réseau.
// Construit une TimeStampReq DER et parse une TimeStampResp. La requête HTTP vers la TSA
// est réalisée par l'appelant (cf. API TsaService) puis le jeton est stocké tel quel.
import { AsnConvert, OctetString } from '@peculiar/asn1-schema';
import { AlgorithmIdentifier } from '@peculiar/asn1-x509';
import { MessageImprint, TimeStampReq, TimeStampResp, TSTInfo } from '@peculiar/asn1-tsp';
import { ContentInfo, SignedData } from '@peculiar/asn1-cms';

/** OID de SHA-256. */
export const SHA256_OID = '2.16.840.1.101.3.4.2.1';

export interface BuildRequestOptions {
  /** OID de la politique d'horodatage exigée (reqPolicy). */
  policyOid?: string;
  /** Demande à la TSA d'inclure son certificat dans le jeton (utile pour la vérification hors-ligne). */
  certReq?: boolean;
}

/** Construit une requête d'horodatage RFC 3161 (DER) pour une empreinte SHA-256. */
export function buildTimeStampRequest(digest: Uint8Array, opts: BuildRequestOptions = {}): Uint8Array {
  if (digest.length !== 32) {
    throw new Error('RFC 3161 : empreinte SHA-256 de 32 octets attendue.');
  }
  const req = new TimeStampReq({
    version: 1,
    messageImprint: new MessageImprint({
      hashAlgorithm: new AlgorithmIdentifier({ algorithm: SHA256_OID }),
      hashedMessage: new OctetString(digest),
    }),
    certReq: opts.certReq ?? true,
    ...(opts.policyOid ? { reqPolicy: opts.policyOid } : {}),
  });
  return new Uint8Array(AsnConvert.serialize(req));
}

export interface TimeStampResult {
  /** La TSA a accordé l'horodatage (PKIStatus granted/grantedWithMods). */
  granted: boolean;
  /** Code PKIStatus brut (0 = granted, 1 = grantedWithMods, 2 = rejection…). */
  status: number;
  /** Jeton d'horodatage (TimeStampToken CMS) en DER, présent si accordé. */
  token?: Uint8Array;
  /** Message d'échec éventuel renvoyé par la TSA. */
  failureText?: string;
}

/** Parse une réponse d'horodatage RFC 3161 (DER) et extrait le jeton. */
export function parseTimeStampResponse(der: Uint8Array): TimeStampResult {
  const resp = AsnConvert.parse(der, TimeStampResp);
  const status = resp.status.status as unknown as number;
  const granted = status === 0 || status === 1;
  const token = resp.timeStampToken
    ? new Uint8Array(AsnConvert.serialize(resp.timeStampToken))
    : undefined;
  const failureText = resp.status.statusString?.length
    ? resp.status.statusString.join(' ')
    : undefined;
  return {
    granted,
    status,
    ...(token ? { token } : {}),
    ...(failureText ? { failureText } : {}),
  };
}

/** Empreinte hexadécimale → octets. */
export function hexToBytes(hex: string): Uint8Array {
  return Uint8Array.from(Buffer.from(hex, 'hex'));
}

export function base64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(Buffer.from(b64, 'base64'));
}

export interface TstImprint {
  /** Empreinte horodatée par la TSA (doit égaler l'empreinte scellée). */
  hashedMessageHex: string;
  /** Heure de génération du jeton (TSA). */
  genTime?: string;
  /** Numéro de série du jeton. */
  serialNumber?: string;
}

/**
 * Extrait l'empreinte horodatée d'un TimeStampToken (CMS SignedData → TSTInfo).
 * Best-effort : renvoie `null` si le jeton n'est pas parsable. La vérification cryptographique
 * complète de la signature TSA + chaîne de certificats relève d'`openssl ts -verify` (cf. doc).
 */
export function parseTimeStampTokenImprint(tokenDer: Uint8Array): TstImprint | null {
  try {
    const ci = AsnConvert.parse(toArrayBuffer(tokenDer), ContentInfo);
    const sd = AsnConvert.parse(ci.content, SignedData);
    const eContent = sd.encapContentInfo.eContent;
    if (!eContent) return null;
    const tstDer = coerceBuffer(eContent);
    const tst = AsnConvert.parse(toArrayBuffer(coerceBuffer(tstDer)), TSTInfo);
    const hashedMessageHex = Buffer.from(coerceBuffer(tst.messageImprint.hashedMessage)).toString('hex');
    const genTime = toIso(tst.genTime);
    return {
      hashedMessageHex,
      ...(genTime ? { genTime } : {}),
      ...(tst.serialNumber ? { serialNumber: Buffer.from(coerceBuffer(tst.serialNumber)).toString('hex') } : {}),
    };
  } catch {
    return null;
  }
}

function toArrayBuffer(u: Uint8Array): ArrayBuffer {
  return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer;
}
function coerceBuffer(v: unknown): Uint8Array {
  if (v instanceof Uint8Array) return v;
  if (v instanceof ArrayBuffer) return new Uint8Array(v);
  const anyV = v as { buffer?: ArrayBuffer | Uint8Array };
  if (anyV?.buffer) return coerceBuffer(anyV.buffer);
  return new Uint8Array();
}
function toIso(v: unknown): string | undefined {
  if (v instanceof Date) return v.toISOString();
  try {
    return new Date(v as string).toISOString();
  } catch {
    return undefined;
  }
}

/** Octets → base64 (stockage du jeton). */
export function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}
