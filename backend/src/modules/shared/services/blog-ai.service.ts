import axios from 'axios';
import crypto from 'crypto';
import { TranslationService } from './translation.service';
import { LanguageService } from './language.service';
import { TenantSettingsService } from './tenant-settings.service';
import { getRedisClient } from '../../../config/redis.config';

export type BlogTone = 'kurumsal' | 'samimi' | 'satis';

export type BlogAiInput = {
  title: string;
  tone?: BlogTone;
  regenerate?: boolean; // Manual regenerate flag - bypasses cache
  tenantId: string; // Required for tenant-specific AI settings
  sourceLanguageCode?: string;
};

export type BlogAiContent = {
  title: string;
  short_description: string;
  content: string;
  seo_keywords: {
    primary: string;
    secondary: string[];
  };
};

export type BlogAiResponse = {
  [languageCode: string]: BlogAiContent;
};

/**
 * Blog AI Content Generation Service
 * Generates Turkish blog content with SEO keywords and translates to all languages
 * Includes caching to reduce AI costs
 */
export class BlogAiService {
  private static readonly OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
  private static readonly CACHE_PREFIX = 'blog_ai:';
  private static readonly CACHE_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

  /**
   * Validate if API key looks like a valid OpenAI key
   * OpenAI keys typically start with 'sk-' or 'sk-proj-'
   */
  private static isValidOpenAiKey(key: string): boolean {
    if (!key || typeof key !== 'string') return false;
    const trimmed = key.trim();
    // Reject common test/placeholder values
    const invalidKeys = ['Password123!', 'password123', 'test', 'test123', 'sk-test'];
    if (invalidKeys.some(invalid => trimmed.toLowerCase() === invalid.toLowerCase())) {
      return false;
    }
    // Valid OpenAI keys start with 'sk-' or 'sk-proj-'
    return trimmed.startsWith('sk-') && trimmed.length > 20;
  }

  /**
   * Get OpenAI API key from tenant settings or fallback to env
   */
  private static async getOpenAiApiKey(tenantId: string): Promise<string> {
    try {
      // Try to get from tenant settings first
      const aiSettings = await TenantSettingsService.getAiSettings(tenantId);
      const aiKey = (aiSettings as any)?.openaiApiKey || (aiSettings?.metadata as any)?.openaiApiKey;
      if (aiKey && typeof aiKey === 'string' && this.isValidOpenAiKey(aiKey)) {
        return aiKey.trim();
      }
      // Next, try site settings (category = site) top-level or metadata
      try {
        const siteSettings = await TenantSettingsService.getSiteSettings(tenantId);
        const siteKey = (siteSettings as any)?.openaiApiKey || (siteSettings?.metadata as any)?.openaiApiKey;
        if (siteKey && typeof siteKey === 'string' && this.isValidOpenAiKey(siteKey)) {
          return siteKey.trim();
        }
      } catch (err) {
        // ignore and fallback to env
      }
    } catch (error) {
      console.error('Failed to get AI settings from tenant:', error);
    }

    // Fallback to environment variable
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not found in tenant settings or environment variables');
    }
    if (!this.isValidOpenAiKey(apiKey)) {
      throw new Error('OPENAI_API_KEY in environment variable is not a valid OpenAI API key format');
    }
    return apiKey;
  }

  /**
   * Check if AI is enabled for tenant
   */
  private static async isAiEnabled(tenantId: string): Promise<boolean> {
    try {
      const aiSettings = await TenantSettingsService.getAiSettings(tenantId);
      if (aiSettings?.metadata) {
        const aiEnabled = (aiSettings.metadata as any)?.aiEnabled;
        return aiEnabled === true;
      }
    } catch (error) {
      console.error('Failed to check AI settings:', error);
    }

    // Default: AI is enabled if tenant settings don't exist (backward compatibility)
    return true;
  }

  /**
   * Generate cache key from title, tone, language, and keywords
   */
  private static generateCacheKey(
    title: string,
    tone: BlogTone,
    languageCode: string,
    keywords?: string
  ): string {
    const keyString = `${title}|${tone}|${languageCode}|${keywords || ''}`;
    const hash = crypto.createHash('sha256').update(keyString).digest('hex');
    return `${this.CACHE_PREFIX}${hash}`;
  }

  /**
   * Get content from cache
   */
  private static async getFromCache(cacheKey: string): Promise<BlogAiContent | null> {
    try {
      const redis = getRedisClient();
      if (!redis) {
        return null; // Redis disabled or not available
      }
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as BlogAiContent;
      }
    } catch (error) {
      // Silently ignore cache errors
    }
    return null;
  }

  /**
   * Store content in cache
   */
  private static async setCache(cacheKey: string, content: BlogAiContent): Promise<void> {
    try {
      const redis = getRedisClient();
      if (!redis) {
        return; // Redis disabled or not available
      }
      await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(content));
    } catch (error) {
      // Silently ignore cache errors
    }
  }

  /**
   * Invalidate cache for a specific title+tone combination
   */
  private static async invalidateCache(title: string, tone: BlogTone): Promise<void> {
    try {
      const redis = getRedisClient();
      if (!redis) {
        return; // Redis disabled or not available
      }
      const pattern = `${this.CACHE_PREFIX}*`;
      const keys = await redis.keys(pattern);
      
      // Delete all cache entries for this title+tone (all languages)
      const deletePromises = keys.map(async (key) => {
        const cached = await redis.get(key);
        if (cached) {
          try {
            const content = JSON.parse(cached) as BlogAiContent;
            // Check if title matches (fuzzy match)
            if (content.title.toLowerCase().includes(title.toLowerCase())) {
              await redis.del(key);
            }
          } catch {
            // Ignore parse errors
          }
        }
      });
      
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  /**
   * Extract SEO keywords from title
   */
  private static extractKeywords(title: string): { primary: string; secondary: string[] } {
    // Remove common Turkish stop words
    const stopWords = ['ve', 'ile', 'için', 'bir', 'bu', 'şu', 'o', 'de', 'da', 'den', 'dan', 'in', 'ın', 'un', 'ün'];
    
    // Extract words from title
    const words = title
      .toLowerCase()
      .replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));

    // Primary keyword is the longest meaningful word or first word
    const primary = words.length > 0 ? words[0] : title.toLowerCase().split(/\s+/)[0];
    
    // Secondary keywords are other meaningful words (max 4)
    const secondary = words
      .filter(word => word !== primary)
      .slice(0, 4);

    return { primary, secondary };
  }

  /**
   * Build tone-specific system message
   */
  private static getToneSystemMessage(tone: BlogTone): string {
    const toneMessages: Record<BlogTone, string> = {
      kurumsal: 'Sen profesyonel bir kurumsal blog yazarısın. Resmi, güven veren, bilgilendirici ve profesyonel bir ton kullan. Okuyucuya değerli bilgi sun.',
      samimi: 'Sen samimi ve sıcak bir blog yazarısın. Kullanıcı dostu, sohbet dili kullanan, okuyucuyla arkadaş gibi konuşan bir ton kullan. Sıcak ve yakın bir dil kullan.',
      satis: 'Sen satış odaklı bir blog yazarısın. İkna edici, dönüşüm odaklı, CTA (call-to-action) içeren, okuyucuyu harekete geçiren bir ton kullan. Satış ve dönüşüm odaklı yaz.',
    };
    return toneMessages[tone];
  }

  /**
   * Build Turkish blog content generation prompt with SEO
   */
  private static buildTurkishBlogPrompt(
    title: string,
    tone: BlogTone,
    keywords: { primary: string; secondary: string[] }
  ): string {
    const toneDescription = {
      kurumsal: 'resmi, güven veren, bilgilendirici',
      samimi: 'sıcak, kullanıcı dostu, sohbet dili',
      satis: 'ikna edici, CTA içeren, dönüşüm odaklı',
    }[tone];

    return `Sen bir SEO uzmanı ve blog içerik yazarısın. Aşağıdaki blog başlığı için ${toneDescription} tonunda, SEO uyumlu, özgün Türkçe blog yazısı üret.

BLOG BAŞLIĞI: "${title}"

ANA ANAHTAR KELİME: "${keywords.primary}"
YARDIMCI ANAHTAR KELİMELER: ${keywords.secondary.join(', ')}

GEREKSİNİMLER:
1. title: Verilen başlığı kullan (değiştirme)
2. short_description: Maksimum 160 karakter, blog yazısının özeti, ana fikir ve değer önerisi
3. content: Minimum 600 kelime, SEO uyumlu, HTML formatında blog yazısı içeriği
   - H2 ve H3 başlıklar kullan (en az 2 H2, 3-4 H3)
   - Giriş paragrafı (hook içermeli)
   - Ana içerik bölümleri (H2 başlıkları altında)
   - Alt bölümler (H3 başlıkları altında)
   - Sonuç paragrafı (özet ve CTA)
   - Ana keyword'ü başlıklarda ve ilk paragrafta kullan
   - Yardımcı keyword'leri doğal akışta kullan
   - Keyword density %2-3 arası (spam yapma)
4. seo_keywords: Ana ve yardımcı keyword'ler (verilen keyword'leri kullan)

KURALLAR:
- ${toneDescription} ton kullan
- %100 özgün içerik (kopya yapma)
- SEO uyumlu (anahtar kelimeler doğal şekilde)
- HTML formatında (H2, H3, <p> etiketleri)
- Minimum 600 kelime
- İnsan yazımı gibi doğal
- Emoji kullanma
- Türkçe yazım kurallarına uygun
- Spam keyword kullanma (doğal akış)

ÇIKTI FORMATI (JSON):
{
  "title": "${title}",
  "short_description": "...",
  "content": "<h2>Başlık</h2><p>İçerik...</p>...",
  "seo_keywords": {
    "primary": "${keywords.primary}",
    "secondary": ["${keywords.secondary.join('", "')}"]
  }
}

Sadece JSON döndür, başka açıklama yapma.`;
  }

  /**
   * Generate Turkish blog content using OpenAI
   */
  private static async generateTurkishBlogContent(
    title: string,
    tone: BlogTone,
    keywords: { primary: string; secondary: string[] },
    tenantId: string,
    useCache: boolean = true
  ): Promise<BlogAiContent> {
    // Check cache first (if not regenerating)
    if (useCache) {
      const cacheKey = this.generateCacheKey(title, tone, 'tr', keywords.primary);
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        console.log('✅ Using cached Turkish blog content');
        return cached;
      }
    }

    try {
      const prompt = this.buildTurkishBlogPrompt(title, tone, keywords);
      const systemMessage = this.getToneSystemMessage(tone);

      const apiKey = await this.getOpenAiApiKey(tenantId);

      const response = await axios.post(
        this.OPENAI_API_URL,
        {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: systemMessage,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.8, // Higher temperature for more variation
          max_tokens: 3000,
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

      const parsedContent = JSON.parse(content) as BlogAiContent;

      // Validate required fields
      if (!parsedContent.title || !parsedContent.short_description || !parsedContent.content) {
        throw new Error('OpenAI API returned incomplete content');
      }

      // Ensure short_description is max 160 characters
      if (parsedContent.short_description.length > 160) {
        parsedContent.short_description = parsedContent.short_description.substring(0, 157) + '...';
      }

      // Ensure minimum word count
      const wordCount = parsedContent.content.replace(/<[^>]*>/g, ' ').split(/\s+/).length;
      if (wordCount < 600) {
        console.warn(`⚠️  Generated content has only ${wordCount} words, minimum 600 required`);
      }

      // Cache the result
      if (useCache) {
        const cacheKey = this.generateCacheKey(title, tone, 'tr', keywords.primary);
        await this.setCache(cacheKey, parsedContent);
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
   * Generate blog content in arbitrary language (similar to Turkish generator but language-aware)
   */
  private static async generateBlogContentInLanguage(
    title: string,
    tone: BlogTone,
    keywords: { primary: string; secondary: string[] },
    tenantId: string,
    languageCode: string,
    useCache: boolean = true
  ): Promise<BlogAiContent> {
    // For caching key use languageCode
    if (useCache) {
      const cacheKey = this.generateCacheKey(title, tone, languageCode, keywords.primary);
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        console.log(`✅ Using cached blog content for language ${languageCode}`);
        return cached;
      }
    }

    try {
      const prompt = `You are a professional blog content writer. Produce a SEO-friendly blog article in ${languageCode} for the following title.

TITLE: "${title}"

REQUIREMENTS:
1. short_description: max 160 chars
2. content: minimum 600 words with H2/H3 sections, HTML allowed

Return JSON only: { "title":"...", "short_description":"...", "content":"..." }`;

      const apiKey = await this.getOpenAiApiKey(tenantId);

      const response = await axios.post(
        this.OPENAI_API_URL,
        {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: this.getToneSystemMessage(tone) },
            { role: 'user', content: prompt },
          ],
          temperature: 0.8,
          max_tokens: 3000,
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
      if (!content) throw new Error('OpenAI API returned no content');
      const parsedContent = JSON.parse(content) as BlogAiContent;
      if (!parsedContent.title || !parsedContent.short_description || !parsedContent.content) {
        throw new Error('OpenAI API returned incomplete content');
      }

      // Cache
      if (useCache) {
        const cacheKey = this.generateCacheKey(title, tone, languageCode, keywords.primary);
        await this.setCache(cacheKey, parsedContent);
      }

      return parsedContent;
    } catch (error) {
      console.error('generateBlogContentInLanguage error:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`OpenAI API error: ${error.response?.status} - ${error.response?.statusText} - ${JSON.stringify(error.response?.data)}`);
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
      console.error('[BlogAI] Failed to check DeepL translation setting:', error);
      return false;
    }
  }

  /**
   * Translate blog content to target language
   */
  private static async translateBlogContent(
    turkishContent: BlogAiContent,
    targetLanguageCode: string,
    tone: BlogTone,
    useCache: boolean = true,
    tenantId?: string
  ): Promise<BlogAiContent> {
    // Check if DeepL translation is enabled for this tenant
    const useDeepL = await this.isDeepLTranslationEnabled(tenantId);
    if (!useDeepL) {
      console.log(`[BlogAI] DeepL translation is disabled for tenant ${tenantId || 'none'}, skipping translation to ${targetLanguageCode}`);
      throw new Error(`DeepL translation is disabled. Please enable it in AI settings to translate to ${targetLanguageCode}.`);
    }

    // Check cache first
    if (useCache) {
      const cacheKey = this.generateCacheKey(
        turkishContent.title,
        tone,
        targetLanguageCode,
        turkishContent.seo_keywords.primary
      );
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        console.log(`✅ Using cached translation for ${targetLanguageCode}`);
        return cached;
      }
    }

    try {
      // Translate all fields while preserving SEO structure
      const [title, shortDescription, content] = await Promise.all([
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
          text: turkishContent.content,
          targetLanguageCode,
          sourceLanguageCode: 'tr',
          tenantId,
        }),
      ]);

      // Translate keywords
      const [primaryKeyword, ...secondaryKeywords] = await Promise.all([
        TranslationService.translateText({
          text: turkishContent.seo_keywords.primary,
          targetLanguageCode,
          sourceLanguageCode: 'tr',
        }),
        ...turkishContent.seo_keywords.secondary.map(keyword =>
          TranslationService.translateText({
            text: keyword,
            targetLanguageCode,
            sourceLanguageCode: 'tr',
          })
        ),
      ]);

      const translatedContent: BlogAiContent = {
        title,
        short_description: shortDescription.length > 160 
          ? shortDescription.substring(0, 157) + '...' 
          : shortDescription,
        content,
        seo_keywords: {
          primary: primaryKeyword,
          secondary: secondaryKeywords,
        },
      };

      // Cache the translation
      if (useCache) {
        const cacheKey = this.generateCacheKey(
          turkishContent.title,
          tone,
          targetLanguageCode,
          turkishContent.seo_keywords.primary
        );
        await this.setCache(cacheKey, translatedContent);
      }

      return translatedContent;
    } catch (error) {
      console.error(`Translation error for language ${targetLanguageCode}:`, error);
      throw new Error(`Failed to translate blog content to ${targetLanguageCode}: ${(error as Error).message}`);
    }
  }

  /**
   * Generate blog content in all available languages
   * Main entry point for blog AI content generation
   */
  static async generateBlogContent(input: BlogAiInput): Promise<BlogAiResponse> {
    try {
      const { title, tone = 'kurumsal', regenerate = false, tenantId } = input;

      if (!title || !title.trim()) {
        throw new Error('Title is required');
      }

      if (!tenantId) {
        throw new Error('tenantId is required');
      }

      // Check if AI feature is enabled for this tenant
      const { TenantFeaturesService } = await import('./tenant-features.service');
      const hasAiFeature = await TenantFeaturesService.hasFeature(tenantId, 'ai');
      if (!hasAiFeature) {
        throw new Error('AI feature is not enabled for this tenant. Please contact your administrator.');
      }

      // Check if AI is enabled in tenant settings (for backward compatibility)
      const aiEnabled = await this.isAiEnabled(tenantId);
      if (!aiEnabled) {
        throw new Error('AI content generation is disabled in tenant settings');
      }

      const trimmedTitle = title.trim();

      // Extract SEO keywords from title
      const keywords = this.extractKeywords(trimmedTitle);

      // Invalidate cache if regenerating
      if (regenerate) {
        await this.invalidateCache(trimmedTitle, tone);
      }

      // Step 1: Generate source language content using AI (default tr)
      const srcLang = (input as any).sourceLanguageCode || 'tr';
      console.log(`🤖 Generating blog content for: "${trimmedTitle}" (tone: ${tone}, lang: ${srcLang}, tenant: ${tenantId})`);
      let sourceContent: BlogAiContent;
      if (srcLang === 'tr') {
        sourceContent = await this.generateTurkishBlogContent(
          trimmedTitle,
          tone,
          keywords,
          tenantId,
          !regenerate // Use cache unless regenerating
        );
      } else {
        sourceContent = await this.generateBlogContentInLanguage(
          trimmedTitle,
          tone,
          keywords,
          tenantId,
          srcLang,
          !regenerate
        );
      }

      // Step 2: Get all active languages from database
      const allLanguages = await LanguageService.list();
      const activeLanguages = allLanguages.filter(lang => lang.isActive && lang.code !== srcLang);

      // Step 3: Check if DeepL translation is enabled
      const useDeepL = await this.isDeepLTranslationEnabled(tenantId);
      console.log(`[BlogAI] DeepL translation enabled: ${useDeepL} for tenant: ${tenantId || 'none'}`);

      // Step 4: Translate Turkish content to all other active languages (only if DeepL is enabled)
      console.log(`🌍 Translating to ${activeLanguages.length} languages...`);
      const translations = useDeepL
        ? await Promise.all(
            activeLanguages.map(async (language) => {
              try {
                const translatedContent = await this.translateBlogContent(
                  sourceContent,
                  language.code,
                  tone,
                  !regenerate, // Use cache unless regenerating
                  tenantId
                );
                return {
                  languageCode: language.code,
                  content: translatedContent,
                };
              } catch (error) {
                console.error(`[BlogAI] Failed to translate to ${language.code}:`, error);
                // Skip failed translations but continue with others
                return null;
              }
            })
          )
        : []; // If DeepL is disabled, return empty array (only source language content will be returned)

      // Build final response with source language key
      const result: BlogAiResponse = {
        [srcLang]: sourceContent,
      };

      // Add translations (filter out null results)
      translations.forEach((translation) => {
        if (translation) {
          result[translation.languageCode] = translation.content;
        }
      });

      console.log(`✅ Blog content generated for ${Object.keys(result).length} languages`);
      return result;
    } catch (error) {
      console.error('Blog AI content generation error:', error);
      throw error;
    }
  }

  /**
   * Clear all blog AI cache entries
   * @returns Number of keys deleted
   */
  static async clearAllCache(): Promise<number> {
    try {
      const redis = getRedisClient();
      if (!redis) {
        return 0; // Redis disabled or not available
      }
      const pattern = `${this.CACHE_PREFIX}*`;
      const keys = await redis.keys(pattern);
      
      if (keys.length === 0) {
        console.log('ℹ️  No cache entries found');
        return 0;
      }

      // Delete all matching keys
      const deleted = await redis.del(...keys);
      console.log(`✅ Cleared ${deleted} blog AI cache entries`);
      return deleted;
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
      throw error;
    }
  }

  /**
   * Clear cache for a specific tenant (if tenant info is stored in cache)
   * Note: Current implementation doesn't store tenant info in cache keys
   * This method clears all cache as a workaround
   */
  static async clearCacheForTenant(tenantId: string): Promise<number> {
    // Since cache keys don't include tenantId, we clear all cache
    // Future improvement: include tenantId in cache key
    console.log(`⚠️  Clearing all blog AI cache (tenant-specific clearing not yet implemented)`);
    return this.clearAllCache();
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{ totalKeys: number; totalSize: number }> {
    try {
      const redis = getRedisClient();
      if (!redis) {
        return { totalKeys: 0, totalSize: 0 }; // Redis disabled or not available
      }
      const pattern = `${this.CACHE_PREFIX}*`;
      const keys = await redis.keys(pattern);
      
      let totalSize = 0;
      for (const key of keys) {
        const value = await redis.get(key);
        if (value) {
          totalSize += Buffer.byteLength(value, 'utf8');
        }
      }

      return {
        totalKeys: keys.length,
        totalSize, // in bytes
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      throw error;
    }
  }
}

