// SPDX-License-Identifier: AGPL-3.0-or-later
import { Button as AriaButton, type ButtonProps } from 'react-aria-components';

const VARIANTS = {
  primary:
    'bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none',
  secondary:
    'bg-white text-slate-800 border border-slate-300 shadow-sm hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800 disabled:opacity-50',
} as const;

const SIZES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
} as const;

export interface UiButtonProps extends ButtonProps {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
}

/** Bouton accessible (React Aria) : focus visible, états gérés au clavier. */
export function Button({ variant = 'primary', size = 'md', className, ...props }: UiButtonProps) {
  return (
    <AriaButton
      {...props}
      className={
        `inline-flex items-center justify-center gap-2 rounded-xl font-medium ` +
        `outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ` +
        `focus-visible:ring-offset-2 active:translate-y-px disabled:cursor-not-allowed disabled:active:translate-y-0 ` +
        `${SIZES[size]} ${VARIANTS[variant]} ${typeof className === 'string' ? className : ''}`
      }
    />
  );
}
