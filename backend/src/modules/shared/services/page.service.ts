import { Repository, In } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { Page } from '../entities/page.entity';
import { Translation } from '../entities/translation.entity';
import { Language } from '../entities/language.entity';

export type PageTranslationInput = {
  languageId: string;
  title: string;
  shortDescription?: string;
  description?: string;
};

export type CreatePageDto = {
  tenantId: string;
  category: string;
  images?: string[];
  translations: PageTranslationInput[];
};

export type UpdatePageDto = Partial<Omit<CreatePageDto, 'tenantId'>>;

export type PageWithTranslations = Page & {
  translations?: Translation[];
};

const MODEL_NAME = 'Page';

export class PageService {
  private static repo(): Repository<Page> {
    return AppDataSource.getRepository(Page);
  }

  private static translationRepo(): Repository<Translation> {
    return AppDataSource.getRepository(Translation);
  }

  private static languageRepo(): Repository<Language> {
    return AppDataSource.getRepository(Language);
  }

  static async list(tenantId: string, languageId?: string, category?: string): Promise<PageWithTranslations[]> {
    const where: any = { tenantId };
    
    if (category) {
      where.category = category;
    }

    const pages = await this.repo().find({
      where,
      order: { createdAt: 'DESC' },
    });

    const pageIds = pages.map(p => p.id);

    // Build translation query - filter by languageId if provided
    const translationWhere: any = {
      model: MODEL_NAME,
      modelId: In(pageIds),
    };
    
    if (languageId) {
      translationWhere.languageId = languageId;
    }

    // Fetch translations for all pages
    const translations = pageIds.length > 0
      ? await this.translationRepo().find({
          where: translationWhere,
          relations: ['language'],
        })
      : [];

    // Group translations by page
    const translationsByPage = new Map<string, Translation[]>();
    translations.forEach(t => {
      const key = t.modelId;
      if (!translationsByPage.has(key)) {
        translationsByPage.set(key, []);
      }
      translationsByPage.get(key)!.push(t);
    });

    // If languageId provided, only return pages that have translation in that language
    let filteredPages = pages;
    if (languageId) {
      filteredPages = pages.filter(page => 
        translationsByPage.has(page.id)
      );
    }

    // Combine pages with translations
    return filteredPages.map(page => ({
      ...page,
      translations: translationsByPage.get(page.id) || [],
    }));
  }

  static async getById(id: string, languageId?: string): Promise<PageWithTranslations | null> {
    const page = await this.repo().findOne({
      where: { id },
    });

    if (!page) {
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
      ...page,
      translations,
    };
  }

  static async create(input: CreatePageDto): Promise<PageWithTranslations> {
    // Validate translations
    if (!input.translations || input.translations.length === 0) {
      throw new Error('At least one translation is required');
    }

    // Validate languages exist
    const languageIds = input.translations.map((t) => t.languageId);
    const languages = await this.languageRepo().find({
      where: { id: In(languageIds) },
    });

    if (languages.length !== languageIds.length) {
      throw new Error('One or more languages not found');
    }

    // Validate that all languages are active for the tenant
    const { TranslationValidator } = await import('../utils/translation-validator');
    await TranslationValidator.validateActiveLanguages(input.tenantId, languageIds);

    // Create page
    const page = this.repo().create({
      tenantId: input.tenantId,
      category: input.category,
      images: input.images || [],
    });

    const savedPage = await this.repo().save(page);

    // Create translations
    const translations = input.translations.map((t) => {
      // Store shortDescription and description as JSON in value field
      const valueData: any = {};
      if (t.shortDescription) valueData.shortDescription = t.shortDescription;
      if (t.description) valueData.description = t.description;
      
      return this.translationRepo().create({
        model: MODEL_NAME,
        modelId: savedPage.id,
        languageId: t.languageId,
        name: t.title,
        value: Object.keys(valueData).length > 0 ? JSON.stringify(valueData) : undefined,
      });
    });

    await this.translationRepo().save(translations);

    return this.getById(savedPage.id, undefined) as Promise<PageWithTranslations>;
  }

  static async update(id: string, input: UpdatePageDto): Promise<PageWithTranslations> {
    const page = await this.repo().findOne({ where: { id } });
    if (!page) {
      throw new Error('Page not found');
    }

    // Update category if provided
    if (typeof input.category === 'string') {
      page.category = input.category;
    }

    // Update images if provided
    if (input.images !== undefined) {
      page.images = input.images;
    }

    await this.repo().save(page);

    // Update translations if provided
    if (input.translations !== undefined) {
      // Validate languages
      const languageIds = input.translations.map((t) => t.languageId);
      const languages = await this.languageRepo().find({
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
        // Store shortDescription and description as JSON in value field
        const valueData: any = {};
        if (t.shortDescription) valueData.shortDescription = t.shortDescription;
        if (t.description) valueData.description = t.description;
        
        return this.translationRepo().create({
          model: MODEL_NAME,
          modelId: id,
          languageId: t.languageId,
          name: t.title,
          value: Object.keys(valueData).length > 0 ? JSON.stringify(valueData) : undefined,
        });
      });

      await this.translationRepo().save(translations);
    }

    return this.getById(id) as Promise<PageWithTranslations>;
  }

  static async remove(id: string): Promise<void> {
    const page = await this.repo().findOne({ where: { id } });
    if (!page) {
      throw new Error('Page not found');
    }
    
    // Delete translations first
    await this.translationRepo().delete({
      model: MODEL_NAME,
      modelId: id,
    });
    
    await this.repo().remove(page);
  }
}

