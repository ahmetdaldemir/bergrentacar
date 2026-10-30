/**
 * Maps browser language to supported application languages
 * @param browserLang - Browser language code (e.g., 'tr', 'tr-TR', 'en-US', 'de-DE')
 * @param supportedLanguages - Array of supported languages from API
 * @returns Language code that matches our supported languages, or 'en' as fallback
 */
export const mapBrowserLanguageToAppLanguage = (
  browserLang: string,
  supportedLanguages: Array<{ code: string; id: string }> = []
): string => {
  // Normalize browser language (lowercase, remove region if present)
  const normalizedBrowserLang = browserLang.toLowerCase().split('-')[0];
  
  // If we have supported languages from API, use them
  if (supportedLanguages.length > 0) {
    // Try exact match first
    const exactMatch = supportedLanguages.find(
      lang => lang.code.toLowerCase() === normalizedBrowserLang
    );
    if (exactMatch) {
      return exactMatch.code;
    }
    
    // Try to find by id
    const idMatch = supportedLanguages.find(
      lang => lang.id.toLowerCase() === normalizedBrowserLang
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
  
  return languageMap[normalizedBrowserLang] || 'en';
};

/**
 * Gets browser language from navigator
 * @returns Browser language code or null
 */
export const getBrowserLanguage = (): string | null => {
  if (typeof window === 'undefined' || !navigator) {
    return null;
  }
  
  // Try navigator.languages first (more accurate, includes user preferences)
  if (navigator.languages && navigator.languages.length > 0) {
    return navigator.languages[0];
  }
  
  // Fallback to navigator.language
  if (navigator.language) {
    return navigator.language;
  }
  
  // Fallback to navigator.userLanguage (IE)
  if ((navigator as any).userLanguage) {
    return (navigator as any).userLanguage;
  }
  
  return null;
};

/**
 * Gets the best matching language for the user based on browser settings
 * @param supportedLanguages - Array of supported languages from API
 * @returns Language code
 */
export const getBestMatchingLanguage = (
  supportedLanguages: Array<{ code: string; id: string }> = []
): string => {
  const browserLang = getBrowserLanguage();
  
  if (!browserLang) {
    return 'en'; // Default fallback
  }
  
  return mapBrowserLanguageToAppLanguage(browserLang, supportedLanguages);
};

