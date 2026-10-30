// DeepL Translation Service
import axios from 'axios';
import { TenantSettingsService } from './tenant-settings.service';

const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate';
const DEFAULT_DEEPL_API_KEY = process.env.DEFAULT_DEEPL_API_KEY || process.env.DEEPL_API_KEY || '';

// Rate limiting: DeepL free API allows ~5 requests per minute
// Add delay between requests to avoid rate limiting
const RATE_LIMIT_DELAY_MS = 1500; // 1.5 seconds between requests
let lastRequestTime = 0;

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 2000; // 2 seconds

// Language code mapping (ISO 639-1 to DeepL codes)
const languageCodeMap: Record<string, string> = {
  'en': 'EN',
  'tr': 'TR',
  'de': 'DE',
  'fr': 'FR',
  'es': 'ES',
  'it': 'IT',
  'pt': 'PT',
  'ru': 'RU',
  'ja': 'JA',
  'zh': 'ZH',
  'pl': 'PL',
  'nl': 'NL',
  'sv': 'SV',
  'da': 'DA',
  'fi': 'FI',
  'el': 'EL',
  'cs': 'CS',
  'ro': 'RO',
  'hu': 'HU',
  'bg': 'BG',
  'sk': 'SK',
  'sl': 'SL',
  'et': 'ET',
  'lv': 'LV',
  'lt': 'LT',
  'mt': 'MT',
};

export interface DeepLTranslationResponse {
  translations: Array<{
    detected_source_language: string;
    text: string;
  }>;
}

export type TranslateRequest = {
  text: string;
  targetLanguageCode: string;
  sourceLanguageCode?: string;
  tenantId?: string;
};

export type TranslateMultipleRequest = {
  texts: string[];
  targetLanguageCode: string;
  sourceLanguageCode?: string;
  tenantId?: string;
};

export class TranslationService {
  /**
   * Rate limiting: Ensure minimum delay between requests
   */
  private static async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < RATE_LIMIT_DELAY_MS) {
      const delay = RATE_LIMIT_DELAY_MS - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    lastRequestTime = Date.now();
  }

  /**
   * Retry logic with exponential backoff for rate limit errors
   */
  private static async retryWithBackoff<T>(
    fn: () => Promise<T>,
    retries = MAX_RETRIES,
    delay = INITIAL_RETRY_DELAY_MS
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries === 0) {
        throw error;
      }

      // Only retry on rate limit errors (429)
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        console.warn(`⚠️  Rate limit hit, retrying in ${delay}ms... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryWithBackoff(fn, retries - 1, delay * 2); // Exponential backoff
      }

      throw error;
    }
  }

  static async translateText(input: TranslateRequest): Promise<string> {
    // Apply rate limiting
    await this.rateLimit();

    return this.retryWithBackoff(async () => {
      try {
        const targetLang = languageCodeMap[input.targetLanguageCode.toLowerCase()] || input.targetLanguageCode.toUpperCase();
        const sourceLang = input.sourceLanguageCode ? languageCodeMap[input.sourceLanguageCode.toLowerCase()] : undefined;

        const params = new URLSearchParams({
          text: input.text,
          target_lang: targetLang,
          ...(sourceLang && { source_lang: sourceLang }),
        });

        // Resolve DeepL key: tenant-specific first, then check admin permission for env key
        let deeplKey: string | null = null;
        if (input.tenantId) {
          try {
            const aiSettings = await TenantSettingsService.getAiSettings(input.tenantId);
            // Check both top-level column and metadata
            const topLevelKey = (aiSettings as any)?.deeplApiKey;
            const metadataKey = (aiSettings?.metadata as any)?.deeplApiKey;
            const tenantKey = topLevelKey || metadataKey;
            if (tenantKey && typeof tenantKey === 'string' && tenantKey.trim()) {
              // Tenant has its own DeepL API key, use it
              deeplKey = tenantKey.trim();
              console.log('[DeepL] Using tenant-specific API key');
            } else {
              // Tenant doesn't have its own key, check if admin granted permission to use env key
              const { TenantFeaturesService } = await import('./tenant-features.service');
              const hasDeeplFeature = await TenantFeaturesService.hasFeature(input.tenantId, 'deepl');
              if (hasDeeplFeature && DEFAULT_DEEPL_API_KEY) {
                // Admin granted permission and env key exists, use env key
                deeplKey = DEFAULT_DEEPL_API_KEY;
                console.log('[DeepL] Using environment API key (admin permission granted)');
              } else if (!hasDeeplFeature) {
                throw new Error('DeepL API key not configured for tenant and admin permission not granted. Please configure your own DeepL API key or request admin permission.');
              } else {
                throw new Error('DeepL API key not configured. Please configure your DeepL API key in AI settings.');
              }
            }
          } catch (err) {
            if (err instanceof Error && err.message.includes('DeepL API key')) {
              throw err; // Re-throw our custom errors
            }
            console.error('[DeepL] Failed to load tenant AI settings for DeepL key:', err);
            throw new Error('Failed to load DeepL configuration. Please try again.');
          }
        } else {
          // No tenantId, use env key directly
          deeplKey = DEFAULT_DEEPL_API_KEY;
          if (!deeplKey) {
            throw new Error('DeepL API key not configured in environment');
          }
        }

        if (!deeplKey) {
          throw new Error('DeepL API key not configured for tenant or environment');
        }

        const response = await axios.post<DeepLTranslationResponse>(
          DEEPL_API_URL,
          params.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `DeepL-Auth-Key ${deeplKey}`,
            },
          }
        );

        if (!response.data.translations || response.data.translations.length === 0) {
          throw new Error('DeepL API returned no translations');
        }
        return response.data.translations[0]?.text || input.text;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 429) {
          // Re-throw to trigger retry
          throw error;
        }
        console.error('DeepL translation error:', error);
        if (axios.isAxiosError(error)) {
          throw new Error(`DeepL API error: ${error.response?.status} - ${error.response?.statusText} - ${JSON.stringify(error.response?.data)}`);
        }
        throw error;
      }
    });
  }

  static async translateMultiple(input: TranslateMultipleRequest): Promise<string[]> {
    // Apply rate limiting
    await this.rateLimit();

    return this.retryWithBackoff(async () => {
      try {
        const targetLang = languageCodeMap[input.targetLanguageCode.toLowerCase()] || input.targetLanguageCode.toUpperCase();
        const sourceLang = input.sourceLanguageCode ? languageCodeMap[input.sourceLanguageCode.toLowerCase()] : undefined;

        const params = new URLSearchParams();
        input.texts.forEach(text => params.append('text', text));
        params.append('target_lang', targetLang);
        if (sourceLang) {
          params.append('source_lang', sourceLang);
        }

        // Resolve DeepL key for multiple translations as well
        let deeplKeyMulti: string | null = null;
        if (input.tenantId) {
          try {
            const aiSettings = await TenantSettingsService.getAiSettings(input.tenantId);
            // Check both top-level column and metadata
            const topLevelKey = (aiSettings as any)?.deeplApiKey;
            const metadataKey = (aiSettings?.metadata as any)?.deeplApiKey;
            const tenantKey = topLevelKey || metadataKey;
            if (tenantKey && typeof tenantKey === 'string' && tenantKey.trim()) {
              // Tenant has its own DeepL API key, use it
              deeplKeyMulti = tenantKey.trim();
              console.log('[DeepL] Using tenant-specific API key (multiple translations)');
            } else {
              // Tenant doesn't have its own key, check if admin granted permission to use env key
              const { TenantFeaturesService } = await import('./tenant-features.service');
              const hasDeeplFeature = await TenantFeaturesService.hasFeature(input.tenantId, 'deepl');
              if (hasDeeplFeature && DEFAULT_DEEPL_API_KEY) {
                // Admin granted permission and env key exists, use env key
                deeplKeyMulti = DEFAULT_DEEPL_API_KEY;
                console.log('[DeepL] Using environment API key (admin permission granted, multiple translations)');
              } else if (!hasDeeplFeature) {
                throw new Error('DeepL API key not configured for tenant and admin permission not granted. Please configure your own DeepL API key or request admin permission.');
              } else {
                throw new Error('DeepL API key not configured. Please configure your DeepL API key in AI settings.');
              }
            }
          } catch (err) {
            if (err instanceof Error && err.message.includes('DeepL API key')) {
              throw err; // Re-throw our custom errors
            }
            console.error('[DeepL] Failed to load tenant AI settings for DeepL key:', err);
            throw new Error('Failed to load DeepL configuration. Please try again.');
          }
        } else {
          // No tenantId, use env key directly
          deeplKeyMulti = DEFAULT_DEEPL_API_KEY;
          if (!deeplKeyMulti) {
            throw new Error('DeepL API key not configured in environment');
          }
        }

        if (!deeplKeyMulti) {
          throw new Error('DeepL API key not configured for tenant or environment');
        }

        const response = await axios.post<DeepLTranslationResponse>(
          DEEPL_API_URL,
          params.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `DeepL-Auth-Key ${deeplKeyMulti}`,
            },
          }
        );

        return response.data.translations.map(t => t.text);
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 429) {
          // Re-throw to trigger retry
          throw error;
        }
        console.error('DeepL multiple translation error:', error);
        if (axios.isAxiosError(error)) {
          throw new Error(`DeepL API error: ${error.response?.status} - ${error.response?.statusText} - ${JSON.stringify(error.response?.data)}`);
        }
        throw error;
      }
    });
  }
}

