// SPDX-License-Identifier: AGPL-3.0-or-later
// Règles métier de l'émargement (ADR 0003, §8). Pures, sans I/O.
import type { SignataireType } from './types';

/** "HH:MM" → minutes depuis minuit. Lève si le format est invalide. */
function toMinutes(hhmm: string): number {
  const m = /^([0-1]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (!m) throw new Error(`Horaire invalide: "${hhmm}" (attendu HH:MM).`);
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * Heures réelles de présence sur un créneau (demi-journée), en tenant compte des retards
 * et départs anticipés. L'intervalle effectif est borné par les horaires du créneau.
 * Retourne un nombre d'heures arrondi à 2 décimales (≥ 0).
 */
export function computeHeuresPresence(
  heureDebut: string,
  heureFin: string,
  arrivee?: string,
  depart?: string,
): number {
  const debut = Math.max(toMinutes(heureDebut), arrivee ? toMinutes(arrivee) : -Infinity);
  const fin = Math.min(toMinutes(heureFin), depart ? toMinutes(depart) : Infinity);
  const minutes = Math.max(0, fin - debut);
  return Math.round((minutes / 60) * 100) / 100;
}

export type SignatureStatut = 'en_attente' | 'signe' | 'refuse' | 'absent';

export interface SignatureState {
  type: SignataireType;
  statut: SignatureStatut;
}

export interface CreneauCompletude {
  /** Co-signature formateur présente (obligatoire par créneau). */
  formateurSigne: boolean;
  apprenantsSignes: number;
  apprenantsAttendus: number;
  /** Tous les signataires attendus ont signé ET le formateur a co-signé. */
  complet: boolean;
  manquants: string[];
}

/**
 * Évalue la complétude d'émargement d'un créneau. La co-signature formateur est
 * OBLIGATOIRE : sans elle, le créneau n'est jamais complet (contrainte §3/§8).
 */
export function evaluateCreneauCompletude(
  signatures: SignatureState[],
  apprenantsAttendus: number,
): CreneauCompletude {
  const formateurSigne = signatures.some((s) => s.type === 'formateur' && s.statut === 'signe');
  const apprenantsSignes = signatures.filter(
    (s) => s.type === 'apprenant' && s.statut === 'signe',
  ).length;

  const manquants: string[] = [];
  if (!formateurSigne) manquants.push('Co-signature formateur manquante.');
  if (apprenantsSignes < apprenantsAttendus) {
    manquants.push(`${apprenantsAttendus - apprenantsSignes} apprenant(s) non signé(s).`);
  }

  return {
    formateurSigne,
    apprenantsSignes,
    apprenantsAttendus,
    complet: manquants.length === 0,
    manquants,
  };
}
