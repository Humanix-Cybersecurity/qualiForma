// SPDX-License-Identifier: AGPL-3.0-or-later
import { FieldError, Label, Text, TextArea, TextField as AriaTextField, type TextFieldProps } from 'react-aria-components';

export interface UiTextareaProps extends TextFieldProps {
  label: string;
  description?: string;
  errorMessage?: string;
  placeholder?: string;
  rows?: number;
}

/** Zone de texte multi-lignes accessible. */
export function Textarea({ label, description, errorMessage, placeholder, rows = 4, ...props }: UiTextareaProps) {
  return (
    <AriaTextField {...props} validationBehavior="aria" className="flex flex-col gap-1" {...(errorMessage ? { isInvalid: true } : {})}>
      <Label className="text-sm font-medium text-slate-800">{label}</Label>
      <TextArea
        placeholder={placeholder}
        rows={rows}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-shadow focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500"
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
