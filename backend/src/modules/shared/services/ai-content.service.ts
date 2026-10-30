import axios from 'axios';
import { TranslationService } from './translation.service';
import { LanguageService } from './language.service';

export type DestinationContentInput = {
  title: string;
};

export type BlogContentInput = {
  title: string;
};

export type LanguageContent = {
  title: string;
  short_description: string;
  description: string;
};

export type BlogLanguageContent = {
  title: string;
  content: string;
};

export type GeneratedContentResponse = {
  [languageCode: string]: LanguageContent;
};

export type GeneratedBlogContentResponse = {
  [languageCode: string]: BlogLanguageContent;
};

/**
 * AI Content Generation Service
 * Generates Turkish content using OpenAI API and translates to other languages
 */
export class AiContentService {
  private static readonly OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
  
  /**
   * Validate if API key looks like a valid OpenAI key
   * OpenAI keys typically start with 'sk-' or 'sk-proj-'
   */
  private static isValidOpenAiKey(key: string): boolean {
    if (!key || typeof key !== 'string') {
      console.warn('[AI] Key validation failed: key is not a string', { key: typeof key });
      return false;
    }
    const trimmed = key.trim();
    
    // Reject empty keys
    if (trimmed.length === 0) {
      console.warn('[AI] Key validation failed: key is empty');
      return false;
    }
    
    // Reject common test/placeholder values (case-insensitive)
    const invalidKeys = ['Password123!', 'password123', 'test', 'test123', 'sk-test', 'password', '123456'];
    const lowerTrimmed = trimmed.toLowerCase();
    if (invalidKeys.some(invalid => lowerTrimmed === invalid.toLowerCase())) {
      console.warn(`[AI] Key validation failed: key matches invalid pattern: "${trimmed}"`);
      return false;
    }
    
    // Valid OpenAI keys MUST start with 'sk-' or 'sk-proj-'
    if (!trimmed.startsWith('sk-')) {
      console.warn(`[AI] Key validation failed: key does not start with "sk-": "${trimmed.substring(0, Math.min(20, trimmed.length))}..."`);
      return false;
    }
    
    // Valid OpenAI keys are typically longer than 20 characters
    if (trimmed.length <= 20) {
      console.warn(`[AI] Key validation failed: key is too short (${trimmed.length} chars, minimum 20): "${trimmed.substring(0, Math.min(20, trimmed.length))}..."`);
      return false;
    }
    
    console.log(`[AI] ✅ Key validation passed: length=${trimmed.length}, prefix=${trimmed.substring(0, 10)}...`);
    return true;
  }

  private static async getOpenAiApiKey(tenantId?: string): Promise<string> {
    console.log(`[AI] Getting OpenAI API key for tenantId: ${tenantId || 'none'}`);
    
    // Try tenant settings first
    if (tenantId) {
      try {
        const aiSettings = await (await import('./tenant-settings.service')).TenantSettingsService.getAiSettings(tenantId);
        console.log(`[AI] AI settings retrieved:`, {
          hasSettings: !!aiSettings,
          hasTopLevelKey: !!(aiSettings as any)?.openaiApiKey,
          hasMetadataKey: !!(aiSettings?.metadata as any)?.openaiApiKey,
          metadataKeys: aiSettings?.metadata ? Object.keys(aiSettings.metadata) : [],
        });
        
        // support either top-level or metadata stored key
        const topLevelKey = (aiSettings as any)?.openaiApiKey;
        const metadataKey = (aiSettings?.metadata as any)?.openaiApiKey;
        const openaiApiKey = topLevelKey || metadataKey;
        
        if (openaiApiKey && typeof openaiApiKey === 'string') {
          const trimmed = openaiApiKey.trim();
          console.log(`[AI] Found key in tenant settings, length: ${trimmed.length}, prefix: ${trimmed.substring(0, Math.min(15, trimmed.length))}...`);
          
          if (this.isValidOpenAiKey(trimmed)) {
            console.log(`[AI] ✅ Using OpenAI API key from tenant AI settings (tenantId: ${tenantId}, key prefix: ${trimmed.substring(0, 10)}...)`);
            return trimmed;
          } else {
            console.warn(`[AI] ❌ Invalid OpenAI API key in tenant AI settings (tenantId: ${tenantId}, key prefix: ${trimmed.substring(0, Math.min(10, trimmed.length))}...), falling back to other sources`);
          }
        } else {
          console.log(`[AI] No OpenAI API key found in tenant AI settings`);
        }
      } catch (error) {
        console.error('[AI] Failed to get AI settings from tenant:', error);
      }
    }
    // Next, try site settings (company info) - allows storing key in "Şirket Bilgileri"
    if (tenantId) {
      try {
        const siteSettings = await (await import('./tenant-settings.service')).TenantSettingsService.getSiteSettings(tenantId);
        const topLevelKey = (siteSettings as any)?.openaiApiKey;
        const metadataKey = (siteSettings?.metadata as any)?.openaiApiKey;
        const siteApiKey = topLevelKey || metadataKey;
        
        if (siteApiKey && typeof siteApiKey === 'string') {
          const trimmed = siteApiKey.trim();
          if (this.isValidOpenAiKey(trimmed)) {
            console.log(`[AI] ✅ Using OpenAI API key from tenant site settings (tenantId: ${tenantId}, key prefix: ${trimmed.substring(0, 10)}...)`);
            return trimmed;
          } else {
            console.warn(`[AI] ❌ Invalid OpenAI API key in tenant site settings (tenantId: ${tenantId}, key prefix: ${trimmed.substring(0, Math.min(10, trimmed.length))}...), falling back to env`);
          }
        }
      } catch (error) {
        console.error('[AI] Failed to get Site settings for OpenAI key from tenant:', error);
      }
    }
    // Fallback to environment variable
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('[AI] ❌ OPENAI_API_KEY environment variable is not set');
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    if (!this.isValidOpenAiKey(apiKey)) {
      console.error(`[AI] ❌ OPENAI_API_KEY in environment variable is not a valid OpenAI API key format (prefix: ${apiKey.substring(0, Math.min(10, apiKey.length))}...)`);
      throw new Error('OPENAI_API_KEY in environment variable is not a valid OpenAI API key format');
    }
    console.log(`[AI] ✅ Using OpenAI API key from environment variable (key prefix: ${apiKey.substring(0, 10)}...)`);
    return apiKey;
  }

  /**
   * Generate prompt for Turkish content generation
   */
  private static buildTurkishContentPrompt(title: string): string {
    return `Sen bir turizm ve destinasyon içerik uzmanısın. Aşağıdaki destinasyon başlığı için profesyonel, SEO uyumlu ve satış odaklı Türkçe içerik üret.

DESTİNASYON BAŞLIĞI: "${title}"

GEREKSİNİMLER:
1. short_description: Maksimum 160 karakter, destinasyonun öne çıkan özelliklerini vurgulayan kısa ve çekici açıklama
2. description: 2-3 paragraftan oluşan, destinasyonun tarihi, kültürel özellikleri, doğal güzellikleri, turistik aktiviteler ve neden ziyaret edilmesi gerektiğini anlatan detaylı açıklama

KURALLAR:
- Turizm/destinasyon dili kullan
- SEO uyumlu olmalı (anahtar kelimeler doğal şekilde kullanılmalı)
- Profesyonel ve satış odaklı ton
- Emoji kullanma
- Gerçekçi ve bilgilendirici olmalı
- Türkçe yazım kurallarına uygun

ÇIKTI FORMATI (JSON):
{
  "title": "${title}",
  "short_description": "...",
  "description": "..."
}

Sadece JSON döndür, başka açıklama yapma.`;
  }

  /**
   * Generate Turkish content using OpenAI
   */
  private static async generateTurkishContent(title: string, tenantId?: string): Promise<LanguageContent> {
    try {
      const prompt = this.buildTurkishContentPrompt(title);
      
      const apiKey = await this.getOpenAiApiKey(tenantId);
      const response = await axios.post(
        this.OPENAI_API_URL,
        {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Sen bir turizm içerik uzmanısın. Türkçe içerik üretiyorsun ve sadece JSON formatında yanıt veriyorsun.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 1000,
          response_format: { type: 'json_object' },
          },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('OpenAI API returned no content');
      }

      const parsedContent = JSON.parse(content) as LanguageContent;
      
      // Validate required fields
      if (!parsedContent.title || !parsedContent.short_description || !parsedContent.description) {
        throw new Error('OpenAI API returned incomplete content');
      }

      // Ensure short_description is max 160 characters
      if (parsedContent.short_description.length > 160) {
        parsedContent.short_description = parsedContent.short_description.substring(0, 157) + '...';
      }

      return parsedContent;
    } catch (error) {
      console.error('OpenAI content generation error:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(
          `OpenAI API error: ${error.response?.status} - ${error.response?.statusText} - ${JSON.stringify(error.response?.data)}`
        );
      }
      throw error;
    }
  }

  /**
   * Check if DeepL translation is enabled for tenant
   */
  private static async isDeepLTranslationEnabled(tenantId?: string): Promise<boolean> {
    if (!tenantId) {
      return false; // No tenant = no DeepL
    }
    try {
      const aiSettings = await (await import('./tenant-settings.service')).TenantSettingsService.getAiSettings(tenantId);
      const useDeepL = (aiSettings?.metadata as any)?.useDeepLTranslation;
      return useDeepL === true;
    } catch (error) {
      console.error('[AI] Failed to check DeepL translation setting:', error);
      return false;
    }
  }

  /**
   * Translate content to multiple languages
   */
  private static async translateContent(
    turkishContent: LanguageContent,
    targetLanguageCode: string,
    tenantId?: string
  ): Promise<LanguageContent> {
    // Check if DeepL translation is enabled for this tenant
    const useDeepL = await this.isDeepLTranslationEnabled(tenantId);
    if (!useDeepL) {
      console.log(`[AI] DeepL translation is disabled for tenant ${tenantId || 'none'}, skipping translation to ${targetLanguageCode}`);
      // Return original content if DeepL is disabled
      // This means only the source language content will be generated
      throw new Error(`DeepL translation is disabled. Please enable it in AI settings to translate to ${targetLanguageCode}.`);
    }

    try {
      // Translate all three fields
        const [title, shortDescription, description] = await Promise.all([
        TranslationService.translateText({
          text: turkishContent.title,
          targetLanguageCode,
          sourceLanguageCode: 'tr',
          tenantId,
        }),
        TranslationService.translateText({
          text: turkishContent.short_description,
          targetLanguageCode,
          sourceLanguageCode: 'tr',
          tenantId,
        }),
        TranslationService.translateText({
          text: turkishContent.description,
          targetLanguageCode,
          sourceLanguageCode: 'tr',
          tenantId,
        }),
      ]);

      return {
        title,
        short_description: shortDescription,
        description,
      };
    } catch (error) {
      console.error(`Translation error for language ${targetLanguageCode}:`, error);
      throw new Error(`Failed to translate content to ${targetLanguageCode}: ${(error as Error).message}`);
    }
  }

  /**
   * Generate destination content in all available languages
   * Step 1: Generate Turkish content using AI
   * Step 2: Translate to all other active languages
   */
  static async generateDestinationContent(
    input: DestinationContentInput,
    tenantId?: string
  , sourceLanguageCode?: string
  ): Promise<GeneratedContentResponse> {
    try {
      const { title } = input;

      if (!title || !title.trim()) {
        throw new Error('Title is required');
      }

      console.log(`[AI] Starting content generation for destination: "${title}", tenantId: ${tenantId || 'none'}, language: ${sourceLanguageCode || 'tr'}`);

      // Check AI feature if tenantId is provided
      if (tenantId) {
        const { TenantFeaturesService } = await import('./tenant-features.service');
        const hasAiFeature = await TenantFeaturesService.hasFeature(tenantId, 'ai');
        if (!hasAiFeature) {
          throw new Error('AI feature is not enabled for this tenant. Please contact your administrator.');
        }
        console.log(`[AI] AI feature is enabled for tenant: ${tenantId}`);
        
        // Also check if AI is enabled in tenant settings (aiEnabled flag)
        try {
          const aiSettings = await (await import('./tenant-settings.service')).TenantSettingsService.getAiSettings(tenantId);
          const aiEnabled = (aiSettings?.metadata as any)?.aiEnabled;
          if (aiEnabled !== true) {
            throw new Error('AI content generation is disabled in tenant settings. Please enable it in AI Settings.');
          }
          console.log(`[AI] AI is enabled in tenant settings for tenant: ${tenantId}`);
        } catch (error) {
          if (error instanceof Error && error.message.includes('AI content generation is disabled')) {
            throw error;
          }
          console.warn(`[AI] Failed to check AI settings, continuing anyway:`, error);
        }
      }

      // Step 1: Generate content in requested source language (default to 'tr' if not provided)
      const srcLang = sourceLanguageCode || 'tr';
      console.log(`[AI] Generating content in language: ${srcLang}`);
      const sourceContent = await this.generateContentInLanguage(title.trim(), srcLang, tenantId);
      console.log(`[AI] ✅ Content generated successfully for language: ${srcLang}`);

      // Step 2: Get all active languages from database
      const allLanguages = await LanguageService.list();
      const activeLanguages = allLanguages.filter(lang => lang.isActive && lang.code !== srcLang);

      // Step 3: Check if DeepL translation is enabled
      const useDeepL = await this.isDeepLTranslationEnabled(tenantId);
      console.log(`[AI] DeepL translation enabled: ${useDeepL} for tenant: ${tenantId || 'none'}`);

      // Step 4: Translate source content to all other active languages (only if DeepL is enabled)
      const translations = useDeepL
        ? await Promise.all(
            activeLanguages.map(async (language) => {
              try {
                const translatedContent = await this.translateContent(sourceContent, language.code, tenantId);
                return {
                  languageCode: language.code,
                  content: translatedContent,
                };
              } catch (error) {
                console.error(`[AI] Failed to translate to ${language.code}:`, error);
                return null;
              }
            })
          )
        : []; // If DeepL is disabled, return empty array (only source language content will be returned)

      // Build final response
      const result: GeneratedContentResponse = {
        [srcLang]: sourceContent,
      };

      // Add translations (filter out null results)
      translations.forEach((translation) => {
        if (translation) {
          result[translation.languageCode] = translation.content;
        }
      });

      console.log(`[AI] ✅ Content generation completed successfully for ${Object.keys(result).length} languages`);
      return result;
    } catch (error) {
      console.error('[AI] ❌ Content generation error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[AI] Error details:', {
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        tenantId,
        title: input.title,
      });
      throw error;
    }
  }

  /**
   * Generate content in arbitrary language (short_description + description)
   */
  private static async generateContentInLanguage(title: string, languageCode: string, tenantId?: string): Promise<LanguageContent> {
    try {
      // Build a generic prompt that requests output in the requested language
      const prompt = `You are a travel and destination content expert. Produce professional, SEO-friendly and sales-oriented content in ${languageCode} for the destination title below.

DESTINATION TITLE: "${title}"

REQUIREMENTS:
1. short_description: max 160 characters, highlight key features
2. description: 2-3 paragraphs describing history, attractions, activities, reasons to visit

RULES:
- Use the specified language (${languageCode})
- No emojis
- Return JSON only with keys: title, short_description, description

OUTPUT FORMAT:
{
  "title": "${title}",
  "short_description": "...",
  "description": "..."
}

Only return JSON.`;

      const apiKey = await this.getOpenAiApiKey(tenantId);
      
      // Final validation before using the key
      if (!this.isValidOpenAiKey(apiKey)) {
        console.error(`[AI] ❌ CRITICAL: Invalid API key detected before API call! Key prefix: ${apiKey.substring(0, Math.min(20, apiKey.length))}...`);
        throw new Error('Invalid OpenAI API key format. Please check your API key configuration.');
      }
      
      console.log(`[AI] Making OpenAI API request with key prefix: ${apiKey.substring(0, 10)}...`);
      
      const response = await axios.post(
        this.OPENAI_API_URL,
        {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a travel content expert. Respond only with JSON as requested.`,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 1000,
          response_format: { type: 'json_object' },
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('OpenAI API returned no content');
      }

      const parsedContent = JSON.parse(content) as LanguageContent;
      if (!parsedContent.title || !parsedContent.short_description || !parsedContent.description) {
        throw new Error('OpenAI API returned incomplete content');
      }
      if (parsedContent.short_description.length > 160) {
        parsedContent.short_description = parsedContent.short_description.substring(0, 157) + '...';
      }
      return parsedContent;
    } catch (error) {
      console.error('generateContentInLanguage error:', error);
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const statusText = error.response?.statusText;
        const errorData = error.response?.data;
        const errorMessage = errorData?.error?.message || JSON.stringify(errorData);
        console.error(`[AI] OpenAI API error details:`, {
          status,
          statusText,
          message: errorMessage,
          tenantId,
          languageCode,
        });
        throw new Error(`OpenAI API error: ${status} - ${statusText} - ${errorMessage}`);
      }
      throw error;
    }
  }

  /**
   * Generate prompt for Turkish blog content generation
   */
  private static buildTurkishBlogPrompt(title: string): string {
    return `Sen bir blog içerik uzmanısın. Aşağıdaki blog başlığı için profesyonel, SEO uyumlu ve okunabilir Türkçe blog yazısı üret.

BLOG BAŞLIĞI: "${title}"

GEREKSİNİMLER:
1. title: Başlık (verilen başlığı kullan)
2. content: 3-5 paragraftan oluşan, konuyu detaylı şekilde anlatan, bilgilendirici ve ilgi çekici blog yazısı içeriği

KURALLAR:
- Blog dili kullan (samimi ama profesyonel ton)
- SEO uyumlu olmalı (anahtar kelimeler doğal şekilde kullanılmalı)
- Okunabilir paragraflar (her paragraf 3-5 cümle)
- İlgi çekici giriş ve sonuç paragrafı
- Bilgilendirici ve değerli içerik
- Emoji kullanma
- Türkçe yazım kurallarına uygun
- HTML etiketleri kullanma (düz metin)

ÇIKTI FORMATI (JSON):
{
  "title": "${title}",
  "content": "..."
}

Sadece JSON döndür, başka açıklama yapma.`;
  }

  /**
   * Generate Turkish blog content using OpenAI
   */
  private static async generateTurkishBlogContent(title: string): Promise<BlogLanguageContent> {
    try {
      const prompt = this.buildTurkishBlogPrompt(title);
      
      const response = await axios.post(
        this.OPENAI_API_URL,
        {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Sen bir blog içerik uzmanısın. Türkçe blog yazısı üretiyorsun ve sadece JSON formatında yanıt veriyorsun.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
          response_format: { type: 'json_object' },
          },
        {
          headers: {
            'Authorization': `Bearer ${this.getOpenAiApiKey()}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('OpenAI API returned no content');
      }

      const parsedContent = JSON.parse(content) as BlogLanguageContent;
      
      // Validate required fields
      if (!parsedContent.title || !parsedContent.content) {
        throw new Error('OpenAI API returned incomplete content');
      }

      return parsedContent;
    } catch (error) {
      console.error('OpenAI blog content generation error:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(
          `OpenAI API error: ${error.response?.status} - ${error.response?.statusText} - ${JSON.stringify(error.response?.data)}`
        );
      }
      throw error;
    }
  }

  /**
   * Translate blog content to multiple languages
   */
  private static async translateBlogContent(
    turkishContent: BlogLanguageContent,
    targetLanguageCode: string
  ): Promise<BlogLanguageContent> {
    try {
      // Translate title and content
      const [title, content] = await Promise.all([
        TranslationService.translateText({
          text: turkishContent.title,
          targetLanguageCode,
          sourceLanguageCode: 'tr',
        }),
        TranslationService.translateText({
          text: turkishContent.content,
          targetLanguageCode,
          sourceLanguageCode: 'tr',
        }),
      ]);

      return {
        title,
        content,
      };
    } catch (error) {
      console.error(`Translation error for language ${targetLanguageCode}:`, error);
      throw new Error(`Failed to translate blog content to ${targetLanguageCode}: ${(error as Error).message}`);
    }
  }

  /**
   * Generate blog content in all available languages
   * Step 1: Generate Turkish content using AI
   * Step 2: Translate to all other active languages
   */
  static async generateBlogContent(
    input: BlogContentInput,
    tenantId?: string
  ): Promise<GeneratedBlogContentResponse> {
    try {
      const { title } = input;

      if (!title || !title.trim()) {
        throw new Error('Title is required');
      }

      // Check AI feature if tenantId is provided
      if (tenantId) {
        const { TenantFeaturesService } = await import('./tenant-features.service');
        const hasAiFeature = await TenantFeaturesService.hasFeature(tenantId, 'ai');
        if (!hasAiFeature) {
          throw new Error('AI feature is not enabled for this tenant. Please contact your administrator.');
        }
      }

      // Step 1: Generate Turkish content using AI
      const turkishContent = await this.generateTurkishBlogContent(title.trim());

      // Step 2: Get all active languages from database
      const allLanguages = await LanguageService.list();
      const activeLanguages = allLanguages.filter(lang => lang.isActive && lang.code !== 'tr');

      // Step 3: Translate Turkish content to all other active languages
      const translations = await Promise.all(
        activeLanguages.map(async (language) => {
          try {
            const translatedContent = await this.translateBlogContent(turkishContent, language.code);
            return {
              languageCode: language.code,
              content: translatedContent,
            };
          } catch (error) {
            console.error(`Failed to translate to ${language.code}:`, error);
            // Skip failed translations but continue with others
            return null;
          }
        })
      );

      // Build final response
      const result: GeneratedBlogContentResponse = {
        tr: turkishContent,
      };

      // Add translations (filter out null results)
      translations.forEach((translation) => {
        if (translation) {
          result[translation.languageCode] = translation.content;
        }
      });

      return result;
    } catch (error) {
      console.error('Blog content generation error:', error);
      throw error;
    }
  }
}

