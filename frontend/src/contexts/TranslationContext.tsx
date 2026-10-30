import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language } from '@/types';
import trTranslations from '@/locales/tr.json';
import enTranslations from '@/locales/en.json';
import deTranslations from '@/locales/de.json';
import ruTranslations from '@/locales/ru.json';
import { getLocaleFromPath, stubLanguage } from '@/i18n/locales';

type Translations = typeof trTranslations;

interface TranslationContextType {
  t: (key: string) => string;
  currentLanguage: Language | null;
  setCurrentLanguage: (language: Language) => void;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

const translations: Record<string, Translations> = {
  tr: trTranslations,
  en: enTranslations,
  de: deTranslations,
  ru: ruTranslations,
};

function languageFromUrl(): Language {
  const locale = getLocaleFromPath();
  try {
    const saved = localStorage.getItem('selectedLanguage');
    if (saved) {
      const parsed = JSON.parse(saved) as Language;
      if (parsed?.code?.toLowerCase() === locale && parsed.id) {
        return parsed;
      }
    }
  } catch {
    // ignore corrupt cache
  }
  return stubLanguage(locale);
}

export const TranslationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguageState] = useState<Language | null>(languageFromUrl);

  useEffect(() => {
    const handleLanguageChange = (event: CustomEvent<Language>) => {
      setCurrentLanguageState(event.detail);
    };

    window.addEventListener('languageChanged', handleLanguageChange as EventListener);
    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange as EventListener);
    };
  }, []);

  const setCurrentLanguage = (language: Language) => {
    setCurrentLanguageState(language);
    localStorage.setItem('selectedLanguage', JSON.stringify(language));
    localStorage.setItem('selectedLanguageId', language.id);
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: language }));
  };

  const t = (key: string): string => {
    const langCode = currentLanguage?.code || getLocaleFromPath();
    const translation = translations[langCode] || translations['tr'];
    
    const keys = key.split('.');
    let value: any = translation;
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        const enValue: any = translations['en'];
        let fallbackValue = enValue;
        for (const fallbackKey of keys) {
          fallbackValue = fallbackValue?.[fallbackKey];
          if (fallbackValue === undefined) {
            return key;
          }
        }
        if (typeof fallbackValue === 'object' && fallbackValue !== null) {
          return key;
        }
        return String(fallbackValue || key);
      }
    }
    
    if (typeof value === 'object' && value !== null) {
      return key;
    }
    
    return String(value || key);
  };

  return (
    <TranslationContext.Provider value={{ t, currentLanguage, setCurrentLanguage }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};
