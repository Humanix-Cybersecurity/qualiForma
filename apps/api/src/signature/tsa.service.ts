// SPDX-License-Identifier: AGPL-3.0-or-later
import { Injectable, Logger } from '@nestjs/common';
import {
  QualifiedTimestampAuthority,
  ServerTimestampAuthority,
  bytesToBase64,
  buildTimeStampRequest,
  hexToBytes,
  parseTimeStampResponse,
  type TimestampAuthority,
} from '@humanix/signature-engine';
import { loadEnv } from '../config/env';

/**
 * Fournit l'autorité d'horodatage utilisée par le moteur de signature.
 *
 * - `TSA_ENABLED=true` : client RFC 3161 réel (TimeStampReq/Resp DER) vers `TSA_URL`,
 *   politique optionnelle `TSA_POLICY_OID`. Le jeton (TimeStampToken CMS) est stocké en base64.
 * - sinon : MODE DÉGRADÉ documenté — horodatage serveur (NTP) faisant foi, sans jeton qualifié.
 */
@Injectable()
export class TsaService {
  private readonly logger = new Logger(TsaService.name);
  private readonly env = loadEnv();

  authority(): TimestampAuthority {
    if (this.env.TSA_ENABLED && this.env.TSA_URL) {
      const url = this.env.TSA_URL;
      const policyOid = this.env.TSA_POLICY_OID;
      return new QualifiedTimestampAuthority((digestHex) => this.requestToken(url, digestHex, policyOid));
    }
    return new ServerTimestampAuthority();
  }

  /** Effectue la requête HTTP RFC 3161 et renvoie le jeton d'horodatage en base64. */
  private async requestToken(url: string, digestHex: string, policyOid?: string): Promise<string> {
    const reqDer = buildTimeStampRequest(hexToBytes(digestHex), {
      certReq: true,
      ...(policyOid ? { policyOid } : {}),
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/timestamp-query' },
      body: reqDer,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      throw new Error(`TSA HTTP ${res.status}`);
    }
    const respDer = new Uint8Array(await res.arrayBuffer());
    const result = parseTimeStampResponse(respDer);
    if (!result.granted || !result.token) {
      throw new Error(`TSA a refusé l'horodatage (status ${result.status}${result.failureText ? ` : ${result.failureText}` : ''}).`);
    }
    return bytesToBase64(result.token);
  }
}
