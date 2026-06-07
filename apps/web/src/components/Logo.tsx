// SPDX-License-Identifier: AGPL-3.0-or-later
import { GraduationCap } from 'lucide-react';

/** Marque Humanix : pictogramme + nom. */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 font-semibold text-slate-900">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm ring-1 ring-inset ring-white/20">
        <GraduationCap aria-hidden="true" className="h-5 w-5" />
      </span>
      {!compact && <span className="text-lg tracking-tight">Humanix</span>}
    </span>
  );
}
