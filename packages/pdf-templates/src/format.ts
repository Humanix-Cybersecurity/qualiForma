// SPDX-License-Identifier: AGPL-3.0-or-later

/** "2026-06-15" ou ISO → "15/06/2026". Tolère les chaînes déjà formatées. */
export function frDate(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : value;
}

/** ISO → "15/06/2026 14:05". */
export function frDateTime(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : iso;
}

export function eurosFromCents(cents: number): string {
  return `${(cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`;
}

export const PERIODE_LABEL: Record<'matin' | 'apres_midi', string> = {
  matin: 'Matin',
  apres_midi: 'Après-midi',
};
