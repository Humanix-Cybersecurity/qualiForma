// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  FieldError,
  Input,
  Label,
  Text,
  TextField as AriaTextField,
  type TextFieldProps,
} from 'react-aria-components';

export interface UiTextFieldProps extends TextFieldProps {
  label: string;
  description?: string;
  /** Message d'erreur explicite (annoncé aux lecteurs d'écran via aria-describedby). */
  errorMessage?: string;
  placeholder?: string;
  inputMode?: 'text' | 'numeric' | 'email';
  autoComplete?: string;
}

/**
 * Champ texte accessible : label associé, description et erreur reliées par ARIA,
 * focus visible. Conforme RGAA/WCAG (ADR 0004).
 */
export function TextField({
  label,
  description,
  errorMessage,
  placeholder,
  inputMode,
  autoComplete,
  ...props
}: UiTextFieldProps) {
  return (
    <AriaTextField
      {...props}
      validationBehavior="aria"
      className="flex flex-col gap-1"
      {...(errorMessage ? { isInvalid: true } : {})}
    >
      <Label className="text-sm font-medium text-slate-800">{label}</Label>
      <Input
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-shadow focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500 data-[invalid]:border-red-400"
      />
      {description ? (
        <Text slot="description" className="text-xs text-slate-500">
          {description}
        </Text>
      ) : null}
      <FieldError className="text-xs text-red-700">{errorMessage}</FieldError>
    </AriaTextField>
  );
}
