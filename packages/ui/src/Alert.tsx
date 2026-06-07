// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ReactNode } from 'react';

const TONES = {
  error: 'bg-red-50 text-red-800 border-red-200',
  success: 'bg-green-50 text-green-800 border-green-200',
  info: 'bg-blue-50 text-blue-800 border-blue-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
} as const;

export interface AlertProps {
  tone?: keyof typeof TONES;
  children: ReactNode;
}

/** Message d'état annoncé aux technologies d'assistance (role=alert pour les erreurs). */
export function Alert({ tone = 'info', children }: AlertProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-md border px-3 py-2 text-sm ${TONES[tone]}`}
    >
      {children}
    </div>
  );
}
