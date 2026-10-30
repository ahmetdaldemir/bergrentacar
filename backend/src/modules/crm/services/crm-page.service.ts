import { Repository, In } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { CrmPage, CrmPageType } from '../entities/crm-page.entity';
import { CrmPageCategory } from '../entities/crm-page-category.entity';
import { Translation } from '../../shared/entities/translation.entity';
import { CrmPageCategoryService, CrmPageCategoryTranslationInput } from './crm-page-category.service';

export type CrmPageTranslationInput = {
  languageId: string;
  title: string;
  description?: string;
  slug?: string; // Optional slug, will be auto-generated from title if not provided
};

export type CreateCrmPageDto = {
  tenantId: string;
  categoryId?: string; // If provided, use existing category
  categorySlug?: string; // If categoryId not provided, create/get category by slug
  categoryTranslations?: CrmPageCategoryTranslationInput[]; // Required if creating new category
  pageType?: CrmPageType; // content | internal_route | external_url
  customUrl?: string; // Required when pageType is internal_route or external_url
  image?: string;
  isActive?: boolean;
  sortOrder?: number;
  translations: CrmPageTranslationInput[]; // At least one translation required
};

export type UpdateCrmPageDto = {
  categoryId?: string;
  pageType?: CrmPageType;
  customUrl?: string;
  image?: string;
  isActive?: boolean;
  sortOrder?: number;
  translations?: CrmPageTranslationInput[]; // If provided, replaces all translations
};

export type CrmPageWithTranslations = CrmPage & {
  translations?: Translation[];
  category?: CrmPageCategory;
};

const MODEL_NAME = 'CrmPage';

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export class CrmPageService {
  private static repo(): Repository<CrmPage> {
    return AppDataSource.getRepository(CrmPage);
  }

  private static translationRepo(): Repository<Translation> {
    return AppDataSource.getRepository(Translation);
  }

  private static categoryRepo(): Repository<CrmPageCategory> {
    return AppDataSource.getRepository(CrmPageCategory);
  }

  /**
   * List all pages for a tenant, optionally filtered by category
   */
  static async list(
    tenantId: string,
    languageId?: string,
    categoryId?: string
  ): Promise<CrmPageWithTranslations[]> {
    const query = this.repo()
      .createQueryBuilder('page')
      .leftJoinAndSelect('page.category', 'category')
      .where('page.tenantId = :tenantId', { tenantId })
      .orderBy('page.sortOrder', 'ASC')
      .addOrderBy('page.createdAt', 'DESC');

    if (categoryId) {
      query.andWhere('page.categoryId = :categoryId', { categoryId });
    }

    const pages = await query.getMany();
    const pageIds = pages.map(p => p.id);

    const translationWhere: any = {
      model: MODEL_NAME,
      modelId: In(pageIds),
    };

    if (languageId) {
      translationWhere.languageId = languageId;
    }

    const translations = pageIds.length > 0
      ? await this.translationRepo().find({
          where: translationWhere,
          relations: ['language'],
        })
      : [];

    const translationsByPage = new Map<string, Translation[]>();
    translations.forEach(t => {
      const key = t.modelId;
      if (!translationsByPage.has(key)) {
        translationsByPage.set(key, []);
      }
      translationsByPage.get(key)!.push(t);
    });

    let filteredPages = pages;
    if (languageId) {
      filteredPages = pages.filter(page =>
        translationsByPage.has(page.id)
      );
    }

    return filteredPages.map(page => ({
      ...page,
      translations: translationsByPage.get(page.id) || [],
    }));
  }

  /**
   * List pages grouped by category - web sitesi menüleri için
   * Response: [{ category: { id, name, slug }, pages: [{ id, title, slug, url, ... }] }]
   */
  static async listGroupedByCategory(
    tenantId: string,
    languageId?: string
  ): Promise<Array<{ category: { id: string; name: string; slug: string; sortOrder: number }; pages: Array<{ id: string; title: string; slug: string; url: string; pageType: string; image?: string; sortOrder: number }> }>> {
    const categories = await CrmPageCategoryService.list(tenantId, languageId);
    const pages = await this.list(tenantId, languageId);

    const defaultLangId = languageId;
    const getCategoryName = (cat: { slug: string; translations?: Array<{ languageId: string; name: string }> }) => {
      if (cat.translations?.length) {
        const t = defaultLangId
          ? cat.translations.find(tr => tr.languageId === defaultLangId)
          : cat.translations[0];
        if (t?.name) return t.name;
      }
      return cat.slug;
    };

    const getPageTitle = (page: CrmPageWithTranslations) => {
      if (page.translations?.length) {
        const t = defaultLangId
          ? page.translations.find(tr => tr.languageId === defaultLangId)
          : page.translations[0];
        if (t?.name) return t.name;
      }
      return page.slug;
    };

    const getPageSlug = (page: CrmPageWithTranslations) => {
      if (page.translations?.length) {
        const t = defaultLangId ? page.translations.find(tr => tr.languageId === defaultLangId) : page.translations[0];
        if (t?.value) {
          try {
            const v = JSON.parse(t.value);
            if (v.slug) return v.slug;
          } catch {
            //
          }
        }
      }
      return page.slug;
    };

    const getPageUrl = (page: CrmPageWithTranslations) => {
      if (page.pageType === 'internal_route' || page.pageType === 'external_url') {
        return page.customUrl || `/${page.slug}`;
      }
      return `/${getPageSlug(page)}`;
    };

    return categories
      .filter(cat => cat.isActive)
      .map(category => {
        const categoryPages = pages
          .filter(p => p.categoryId === category.id && p.isActive)
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
          .map(page => ({
            id: page.id,
            title: getPageTitle(page),
            slug: getPageSlug(page),
            url: getPageUrl(page),
            pageType: page.pageType || 'content',
            image: page.image,
            sortOrder: page.sortOrder ?? 0,
          }));

        return {
          category: {
            id: category.id,
            name: getCategoryName(category),
            slug: category.slug,
            sortOrder: category.sortOrder ?? 0,
          },
          pages: categoryPages,
        };
      })
      .filter(item => item.pages.length > 0) // Sadece sayfası olan kategoriler
      .sort((a, b) => a.category.sortOrder - b.category.sortOrder);
  }

  /**
   * Get page by ID with translations
   */
  static async getById(id: string, languageId?: string): Promise<CrmPageWithTranslations | null> {
    const page = await this.repo().findOne({
      where: { id },
      relations: ['category'],
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

  /**
   * Slug from a Translation row — matches listGroupedByCategory / getPageSlug.
   */
  private static translationRowSlug(translation: Translation): string | undefined {
    if (translation.slug?.trim()) {
      return translation.slug.trim();
    }
    if (translation.value) {
      try {
        const v = JSON.parse(translation.value) as { slug?: string };
        if (v.slug) return v.slug;
      } catch {
        //
      }
    }
    return undefined;
  }

  /**
   * Get page by slug with translations
   */
  static async getBySlug(
    tenantId: string,
    slug: string,
    languageId?: string
  ): Promise<CrmPageWithTranslations | null> {
    const page = await this.repo().findOne({
      where: { tenantId, slug },
      relations: ['category'],
    });

    if (page) {
      return this.getById(page.id, languageId);
    }

    // Per-language slugs live in Translation (value JSON or Translation.slug), not always on crm_pages.slug
    const qb = this.translationRepo()
      .createQueryBuilder('tr')
      .innerJoin(CrmPage, 'page', 'page.id = tr.modelId AND page.tenantId = :tenantId', { tenantId })
      .where('tr.model = :model', { model: MODEL_NAME });

    if (languageId) {
      qb.andWhere('tr.languageId = :languageId', { languageId });
    }

    const translations = await qb.getMany();

    for (const tr of translations) {
      const rowSlug = CrmPageService.translationRowSlug(tr);
      if (rowSlug === slug) {
        return this.getById(tr.modelId, languageId);
      }
    }

    return null;
  }

  /**
   * Create new page
   */
  static async create(input: CreateCrmPageDto): Promise<CrmPageWithTranslations> {
    if (!input.translations || input.translations.length === 0) {
      throw new Error('At least one translation is required');
    }

    // Resolve category
    let category: CrmPageCategory | null = null;
    if (input.categoryId) {
      category = await this.categoryRepo().findOne({
        where: { id: input.categoryId, tenantId: input.tenantId },
      });

      if (!category) {
        throw new Error('Category not found');
      }
    } else if (input.categorySlug) {
      // Get or create category
      category = await CrmPageCategoryService.getOrCreateBySlug(
        input.tenantId,
        input.categorySlug,
        input.categoryTranslations
      );
    } else {
      throw new Error('Either categoryId or categorySlug is required');
    }

    if (!category) {
      throw new Error('Category is required');
    }

    const pageType = input.pageType ?? CrmPageType.CONTENT;

    // internal_route ve external_url için customUrl zorunlu
    if ((pageType === CrmPageType.INTERNAL_ROUTE || pageType === CrmPageType.EXTERNAL_URL) && !input.customUrl?.trim()) {
      throw new Error('URL girilmelidir (site içi route veya harici URL)');
    }

    // Use default language slug as main slug (for backward compatibility)
    const defaultLang = input.translations[0];
    const mainSlug = defaultLang.slug || slugify(defaultLang.title);

    // Check if slug already exists for this tenant
    const existing = await this.repo().findOne({
      where: { tenantId: input.tenantId, slug: mainSlug },
    });

    if (existing) {
      throw new Error(`Page with slug "${mainSlug}" already exists`);
    }

    const page = this.repo().create({
      tenantId: input.tenantId,
      categoryId: category.id,
      slug: mainSlug, // Main slug (default language)
      pageType,
      customUrl: input.customUrl?.trim() || undefined,
      image: input.image,
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
      viewCount: 0,
    });

    const savedPage = await this.repo().save(page);

    // Validate that all languages are active for the tenant
    const languageIds = input.translations.map((t) => t.languageId);
    const { TranslationValidator } = await import('../../shared/utils/translation-validator');
    await TranslationValidator.validateActiveLanguages(input.tenantId, languageIds);

    // Create translations with slug in value field (JSON format)
    for (const translation of input.translations) {
      const translationSlug = translation.slug || slugify(translation.title);
      
      // Store description and slug in value field as JSON
      const valueData: { description?: string; slug?: string } = {};
      if (translation.description) {
        valueData.description = translation.description;
      }
      if (translationSlug) {
        valueData.slug = translationSlug;
      }
      
      await this.translationRepo().save({
        model: MODEL_NAME,
        modelId: savedPage.id,
        languageId: translation.languageId,
        name: translation.title, // title -> Translation.name
        value: Object.keys(valueData).length > 0 ? JSON.stringify(valueData) : undefined,
      });
    }

    // Increment view count (optional - can be done on page view)
    // await this.incrementViewCount(savedPage.id);

    return this.getById(savedPage.id) as Promise<CrmPageWithTranslations>;
  }

  /**
   * Update page
   */
  static async update(id: string, input: UpdateCrmPageDto): Promise<CrmPageWithTranslations> {
    const page = await this.repo().findOne({ where: { id } });

    if (!page) {
      throw new Error('Page not found');
    }

    if (input.categoryId !== undefined) {
      const category = await this.categoryRepo().findOne({
        where: { id: input.categoryId, tenantId: page.tenantId },
      });

      if (!category) {
        throw new Error('Category not found');
      }

      page.categoryId = input.categoryId;
    }

    if (input.image !== undefined) {
      page.image = input.image;
    }

    if (input.isActive !== undefined) {
      page.isActive = input.isActive;
    }

    if (input.sortOrder !== undefined) {
      page.sortOrder = input.sortOrder;
    }

    if (input.pageType !== undefined) {
      page.pageType = input.pageType;
    }

    if (input.customUrl !== undefined) {
      if ((page.pageType === CrmPageType.INTERNAL_ROUTE || page.pageType === CrmPageType.EXTERNAL_URL) && !input.customUrl?.trim()) {
        throw new Error('URL girilmelidir (site içi route veya harici URL)');
      }
      page.customUrl = input.customUrl?.trim() || undefined;
    }

    // Update main slug if translations provided (use first translation as default)
    if (input.translations && input.translations.length > 0) {
      const defaultTranslation = input.translations[0];
      const newMainSlug = defaultTranslation.slug || slugify(defaultTranslation.title);
      
      // Check if slug already exists for another page
      const existing = await this.repo().findOne({
        where: { tenantId: page.tenantId, slug: newMainSlug },
      });

      if (existing && existing.id !== id) {
        throw new Error(`Page with slug "${newMainSlug}" already exists`);
      }

      page.slug = newMainSlug;
    }

    await this.repo().save(page);

    // Update translations if provided
    if (input.translations) {
      // Delete existing translations
      await this.translationRepo().delete({
        model: MODEL_NAME,
        modelId: id,
      });

      // Create new translations with slug in value field (JSON format)
      for (const translation of input.translations) {
        const translationSlug = translation.slug || slugify(translation.title);
        
        // Store description and slug in value field as JSON
        const valueData: { description?: string; slug?: string } = {};
        if (translation.description) {
          valueData.description = translation.description;
        }
        if (translationSlug) {
          valueData.slug = translationSlug;
        }
        
        await this.translationRepo().save({
          model: MODEL_NAME,
          modelId: id,
          languageId: translation.languageId,
          name: translation.title,
          value: Object.keys(valueData).length > 0 ? JSON.stringify(valueData) : undefined,
        });
      }
    }

    return this.getById(id) as Promise<CrmPageWithTranslations>;
  }

  /**
   * Delete page
   */
  static async delete(id: string): Promise<void> {
    const page = await this.repo().findOne({ where: { id } });

    if (!page) {
      throw new Error('Page not found');
    }

    // Delete translations
    await this.translationRepo().delete({
      model: MODEL_NAME,
      modelId: id,
    });

    // Delete page
    await this.repo().remove(page);
  }

  /**
   * Increment view count
   */
  static async incrementViewCount(id: string): Promise<void> {
    await this.repo().increment({ id }, 'viewCount', 1);
  }
}

