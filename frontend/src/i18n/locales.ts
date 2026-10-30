import type { Language } from '@/types';

export const LOCALES = ['tr', 'en', 'de', 'ru'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'tr';

export const LOCALE_NAMES: Record<Locale, string> = {
  tr: 'Türkçe',
  en: 'English',
  de: 'Deutsch',
  ru: 'Русский',
};

export const OG_LOCALE: Record<Locale, string> = {
  tr: 'tr_TR',
  en: 'en_US',
  de: 'de_DE',
  ru: 'ru_RU',
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

export function getLocaleFromPath(
  pathname = typeof window !== 'undefined' ? window.location.pathname : '/',
): Locale {
  const first = pathname.split('/').filter(Boolean)[0];
  return isLocale(first) ? first : DEFAULT_LOCALE;
}

export function getRouterBasename(): string {
  if (typeof window === 'undefined') return `/${DEFAULT_LOCALE}`;
  const first = window.location.pathname.split('/').filter(Boolean)[0];
  return isLocale(first) ? `/${first}` : '';
}

export function localePath(locale: Locale, routePath: string): string {
  const clean = routePath === '/' ? '' : routePath.replace(/\/$/, '');
  return `/${locale}${clean}`;
}

export function stubLanguage(locale: Locale, id = ''): Language {
  return {
    id,
    code: locale,
    name: LOCALE_NAMES[locale],
    isActive: true,
    isDefault: locale === DEFAULT_LOCALE,
  };
}

export function pickLanguageForUrl(languages: Language[]): Language | undefined {
  const locale = getLocaleFromPath();
  return languages.find(
    (lang) => lang.isActive !== false && lang.code?.toLowerCase() === locale,
  );
}

export function supportedLanguages(languages: Language[]): Language[] {
  return languages.filter(
    (lang) => lang.isActive !== false && isLocale(lang.code?.toLowerCase()),
  );
}
