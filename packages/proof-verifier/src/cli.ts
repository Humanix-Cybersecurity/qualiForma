#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Vérifieur de pack de preuve HORS-LIGNE (aucun accès réseau/serveur requis).
// Usage : proof-verify <chemin/preuve.json>
import { readFileSync } from 'node:fs';
import { verifyProofPack, type ProofPack } from '@humanix/signature-engine';

export function run(argv: string[]): number {
  const path = argv[0];
  if (!path) {
    process.stderr.write('Usage : proof-verify <preuve.json>\n');
    return 2;
  }

  let pack: ProofPack;
  try {
    pack = JSON.parse(readFileSync(path, 'utf8')) as ProofPack;
  } catch (e) {
    process.stderr.write(`Lecture/JSON impossible : ${(e as Error).message}\n`);
    return 2;
  }

  const report = verifyProofPack(pack);
  process.stdout.write(`Pack de preuve — ${pack.organisme?.nom ?? ''}\n`);
  process.stdout.write(`Niveau : ${report.niveau}\n\n`);
  for (const c of report.checks) {
    process.stdout.write(`  ${c.ok ? '✓' : '✗'} ${c.nom}${c.detail ? ` — ${c.detail}` : ''}\n`);
  }
  process.stdout.write(`\n${report.ok ? '✅ PACK AUTHENTIQUE' : '❌ PACK ALTÉRÉ'}\n`);
  return report.ok ? 0 : 1;
}

if (require.main === module) {
  process.exit(run(process.argv.slice(2)));
}
