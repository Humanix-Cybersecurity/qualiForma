// SPDX-License-Identifier: AGPL-3.0-or-later
import type { HorodatageType, SignatureLevel } from './types';

/**
 * Port de signature. Implémentation par défaut : SES (faisceau de preuves).
 * Point d'extension pour brancher un QTSP eIDAS afin de passer en SEA sur les
 * conventions/contrats, sans modifier le moteur (inversion de dépendances, ADR 0003).
 */
export interface SignatureProvider {
  readonly level: SignatureLevel;
  /** « Signe » l'empreinte du contenu. Pour SES, scelle l'empreinte dans le faisceau. */
  sign(payloadSha256: string): Promise<SignatureAttestation>;
  /** Revalide une attestation précédemment produite. */
  verify(payloadSha256: string, attestation: SignatureAttestation): Promise<boolean>;
}

export interface SignatureAttestation {
  level: SignatureLevel;
  /** Détail propre au fournisseur (certificat, identifiant QTSP...). Vide pour SES. */
  detail?: Record<string, unknown>;
}

/**
 * Port d'horodatage. Par défaut : horodatage SERVEUR (NTP) faisant foi. Point d'extension
 * pour un horodatage qualifié RFC 3161 / eIDAS renforçant la présomption d'exactitude.
 */
export interface TimestampAuthority {
  readonly type: HorodatageType;
  /** Horodate une empreinte ; renvoie le jeton (pour RFC 3161) ou rien (serveur). */
  stamp(digestHex: string): Promise<TimestampToken>;
}

export interface TimestampToken {
  type: HorodatageType;
  /** Jeton opaque (TST RFC 3161) le cas échéant. */
  token?: string;
}
