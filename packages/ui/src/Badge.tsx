// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ReactNode } from 'react';

const TONES = {
  neutral: 'bg-slate-100 text-slate-700',
  brand: 'bg-brand-50 text-brand-700',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
} as const;

export interface BadgeProps {
  tone?: keyof typeof TONES;
  children: ReactNode;
}

/** Pastille d'état (statut, rôle…). */
export function Badge({ tone = 'neutral', children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>
      {children}
    </span>
  );
}
