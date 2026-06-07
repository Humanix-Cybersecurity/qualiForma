// SPDX-License-Identifier: AGPL-3.0-or-later
export interface SpinnerProps {
  label?: string;
}

/** Indicateur de chargement accessible (annoncé via aria-label). */
export function Spinner({ label = 'Chargement…' }: SpinnerProps) {
  return (
    <span role="status" aria-label={label} className="inline-flex items-center gap-2 text-sm text-slate-500">
      <span
        aria-hidden="true"
        className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600"
      />
      {label}
    </span>
  );
}
