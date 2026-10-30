import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language } from '@/types';
import trTranslations from '@/locales/tr.json';
import enTranslations from '@/locales/en.json';
import deTranslations from '@/locales/de.json';
import ruTranslations from '@/locales/ru.json';
import { getBestMatchingLanguage } from '@/utils/languageMapper';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export const TranslationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguageState] = useState<Language | null>(null);

  useEffect(() => {
    const initializeLanguage = async () => {
      try {
        // Load saved language from AsyncStorage
        const savedLanguage = await AsyncStorage.getItem('selectedLanguage');
        if (savedLanguage) {
          try {
            const lang = JSON.parse(savedLanguage);
            setCurrentLanguageState(lang);
            return; // Exit early if we have a saved language
          } catch (e) {
            // If parsing fails, continue to device language detection
            if (__DEV__) {
              console.error('Error parsing saved language:', e);
            }
          }
        }
        
        // No saved language - detect from device
        const browserLangCode = getBestMatchingLanguage();
        const defaultLang: Language = { 
          id: browserLangCode, 
          code: browserLangCode, 
          name: browserLangCode === 'tr' ? 'Türkçe' : browserLangCode === 'de' ? 'Deutsch' : browserLangCode === 'ru' ? 'Русский' : 'English', 
          isActive: true, 
          isDefault: false 
        };
        setCurrentLanguageState(defaultLang);
        // Don't save to AsyncStorage yet - let Header component handle it after API languages are loaded
      } catch (error) {
        console.error('Error initializing language:', error);
        // Set default to English on error
        const defaultLang: Language = { 
          id: 'en', 
          code: 'en', 
          name: 'English', 
          isActive: true, 
          isDefault: false 
        };
        setCurrentLanguageState(defaultLang);
      }
    };

    initializeLanguage();
  }, []);

  const setCurrentLanguage = async (language: Language) => {
    setCurrentLanguageState(language);
    try {
      await AsyncStorage.setItem('selectedLanguage', JSON.stringify(language));
      await AsyncStorage.setItem('selectedLanguageId', language.id);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const t = (key: string): string => {
    const langCode = currentLanguage?.code || 'en';
    const translation = translations[langCode] || translations['en'];
    
    const keys = key.split('.');
    let value: any = translation;
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        // Fallback to English if key not found
        const enValue: any = translations['en'];
        let fallbackValue = enValue;
        for (const fallbackKey of keys) {
          fallbackValue = fallbackValue?.[fallbackKey];
          if (fallbackValue === undefined) {
            return key; // Return key if not found in any language
          }
        }
        return fallbackValue;
      }
    }
    
    return value || key;
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

