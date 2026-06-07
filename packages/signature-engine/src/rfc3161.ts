// SPDX-License-Identifier: AGPL-3.0-or-later
// Codec RFC 3161 (horodatage qualifié eIDAS) — pur, sans I/O réseau.
// Construit une TimeStampReq DER et parse une TimeStampResp. La requête HTTP vers la TSA
// est réalisée par l'appelant (cf. API TsaService) puis le jeton est stocké tel quel.
import { AsnConvert, OctetString } from '@peculiar/asn1-schema';
import { AlgorithmIdentifier } from '@peculiar/asn1-x509';
import { MessageImprint, TimeStampReq, TimeStampResp } from '@peculiar/asn1-tsp';

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

/** Octets → base64 (stockage du jeton). */
export function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}
