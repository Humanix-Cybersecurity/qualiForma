// SPDX-License-Identifier: AGPL-3.0-or-later
import type {
  SignatureAttestation,
  SignatureProvider,
  TimestampAuthority,
  TimestampToken,
} from './ports';

/**
 * Fournisseur SES par défaut : la valeur probante repose sur le faisceau de preuves
 * (horodatage serveur, IP/UA, empreinte SHA-256, audit chaîné), pas sur un certificat.
 */
export class SesSignatureProvider implements SignatureProvider {
  readonly level = 'SES' as const;

  async sign(_payloadSha256: string): Promise<SignatureAttestation> {
    return { level: 'SES' };
  }

  async verify(_payloadSha256: string, attestation: SignatureAttestation): Promise<boolean> {
    return attestation.level === 'SES';
  }
}

/** Horodatage serveur (NTP) faisant foi par défaut (ADR 0003/0005). */
export class ServerTimestampAuthority implements TimestampAuthority {
  readonly type = 'serveur' as const;

  async stamp(_digestHex: string): Promise<TimestampToken> {
    return { type: 'serveur' };
  }
}

/**
 * Squelette d'horodatage qualifié RFC 3161 / eIDAS. La requête réseau vers la TSA est
 * injectée (`requestToken`) pour rester testable et sans dépendance réseau dans le package.
 */
export class QualifiedTimestampAuthority implements TimestampAuthority {
  readonly type = 'rfc3161' as const;

  constructor(private readonly requestToken: (digestHex: string) => Promise<string>) {}

  async stamp(digestHex: string): Promise<TimestampToken> {
    const token = await this.requestToken(digestHex);
    return { type: 'rfc3161', token };
  }
}
