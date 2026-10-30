import * as Localization from 'expo-localization';

/**
 * Maps device language to supported application languages
 * @param deviceLang - Device language code (e.g., 'tr', 'tr-TR', 'en-US', 'de-DE')
 * @param supportedLanguages - Array of supported languages from API
 * @returns Language code that matches our supported languages, or 'en' as fallback
 */
export const mapBrowserLanguageToAppLanguage = (
  deviceLang: string,
  supportedLanguages: Array<{ code: string; id: string }> = []
): string => {
  // Normalize device language (lowercase, remove region if present)
  const normalizedDeviceLang = deviceLang.toLowerCase().split('-')[0];
  
  // If we have supported languages from API, use them
  if (supportedLanguages.length > 0) {
    // Try exact match first
    const exactMatch = supportedLanguages.find(
      lang => lang.code.toLowerCase() === normalizedDeviceLang
    );
    if (exactMatch) {
      return exactMatch.code;
    }
    
    // Try to find by id
    const idMatch = supportedLanguages.find(
      lang => lang.id.toLowerCase() === normalizedDeviceLang
    );
    if (idMatch) {
      return idMatch.code;
    }
  }
  
  // Fallback to hardcoded mapping for common languages
  const languageMap: Record<string, string> = {
    'tr': 'tr',  // Turkish
    'en': 'en',  // English
    'de': 'de',  // German
    'ru': 'ru',  // Russian
  };
  
  return languageMap[normalizedDeviceLang] || 'en';
};

/**
 * Gets device language from expo-localization
 * @returns Device language code or null
 */
export const getBrowserLanguage = (): string | null => {
  try {
    // Get device locales from expo-localization
    const locales = Localization.getLocales();
    if (locales && locales.length > 0) {
      return locales[0].languageCode || null;
    }
    
    // Fallback to default locale
    return Localization.locale || null;
  } catch (error) {
    console.warn('Error getting device language:', error);
    return null;
  }
};

/**
 * Gets the best matching language for the user based on device settings
 * @param supportedLanguages - Array of supported languages from API
 * @returns Language code
 */
export const getBestMatchingLanguage = (
  supportedLanguages: Array<{ code: string; id: string }> = []
): string => {
  const deviceLang = getBrowserLanguage();
  
  if (!deviceLang) {
    return 'en'; // Default fallback
  }
  
  return mapBrowserLanguageToAppLanguage(deviceLang, supportedLanguages);
};

