// SPDX-License-Identifier: AGPL-3.0-or-later
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import {
  QualifiedTimestampAuthority,
  ServerTimestampAuthority,
  bytesToBase64,
  buildTimeStampRequest,
  hexToBytes,
  parseTimeStampResponse,
  type TimestampAuthority,
  type TimestampToken,
} from '@humanix/signature-engine';
import { loadEnv } from '../config/env';

/** Autorité d'horodatage déterministe pour les tests (jeton factice rfc3161). */
class MockTimestampAuthority implements TimestampAuthority {
  readonly type = 'rfc3161' as const;
  async stamp(digestHex: string): Promise<TimestampToken> {
    return { type: 'rfc3161', token: bytesToBase64(hexToBytes(digestHex)) };
  }
}

/**
 * Horodatage RFC 3161 — SOUVERAINETÉ (contrainte bloquante).
 *
 * Modes (config `TSA_MODE`) :
 *   - `qualified` : client RFC 3161 vers un PSCo QUALIFIÉ eIDAS **français** inscrit sur la
 *     liste de confiance ANSSI / EU Trusted List (cible : Universign, Datasure). OBLIGATOIRE en prod.
 *   - `internal`  : horodatage interne (serveur faisant foi) — DÉVELOPPEMENT uniquement.
 *   - `mock`      : jeton déterministe — tests.
 *
 * Garde de démarrage : refuse de démarrer en production si le mode n'est pas `qualified`.
 * Le scellement consolidé (1 jeton qualifié par séquence) est la SEULE consommation de TSA.
 */
@Injectable()
export class TsaService implements OnModuleInit {
  private readonly logger = new Logger(TsaService.name);
  private readonly env = loadEnv();

  onModuleInit(): void {
    const { NODE_ENV, TSA_MODE, TSA_URL, TSA_ALLOWED_HOSTS } = this.env;

    if (NODE_ENV === 'production' && TSA_MODE !== 'qualified') {
      throw new Error(
        `Démarrage refusé : TSA_MODE='${TSA_MODE}' interdit en production. ` +
          `Exigez un horodatage QUALIFIÉ (PSCo FR sur l'EU Trusted List).`,
      );
    }
    if (TSA_MODE === 'qualified') {
      if (!TSA_URL) throw new Error('TSA_MODE=qualified requiert TSA_URL.');
      if (TSA_ALLOWED_HOSTS.length > 0) {
        const host = new URL(TSA_URL).host;
        if (!TSA_ALLOWED_HOSTS.includes(host)) {
          throw new Error(`TSA_URL (${host}) hors liste blanche des PSCo qualifiés autorisés.`);
        }
      }
      this.logger.log(`Horodatage QUALIFIÉ via ${new URL(TSA_URL).host}`);
    } else {
      this.logger.warn(`Horodatage en mode '${TSA_MODE}' — NON qualifié, hors production.`);
    }
  }

  /** Autorité d'horodatage selon le mode. Utilisée UNIQUEMENT au scellement consolidé. */
  authority(): TimestampAuthority {
    switch (this.env.TSA_MODE) {
      case 'qualified': {
        const url = this.env.TSA_URL as string;
        const policyOid = this.env.TSA_POLICY_OID;
        return new QualifiedTimestampAuthority((d) => this.requestToken(url, d, policyOid));
      }
      case 'mock':
        return new MockTimestampAuthority();
      case 'internal':
      default:
        return new ServerTimestampAuthority();
    }
  }

  get qualified(): boolean {
    return this.env.TSA_MODE === 'qualified';
  }

  /** Requête HTTP RFC 3161 → jeton d'horodatage (TimeStampToken CMS) en base64. */
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
    if (!res.ok) throw new Error(`TSA HTTP ${res.status}`);
    const result = parseTimeStampResponse(new Uint8Array(await res.arrayBuffer()));
    if (!result.granted || !result.token) {
      throw new Error(`TSA a refusé l'horodatage (status ${result.status}).`);
    }
    return bytesToBase64(result.token);
  }
}
