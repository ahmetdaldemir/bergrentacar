import { Repository, In } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { Destination } from '../entities/destination.entity';
import { Translation } from '../entities/translation.entity';
import { Language } from '../entities/language.entity';

export type DestinationTranslationInput = {
  languageId: string;
  title: string;
  description?: string;
  shortDescription?: string;
  slug?: string; // Optional, will be auto-generated if not provided
};

export type CreateDestinationDto = {
  tenantId: string;
  image?: string;
  isFeatured?: boolean;
  isActive?: boolean;
  rentacarLocationId?: string;
  translations: DestinationTranslationInput[];
};

export type UpdateDestinationDto = {
  image?: string;
  isFeatured?: boolean;
  isActive?: boolean;
  rentacarLocationId?: string;
  translations?: DestinationTranslationInput[];
};

export type DestinationWithTranslations = Destination & {
  translations?: Translation[];
};

const MODEL_NAME = 'Destination';

// Helper function to create slug from title (with Turkish character support)
function slugify(text: string): string {
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

export class DestinationService {
  private static repo(): Repository<Destination> {
    return AppDataSource.getRepository(Destination);
  }

  private static translationRepo(): Repository<Translation> {
    return AppDataSource.getRepository(Translation);
  }

  static async list(tenantId: string, languageId?: string): Promise<DestinationWithTranslations[]> {
    // Always filter by tenantId
    const destinations = await this.repo().find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });

    // Fetch translations for all destinations
    const destinationIds = destinations.map(d => d.id);
    
    // Build translation query
    const translationWhere: any = {
      model: MODEL_NAME,
      modelId: In(destinationIds),
    };
    
    // If languageId provided (API request), filter by languageId
    // If languageId not provided (Panel request), get all translations
    if (languageId) {
      translationWhere.languageId = languageId;
    }
    
    const translations = destinationIds.length > 0
      ? await this.translationRepo().find({
          where: translationWhere,
          relations: ['language'],
        })
      : [];

    // Group translations by destination
    const translationsByDestination = new Map<string, Translation[]>();
    translations.forEach(t => {
      const key = t.modelId;
      if (!translationsByDestination.has(key)) {
        translationsByDestination.set(key, []);
      }
      translationsByDestination.get(key)!.push(t);
    });

    // Combine destinations with translations
    // If languageId provided (API request), only return destinations that have translation in that language
    // If languageId not provided (Panel request), return all destinations with all their translations
    let filteredDestinations = destinations;
    if (languageId) {
      filteredDestinations = destinations.filter(dest => 
        translationsByDestination.has(dest.id)
      );
    }

    return filteredDestinations.map(dest => ({
      ...dest,
      translations: translationsByDestination.get(dest.id) || [],
    }));
  }

  static async getById(id: string, languageId?: string): Promise<DestinationWithTranslations | null> {
    const destination = await this.repo().findOne({ where: { id } });
    if (!destination) {
      return null;
    }

    const translationWhere: any = {
      model: MODEL_NAME,
      modelId: id,
    };
    
    if (languageId) {
      translationWhere.languageId = languageId;
    }

    const translations = await this.translationRepo().find({
      where: translationWhere,
      relations: ['language'],
    });

    return {
      ...destination,
      translations,
    };
  }

  static async create(input: CreateDestinationDto): Promise<DestinationWithTranslations> {
    // Validate translations
    if (!input.translations || input.translations.length === 0) {
      throw new Error('At least one translation is required');
    }

    if (!input.tenantId) {
      throw new Error('tenantId is required');
    }

    // Validate languages exist
    const languageIds = input.translations.map((t) => t.languageId);
    const languageRepo = AppDataSource.getRepository(Language);
    const languages = await languageRepo.find({
      where: { id: In(languageIds) },
    });

    if (languages.length !== languageIds.length) {
      throw new Error('One or more languages not found');
    }

    // Validate that all languages are active for the tenant
    const { TranslationValidator } = await import('../utils/translation-validator');
    await TranslationValidator.validateActiveLanguages(input.tenantId, languageIds);

    // Create destination
    const destination = this.repo().create({
      tenantId: input.tenantId,
      image: input.image || undefined, // Ensure empty string becomes undefined
      isFeatured: input.isFeatured ?? false,
      isActive: input.isActive ?? true,
      rentacarLocationId: input.rentacarLocationId || undefined,
    });

    console.log(`[Destination] Creating destination with image: ${input.image ? 'provided' : 'not provided'}`);
    const savedDestination = await this.repo().save(destination);
    console.log(`[Destination] Saved destination ${savedDestination.id}, image: ${savedDestination.image || 'null'}`);

    // Create translations
    const translations = input.translations.map((t) => {
      // Store description and shortDescription as JSON in value field
      const valueData: any = {};
      if (t.description) valueData.description = t.description;
      if (t.shortDescription) valueData.shortDescription = t.shortDescription;
      
      // Generate slug from title if not provided
      const slug = t.slug || slugify(t.title);
      
      return this.translationRepo().create({
        model: MODEL_NAME,
        modelId: savedDestination.id,
        languageId: t.languageId,
        name: t.title,
        slug: slug,
        value: Object.keys(valueData).length > 0 ? JSON.stringify(valueData) : undefined,
      });
    });

    await this.translationRepo().save(translations);

    // Auto-translate to other active languages if DeepL is enabled
    try {
      console.log(`[Destination] Starting auto-translation check for tenant ${input.tenantId}`);
      
      // Find default language translation
      const { TenantLanguageService } = await import('../../tenants/services/tenant-language.service');
      const defaultTenantLanguage = await TenantLanguageService.getDefaultLanguage(input.tenantId);
      
      // If no default language is set, use the first translation as source
      let sourceLanguageId: string | null = null;
      let defaultTranslation = null;
      
      if (defaultTenantLanguage) {
        sourceLanguageId = defaultTenantLanguage.languageId;
        defaultTranslation = input.translations.find(t => t.languageId === defaultTenantLanguage.languageId);
        console.log(`[Destination] Found default tenant language: ${defaultTenantLanguage.languageId}`);
      } else {
        // Use first translation as source if no default language is set
        if (input.translations.length > 0) {
          defaultTranslation = input.translations[0];
          sourceLanguageId = defaultTranslation.languageId;
          console.log(`[Destination] No default tenant language found, using first translation as source: ${sourceLanguageId}`);
        }
      }
      
      if (defaultTranslation && sourceLanguageId) {
        // Get existing translations to skip
        const existingTranslations = input.translations.map(t => ({
          languageId: t.languageId,
          content: {
            title: t.title,
            description: t.description,
            shortDescription: t.shortDescription,
          },
        }));

        console.log(`[Destination] Attempting auto-translation with source language: ${sourceLanguageId}, title: "${defaultTranslation.title}"`);

        // Auto-translate
        const { AutoTranslationService } = await import('./auto-translation.service');
        const autoTranslations = await AutoTranslationService.autoTranslate({
          model: MODEL_NAME,
          modelId: savedDestination.id,
          tenantId: input.tenantId,
          defaultLanguageId: sourceLanguageId,
          defaultLanguageContent: {
            title: defaultTranslation.title,
            description: defaultTranslation.description,
            shortDescription: defaultTranslation.shortDescription,
            slug: defaultTranslation.slug,
          },
          existingTranslations,
        });

        if (autoTranslations.length > 0) {
          await this.translationRepo().save(autoTranslations);
          console.log(`[Destination] ✅ Auto-translated to ${autoTranslations.length} languages`);
        } else {
          console.log(`[Destination] ⚠️ No auto-translations generated (DeepL may be disabled or all languages already have translations)`);
        }
      } else {
        console.log(`[Destination] ⚠️ No source translation found for auto-translation`);
      }
    } catch (error) {
      console.error('[Destination] ❌ Auto-translation error (non-fatal):', error);
      if (error instanceof Error) {
        console.error('[Destination] Error stack:', error.stack);
      }
      // Don't fail the create operation if auto-translation fails
    }

    return this.getById(savedDestination.id, undefined) as Promise<DestinationWithTranslations>;
  }

  static async update(id: string, input: UpdateDestinationDto): Promise<DestinationWithTranslations> {
    const destination = await this.repo().findOne({ where: { id } });
    if (!destination) {
      throw new Error('Destination not found');
    }

    // Update image if provided
    if (input.image !== undefined) {
      destination.image = input.image || undefined; // Ensure empty string becomes undefined
      console.log(`[Destination] Updating image for destination ${id}: ${input.image ? 'provided' : 'clearing'}`);
    }

    // Update isFeatured if provided
    if (input.isFeatured !== undefined) {
      destination.isFeatured = input.isFeatured;
    }

    // Update isActive if provided
    if (input.isActive !== undefined) {
      destination.isActive = input.isActive;
    }

    // Update rentacarLocationId if provided
    if (input.rentacarLocationId !== undefined) {
      destination.rentacarLocationId = input.rentacarLocationId;
    }

    await this.repo().save(destination);
    console.log(`[Destination] Updated destination ${id}, image: ${destination.image || 'null'}`);

    // Update translations if provided
    if (input.translations !== undefined) {
      // Validate languages
      const languageIds = input.translations.map((t) => t.languageId);
      const languageRepo = AppDataSource.getRepository(Language);
      const languages = await languageRepo.find({
        where: { id: In(languageIds) },
      });

      if (languages.length !== languageIds.length) {
        throw new Error('One or more languages not found');
      }

      // Delete existing translations
      await this.translationRepo().delete({
        model: MODEL_NAME,
        modelId: id,
      });

      // Create new translations
      const translations = input.translations.map((t) => {
        // Store description and shortDescription as JSON in value field
        const valueData: any = {};
        if (t.description) valueData.description = t.description;
        if (t.shortDescription) valueData.shortDescription = t.shortDescription;
        
        // Generate slug from title if not provided
        const slug = t.slug || slugify(t.title);
        
        return this.translationRepo().create({
          model: MODEL_NAME,
          modelId: id,
          languageId: t.languageId,
          name: t.title,
          slug: slug,
          value: Object.keys(valueData).length > 0 ? JSON.stringify(valueData) : undefined,
        });
      });

      await this.translationRepo().save(translations);
    }

    return this.getById(id) as Promise<DestinationWithTranslations>;
  }

  static async remove(id: string): Promise<void> {
    const destination = await this.repo().findOne({ where: { id } });
    if (!destination) {
      throw new Error('Destination not found');
    }
    
    // Delete translations first (cascade should handle this, but being explicit)
    await this.translationRepo().delete({
      model: MODEL_NAME,
      modelId: id,
    });
    
    await this.repo().remove(destination);
  }
}
