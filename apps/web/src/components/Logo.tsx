// SPDX-License-Identifier: AGPL-3.0-or-later
import { GraduationCap } from 'lucide-react';

/** Marque Humanix : pictogramme + nom. */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 font-semibold text-slate-900">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">
        <GraduationCap aria-hidden="true" className="h-5 w-5" />
      </span>
      {!compact && <span className="text-lg tracking-tight">Humanix</span>}
    </span>
  );
}
