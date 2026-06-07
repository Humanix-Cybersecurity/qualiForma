// SPDX-License-Identifier: AGPL-3.0-or-later
import i18next, { type i18n } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { fr } from './fr';
import { en } from './en';

export const resources = {
  fr: { translation: fr },
  en: { translation: en },
} as const;

export const SUPPORTED_LOCALES = ['fr', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'fr';

/** Crée et initialise une instance i18next liée à React. FR par défaut. */
export function createI18n(lng: Locale = DEFAULT_LOCALE): i18n {
  const instance = i18next.createInstance();
  void instance.use(initReactI18next).init({
    resources,
    lng,
    fallbackLng: DEFAULT_LOCALE,
    interpolation: { escapeValue: false },
  });
  return instance;
}

export { fr, en };
