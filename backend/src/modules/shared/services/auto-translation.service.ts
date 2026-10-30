// Auto Translation Service - Automatically translates content to other languages when DeepL is enabled
import { AppDataSource } from '../../../config/data-source';
import { Translation } from '../entities/translation.entity';
import { Language } from '../entities/language.entity';
import { TenantLanguage } from '../../tenants/entities/tenant-language.entity';
import { TranslationService } from './translation.service';
import { TenantSettingsService } from './tenant-settings.service';
import { TenantFeaturesService } from './tenant-features.service';

export interface TranslationContent {
  title: string;
  description?: string;
  shortDescription?: string;
  content?: string;
  slug?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  [key: string]: any; // Allow additional fields
}

export interface AutoTranslationOptions {
  model: string; // Entity model name (e.g., 'Destination', 'Blog', 'Tour')
  modelId: string; // Entity ID
  tenantId: string;
  defaultLanguageId: string; // Language ID of the content being saved
  defaultLanguageContent: TranslationContent; // Content in default language
  existingTranslations?: Array<{ languageId: string; content: TranslationContent }>; // Existing translations to skip
}

export class AutoTranslationService {
  /**
   * Check if DeepL auto-translation is enabled for tenant
   * 
   * DeepL kullanımı için:
   * 1. Tenant ayarlarından useDeepLTranslation = true olmalı
   * 2. VE (tenant'ın kendi deeplApiKey'i olmalı VEYA admin deepl feature'ı vermiş olmalı)
   */
  private static async isDeepLEnabled(tenantId: string): Promise<boolean> {
    try {
      // Step 1: Check if tenant enabled DeepL in settings
      const aiSettings = await TenantSettingsService.getAiSettings(tenantId);
      const useDeepL = (aiSettings?.metadata as any)?.useDeepLTranslation;
      if (useDeepL !== true) {
        console.log(`[AutoTranslation] DeepL is not enabled in tenant settings for tenant ${tenantId}`);
        return false;
      }

      // Step 2: Check if tenant has its own DeepL API key (check both top-level and metadata)
      const topLevelKey = (aiSettings as any)?.deeplApiKey;
      const metadataKey = (aiSettings?.metadata as any)?.deeplApiKey;
      const tenantKey = topLevelKey || metadataKey;
      if (tenantKey && typeof tenantKey === 'string' && tenantKey.trim()) {
        console.log(`[AutoTranslation] Tenant ${tenantId} has its own DeepL API key`);
        return true; // Tenant has its own key
      }

      // Step 3: Check if admin granted permission to use env key
      const hasDeeplFeature = await TenantFeaturesService.hasFeature(tenantId, 'deepl');
      const envDeeplKey = process.env.DEFAULT_DEEPL_API_KEY || process.env.DEEPL_API_KEY;
      if (hasDeeplFeature && envDeeplKey) {
        console.log(`[AutoTranslation] Tenant ${tenantId} has admin permission to use env DeepL API key`);
        return true; // Admin granted permission and env key exists
      }

      console.log(`[AutoTranslation] DeepL cannot be used for tenant ${tenantId}: no API key and no admin permission`);
      return false;
    } catch (error) {
      console.error('[AutoTranslation] Failed to check DeepL status:', error);
      return false;
    }
  }

  /**
   * Get active languages for tenant (excluding default language)
   */
  private static async getActiveLanguages(tenantId: string, excludeLanguageId: string): Promise<Language[]> {
    const tenantLanguageRepo = AppDataSource.getRepository(TenantLanguage);
    const languageRepo = AppDataSource.getRepository(Language);

    const activeTenantLanguages = await tenantLanguageRepo.find({
      where: { tenantId, isActive: true },
      relations: ['language'],
    });

    const activeLanguageIds = activeTenantLanguages
      .filter(tl => tl.languageId !== excludeLanguageId)
      .map(tl => tl.languageId);

    if (activeLanguageIds.length === 0) {
      return [];
    }

    return languageRepo.find({
      where: { id: activeLanguageIds as any, isActive: true },
    });
  }

  /**
   * Translate content fields to target language
   */
  private static async translateContentFields(
    content: TranslationContent,
    targetLanguageCode: string,
    sourceLanguageCode: string,
    tenantId: string
  ): Promise<TranslationContent> {
    const translated: TranslationContent = { ...content };

    // Translate title
    if (content.title) {
      try {
        translated.title = await TranslationService.translateText({
          text: content.title,
          targetLanguageCode,
          sourceLanguageCode,
          tenantId,
        });
      } catch (error) {
        console.error(`[AutoTranslation] Failed to translate title to ${targetLanguageCode}:`, error);
        // Keep original title if translation fails
      }
    }

    // Translate description
    if (content.description) {
      try {
        translated.description = await TranslationService.translateText({
          text: content.description,
          targetLanguageCode,
          sourceLanguageCode,
          tenantId,
        });
      } catch (error) {
        console.error(`[AutoTranslation] Failed to translate description to ${targetLanguageCode}:`, error);
      }
    }

    // Translate shortDescription
    if (content.shortDescription) {
      try {
        translated.shortDescription = await TranslationService.translateText({
          text: content.shortDescription,
          targetLanguageCode,
          sourceLanguageCode,
          tenantId,
        });
      } catch (error) {
        console.error(`[AutoTranslation] Failed to translate shortDescription to ${targetLanguageCode}:`, error);
      }
    }

    // Translate short_description (for blogs)
    if (content.short_description) {
      try {
        translated.short_description = await TranslationService.translateText({
          text: content.short_description,
          targetLanguageCode,
          sourceLanguageCode,
          tenantId,
        });
      } catch (error) {
        console.error(`[AutoTranslation] Failed to translate short_description to ${targetLanguageCode}:`, error);
      }
    }

    // Translate content (for blogs)
    if (content.content) {
      try {
        translated.content = await TranslationService.translateText({
          text: content.content,
          targetLanguageCode,
          sourceLanguageCode,
          tenantId,
        });
      } catch (error) {
        console.error(`[AutoTranslation] Failed to translate content to ${targetLanguageCode}:`, error);
      }
    }

    // Translate metaTitle
    if (content.metaTitle) {
      try {
        translated.metaTitle = await TranslationService.translateText({
          text: content.metaTitle,
          targetLanguageCode,
          sourceLanguageCode,
          tenantId,
        });
      } catch (error) {
        console.error(`[AutoTranslation] Failed to translate metaTitle to ${targetLanguageCode}:`, error);
      }
    }

    // Translate metaDescription
    if (content.metaDescription) {
      try {
        translated.metaDescription = await TranslationService.translateText({
          text: content.metaDescription,
          targetLanguageCode,
          sourceLanguageCode,
          tenantId,
        });
      } catch (error) {
        console.error(`[AutoTranslation] Failed to translate metaDescription to ${targetLanguageCode}:`, error);
      }
    }

    // Translate metaKeywords
    if (content.metaKeywords) {
      try {
        translated.metaKeywords = await TranslationService.translateText({
          text: content.metaKeywords,
          targetLanguageCode,
          sourceLanguageCode,
          tenantId,
        });
      } catch (error) {
        console.error(`[AutoTranslation] Failed to translate metaKeywords to ${targetLanguageCode}:`, error);
      }
    }

    return translated;
  }

  /**
   * Auto-translate content to all active languages
   * Returns array of translation entities to be saved
   */
  static async autoTranslate(
    options: AutoTranslationOptions
  ): Promise<Translation[]> {
    const { model, modelId, tenantId, defaultLanguageId, defaultLanguageContent, existingTranslations = [] } = options;

    console.log(`[AutoTranslation] Starting auto-translation for ${model} ${modelId}, tenant: ${tenantId}, defaultLanguageId: ${defaultLanguageId}`);

    // Check if DeepL is enabled
    const isDeepLEnabled = await this.isDeepLEnabled(tenantId);
    if (!isDeepLEnabled) {
      console.log(`[AutoTranslation] ❌ DeepL is not enabled for tenant ${tenantId}, skipping auto-translation`);
      return [];
    }

    console.log(`[AutoTranslation] ✅ DeepL is enabled for tenant ${tenantId}`);

    // Get default language code
    const languageRepo = AppDataSource.getRepository(Language);
    const defaultLanguage = await languageRepo.findOne({ where: { id: defaultLanguageId } });
    if (!defaultLanguage) {
      console.error(`[AutoTranslation] Default language ${defaultLanguageId} not found`);
      return [];
    }

    const sourceLanguageCode = defaultLanguage.code;

    // Get active languages (excluding default)
    const activeLanguages = await this.getActiveLanguages(tenantId, defaultLanguageId);
    console.log(`[AutoTranslation] Found ${activeLanguages.length} active languages for tenant ${tenantId} (excluding default language ${defaultLanguageId})`);
    
    if (activeLanguages.length === 0) {
      console.log(`[AutoTranslation] ⚠️ No active languages found for tenant ${tenantId} (excluding default)`);
      return [];
    }

    // Filter out languages that already have translations
    const existingLanguageIds = existingTranslations.map(t => t.languageId);
    const languagesToTranslate = activeLanguages.filter(lang => !existingLanguageIds.includes(lang.id));
    console.log(`[AutoTranslation] Existing translations: ${existingLanguageIds.length}, Languages to translate: ${languagesToTranslate.length}`);

    if (languagesToTranslate.length === 0) {
      console.log(`[AutoTranslation] ⚠️ All active languages already have translations`);
      return [];
    }

    console.log(`[AutoTranslation] 🌍 Auto-translating to ${languagesToTranslate.length} languages for ${model} ${modelId}: ${languagesToTranslate.map(l => l.code).join(', ')}`);

    const translationRepo = AppDataSource.getRepository(Translation);
    const translations: Translation[] = [];

    // Translate to each language
    for (const targetLanguage of languagesToTranslate) {
      try {
        // Translate content fields
        const translatedContent = await this.translateContentFields(
          defaultLanguageContent,
          targetLanguage.code,
          sourceLanguageCode,
          tenantId
        );

        // Prepare value field (JSON) based on content type
        const valueData: any = {};
        if (translatedContent.description) valueData.description = translatedContent.description;
        if (translatedContent.shortDescription) valueData.shortDescription = translatedContent.shortDescription;
        if (translatedContent.content) valueData.content = translatedContent.content;
        if (translatedContent.slug) valueData.slug = translatedContent.slug;
        // Note: For blogs, short_description is also stored in valueData
        if (translatedContent.short_description) valueData.short_description = translatedContent.short_description;

        // Generate slug from title if not provided
        const slug = translatedContent.slug || this.generateSlug(translatedContent.title);

        // Create translation entity
        const translation = translationRepo.create({
          model,
          modelId,
          languageId: targetLanguage.id,
          tenantId,
          name: translatedContent.title,
          slug: slug,
          value: Object.keys(valueData).length > 0 ? JSON.stringify(valueData) : undefined,
          metaTitle: translatedContent.metaTitle,
          metaDescription: translatedContent.metaDescription,
          metaKeywords: translatedContent.metaKeywords,
        });

        translations.push(translation);
        console.log(`[AutoTranslation] ✅ Translated to ${targetLanguage.code}`);
      } catch (error) {
        console.error(`[AutoTranslation] ❌ Failed to translate to ${targetLanguage.code}:`, error);
        // Continue with other languages even if one fails
      }
    }

    return translations;
  }

  /**
   * Simple slug generation (with Turkish character support)
   */
  private static generateSlug(text: string): string {
    if (!text) return '';
    
    // Turkish character mappings
    const turkishMap: { [key: string]: string } = {
      'ç': 'c', 'Ç': 'c',
      'ğ': 'g', 'Ğ': 'g',
      'ı': 'i', 'İ': 'i',
      'ö': 'o', 'Ö': 'o',
      'ş': 's', 'Ş': 's',
      'ü': 'u', 'Ü': 'u',
    };
    
    return text
      .toString()
      .split('')
      .map(char => turkishMap[char] || char)
      .join('')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with -
      .replace(/[^\w\-]+/g, '') // Remove all non-word chars
      .replace(/\-\-+/g, '-') // Replace multiple - with single -
      .replace(/^-+/, '') // Trim - from start of text
      .replace(/-+$/, ''); // Trim - from end of text
  }
}
