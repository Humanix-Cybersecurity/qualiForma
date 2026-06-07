// SPDX-License-Identifier: AGPL-3.0-or-later
// File d'attente d'émargement OFFLINE (IndexedDB) + synchronisation idempotente (ADR 0005).
// L'horodatage serveur fait foi à la réception ; la signature backend est idempotente
// (unique créneau+utilisateur), donc rejouer un envoi en file est sûr.
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface PendingSign {
  id?: number;
  creneauId: string;
  body: { methode: 'code' | 'manuscrite' | 'qr' | 'lien'; code?: string; jeton?: string };
  /** Horodatage local indicatif (transmis comme timestampClient à la sync). */
  ts: string;
}

interface OfflineDB extends DBSchema {
  'sign-queue': { key: number; value: PendingSign };
}

let dbp: Promise<IDBPDatabase<OfflineDB>> | null = null;
function db() {
  if (!dbp) {
    dbp = openDB<OfflineDB>('humanix-offline', 1, {
      upgrade(d) {
        d.createObjectStore('sign-queue', { keyPath: 'id', autoIncrement: true });
      },
    });
  }
  return dbp;
}

/** Détecte une erreur réseau (hors-ligne) vs une erreur applicative (à ne pas rejouer). */
export function isNetworkError(e: unknown): boolean {
  return e instanceof TypeError || (typeof navigator !== 'undefined' && !navigator.onLine);
}

export async function enqueueSign(item: PendingSign): Promise<void> {
  const d = await db();
  await d.add('sign-queue', item);
}

export async function pendingCount(): Promise<number> {
  const d = await db();
  return d.count('sign-queue');
}

/**
 * Vide la file : pour chaque envoi en attente, appelle `send`. Succès → retiré ;
 * erreur réseau → on s'arrête (toujours hors-ligne) ; erreur applicative → retiré (non rejouable).
 */
export async function flushQueue(send: (item: PendingSign) => Promise<void>): Promise<number> {
  const d = await db();
  const all = await d.getAll('sign-queue');
  let synced = 0;
  for (const item of all) {
    try {
      await send(item);
      if (item.id !== undefined) await d.delete('sign-queue', item.id);
      synced += 1;
    } catch (e) {
      if (isNetworkError(e)) break; // encore hors-ligne : on réessaiera
      if (item.id !== undefined) await d.delete('sign-queue', item.id); // 400/409 : non rejouable
    }
  }
  return synced;
}
