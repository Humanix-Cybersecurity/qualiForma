// SPDX-License-Identifier: AGPL-3.0-or-later
// Vérifie la présence de l'en-tête SPDX dans les fichiers source (AGPL, CONTRIBUTING).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['apps', 'packages', 'infra', 'scripts'];
const EXT = new Set(['.ts', '.tsx', '.mjs', '.js', '.css', '.sql', '.prisma']);
const SKIP = new Set(['node_modules', 'dist', '.turbo', 'migrations']);
const NEEDLE = 'SPDX-License-Identifier';

const offenders = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full);
    } else {
      const dot = entry.lastIndexOf('.');
      const ext = dot >= 0 ? entry.slice(dot) : '';
      if (!EXT.has(ext)) continue;
      const head = readFileSync(full, 'utf8').slice(0, 200);
      if (!head.includes(NEEDLE)) offenders.push(full);
    }
  }
}

for (const root of ROOTS) {
  try {
    walk(root);
  } catch {
    /* dossier absent */
  }
}

if (offenders.length > 0) {
  console.error(`✗ ${offenders.length} fichier(s) sans en-tête SPDX :`);
  for (const f of offenders) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('✓ En-têtes SPDX présents.');
