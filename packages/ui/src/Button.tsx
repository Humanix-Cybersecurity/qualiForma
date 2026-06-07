// SPDX-License-Identifier: AGPL-3.0-or-later
import { Button as AriaButton, type ButtonProps } from 'react-aria-components';

const VARIANTS = {
  primary:
    'bg-blue-700 text-white hover:bg-blue-800 disabled:bg-slate-300 disabled:text-slate-500',
  secondary:
    'bg-white text-slate-900 border border-slate-300 hover:bg-slate-50 disabled:opacity-50',
  danger: 'bg-red-700 text-white hover:bg-red-800 disabled:opacity-50',
} as const;

export interface UiButtonProps extends ButtonProps {
  variant?: keyof typeof VARIANTS;
}

/** Bouton accessible (React Aria) : focus visible, états gérés au clavier. */
export function Button({ variant = 'primary', className, ...props }: UiButtonProps) {
  return (
    <AriaButton
      {...props}
      className={
        `inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium ` +
        `outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ` +
        `transition-colors ${VARIANTS[variant]} ${typeof className === 'string' ? className : ''}`
      }
    />
  );
}
