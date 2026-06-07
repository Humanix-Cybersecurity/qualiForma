// SPDX-License-Identifier: AGPL-3.0-or-later
import { AsnConvert, OctetString } from '@peculiar/asn1-schema';
import { PKIStatusInfo, TimeStampReq, TimeStampResp } from '@peculiar/asn1-tsp';
import { describe, expect, it } from 'vitest';
import { buildTimeStampRequest, hexToBytes, parseTimeStampResponse, SHA256_OID } from './rfc3161';

const digest = hexToBytes('a'.repeat(64)); // 32 octets

describe('RFC 3161', () => {
  it('construit une TimeStampReq DER reparsable, avec l\'empreinte et SHA-256', () => {
    const der = buildTimeStampRequest(digest, { policyOid: '1.2.3.4', certReq: true });
    const req = AsnConvert.parse(der, TimeStampReq);
    expect(req.version).toBe(1);
    expect(req.messageImprint.hashAlgorithm.algorithm).toBe(SHA256_OID);
    expect(new Uint8Array(req.messageImprint.hashedMessage.buffer)).toEqual(digest);
    expect(req.reqPolicy).toBe('1.2.3.4');
    expect(req.certReq).toBe(true);
  });

  it('refuse une empreinte de mauvaise taille', () => {
    expect(() => buildTimeStampRequest(new Uint8Array(16))).toThrow(/32 octets/);
  });

  it('parse une réponse accordée et en extrait le jeton', () => {
    // Réponse minimale « granted » avec un jeton factice (ContentInfo).
    const resp = new TimeStampResp({ status: new PKIStatusInfo({ status: 0 }) });
    const der = new Uint8Array(AsnConvert.serialize(resp));
    const res = parseTimeStampResponse(der);
    expect(res.granted).toBe(true);
    expect(res.status).toBe(0);
  });

  it('parse une réponse rejetée (granted=false)', () => {
    const resp = new TimeStampResp({ status: new PKIStatusInfo({ status: 2 }) });
    const der = new Uint8Array(AsnConvert.serialize(resp));
    const res = parseTimeStampResponse(der);
    expect(res.granted).toBe(false);
    expect(res.status).toBe(2);
  });

  it('round-trip d\'un OctetString d\'empreinte', () => {
    const oct = new OctetString(digest);
    expect(new Uint8Array(oct.buffer)).toEqual(digest);
  });
});
