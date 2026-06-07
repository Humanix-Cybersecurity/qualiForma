// SPDX-License-Identifier: AGPL-3.0-or-later
import { Socket } from 'node:net';
import { Injectable } from '@nestjs/common';
import { loadEnv } from '../config/env';

export interface ScanResult {
  clean: boolean;
  /** Nom de la signature détectée si infecté. */
  signature?: string;
}

/** Port d'analyse antivirus (injectable, mockable en test). */
export interface FileScanner {
  scan(buffer: Buffer): Promise<ScanResult>;
}

export const FILE_SCANNER = Symbol('FILE_SCANNER');

/**
 * Client ClamAV via le protocole clamd INSTREAM (TCP). Envoie le flux par chunks préfixés
 * de leur taille (uint32 big-endian) puis un terminateur de longueur 0. Réponse :
 *   "stream: OK"  |  "stream: <Signature> FOUND"  |  "... ERROR"
 */
@Injectable()
export class ClamAvScanner implements FileScanner {
  private readonly host = loadEnv().CLAMAV_HOST;
  private readonly port = loadEnv().CLAMAV_PORT;
  private static readonly CHUNK = 64 * 1024;

  scan(buffer: Buffer): Promise<ScanResult> {
    return new Promise<ScanResult>((resolve, reject) => {
      const socket = new Socket();
      const chunks: Buffer[] = [];
      let settled = false;

      const fail = (err: Error) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        reject(err);
      };

      socket.setTimeout(30_000);
      socket.on('timeout', () => fail(new Error('ClamAV : délai dépassé.')));
      socket.on('error', fail);
      socket.on('data', (d) => chunks.push(d));
      socket.on('end', () => {
        if (settled) return;
        settled = true;
        // clamd termine ses réponses par un octet NUL : le retirer avant analyse.
        const reply = Buffer.concat(chunks).toString('utf8').replace(/\0+$/, '').trim();
        if (reply.endsWith('OK') && !reply.includes('FOUND')) {
          resolve({ clean: true });
        } else if (reply.includes('FOUND')) {
          const sig = reply.replace(/^stream:\s*/, '').replace(/\s*FOUND$/, '');
          resolve({ clean: false, signature: sig });
        } else {
          reject(new Error(`ClamAV : réponse inattendue « ${reply} ».`));
        }
      });

      socket.connect(this.port, this.host, () => {
        socket.write('zINSTREAM\0');
        for (let i = 0; i < buffer.length; i += ClamAvScanner.CHUNK) {
          const chunk = buffer.subarray(i, i + ClamAvScanner.CHUNK);
          const size = Buffer.alloc(4);
          size.writeUInt32BE(chunk.length, 0);
          socket.write(size);
          socket.write(chunk);
        }
        const terminator = Buffer.alloc(4); // longueur 0 → fin du flux
        socket.write(terminator);
      });
    });
  }
}
