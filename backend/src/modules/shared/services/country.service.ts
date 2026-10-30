import { Repository, In } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { Country } from '../entities/country.entity';
import { Translation } from '../entities/translation.entity';
import { Language } from '../entities/language.entity';
import axios from 'axios';

export type CountryTranslationInput = {
  languageId: string;
  content?: string; // Main content/description
  metaTitle?: string; // SEO meta title
  metaDescription?: string; // SEO meta description
  metaKeywords?: string; // SEO meta keywords
  slug?: string; // URL-friendly slug
};

export type CreateCountryInput = {
  name: string;
  code: string;
  phoneCode: string;
  flag?: string;
  image?: string;
  isActive?: boolean;
  showOnSite?: boolean;
  tenantId?: string;
  translations?: CountryTranslationInput[];
};

export type UpdateCountryInput = {
  name?: string;
  code?: string;
  phoneCode?: string;
  flag?: string;
  image?: string;
  isActive?: boolean;
  showOnSite?: boolean;
  tenantId?: string;
  translations?: CountryTranslationInput[];
};

export type CountryWithTranslations = Country & {
  translations?: Translation[];
};

const MODEL_NAME = 'Country';

// Helper function to create slug from name (with Turkish character support)
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

export class CountryService {
  private static repository(): Repository<Country> {
    return AppDataSource.getRepository(Country);
  }

  private static translationRepo(): Repository<Translation> {
    return AppDataSource.getRepository(Translation);
  }

  static async list(languageId?: string, tenantId?: string): Promise<CountryWithTranslations[]> {
    const countries = await this.repository().find({
      order: { name: 'ASC' },
    });

    return this.enrichWithTranslations(countries, languageId, tenantId);
  }

  static async listActive(languageId?: string, tenantId?: string): Promise<CountryWithTranslations[]> {
    const countries = await this.repository().find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });

    return this.enrichWithTranslations(countries, languageId, tenantId);
  }

  static async listForSite(languageId?: string, tenantId?: string): Promise<CountryWithTranslations[]> {
    const countries = await this.repository().find({
      where: { isActive: true, showOnSite: true },
      order: { name: 'ASC' },
    });

    return this.enrichWithTranslations(countries, languageId, tenantId);
  }

  static async getById(id: string, languageId?: string, tenantId?: string): Promise<CountryWithTranslations | null> {
    const country = await this.repository().findOne({
      where: { id },
    });

    if (!country) {
      return null;
    }

    const enriched = await this.enrichWithTranslations([country], languageId, tenantId);
    return enriched[0] || null;
  }

  static async getByCode(code: string, languageId?: string, tenantId?: string): Promise<CountryWithTranslations | null> {
    const country = await this.repository().findOne({
      where: { code },
    });

    if (!country) {
      return null;
    }

    const enriched = await this.enrichWithTranslations([country], languageId, tenantId);
    return enriched[0] || null;
  }

  static async getBySlug(slug: string, languageId: string, tenantId?: string): Promise<CountryWithTranslations | null> {
    const translationWhere: any = {
      model: MODEL_NAME,
      slug,
      languageId,
    };
    
    // If tenantId provided, filter by tenantId
    if (tenantId) {
      translationWhere.tenantId = tenantId;
    }
    
    const translation = await this.translationRepo().findOne({
      where: translationWhere,
    });

    if (!translation) {
      return null;
    }

    return this.getById(translation.modelId, languageId, tenantId);
  }

  private static async enrichWithTranslations(
    countries: Country[],
    languageId?: string,
    tenantId?: string
  ): Promise<CountryWithTranslations[]> {
    if (countries.length === 0) {
      return [];
    }

    const countryIds = countries.map(c => c.id);
    
    // Build translation query
    const translationWhere: any = {
      model: MODEL_NAME,
      modelId: In(countryIds),
    };
    
    // If languageId provided, filter by languageId
    // If not provided, get all translations
    if (languageId) {
      translationWhere.languageId = languageId;
    }
    
    // If tenantId provided, filter by tenantId
    // If not provided, get translations without tenantId (global translations) or with any tenantId
    if (tenantId) {
      translationWhere.tenantId = tenantId;
    }
    
    const translations = countryIds.length > 0
      ? await this.translationRepo().find({
          where: translationWhere,
          relations: ['language'],
        })
      : [];

    // Group translations by country ID
    const translationsMap = new Map<string, Translation[]>();
    translations.forEach(t => {
      if (!translationsMap.has(t.modelId)) {
        translationsMap.set(t.modelId, []);
      }
      translationsMap.get(t.modelId)!.push(t);
    });

    // Enrich countries with translations
    return countries.map(country => ({
      ...country,
      translations: translationsMap.get(country.id) || [],
    }));
  }

  static async create(input: CreateCountryInput): Promise<CountryWithTranslations> {
    const repo = this.repository();

    // Check if code already exists
    const existing = await repo.findOne({ where: { code: input.code } });
    if (existing) {
      throw new Error(`Country with code ${input.code} already exists`);
    }

    // Validate translations if provided
    if (input.translations && input.translations.length > 0) {
      const languageIds = input.translations.map(t => t.languageId);
      const languageRepo = AppDataSource.getRepository(Language);
      const languages = await languageRepo.find({
        where: { id: In(languageIds) },
      });

      if (languages.length !== languageIds.length) {
        throw new Error('One or more languages not found');
      }
    }

    const country = repo.create({
      name: input.name,
      code: input.code.toUpperCase(),
      phoneCode: input.phoneCode,
      flag: input.flag,
      image: input.image,
      isActive: input.isActive ?? true,
      showOnSite: input.showOnSite ?? false,
    });

    const savedCountry = await repo.save(country);

    // Create translations if provided
    if (input.translations && input.translations.length > 0) {
      const translations = input.translations.map(t => {
        // Store SEO and content data in value field as JSON
        const valueData: any = {};
        if (t.content) valueData.content = t.content;
        if (t.metaTitle) valueData.metaTitle = t.metaTitle;
        if (t.metaDescription) valueData.metaDescription = t.metaDescription;
        if (t.metaKeywords) valueData.metaKeywords = t.metaKeywords;
        
        // Generate slug from name if not provided
        const slug = t.slug || slugify(input.name);
        
      return this.translationRepo().create({
        model: MODEL_NAME,
        modelId: savedCountry.id,
        languageId: t.languageId,
        tenantId: input.tenantId || null,
        name: input.name, // Use country name as base name
        slug: slug,
        value: Object.keys(valueData).length > 0 ? JSON.stringify(valueData) : undefined,
      });
      });

      await this.translationRepo().save(translations);
    }

    return this.getById(savedCountry.id) as Promise<CountryWithTranslations>;
  }

  static async update(id: string, input: UpdateCountryInput): Promise<CountryWithTranslations> {
    const repo = this.repository();
    const country = await repo.findOne({ where: { id } });

    if (!country) {
      throw new Error('Country not found');
    }

    // Check if code is being changed and if new code already exists
    if (input.code && input.code.toUpperCase() !== country.code) {
      const existing = await repo.findOne({ 
        where: { code: input.code.toUpperCase() },
      });
      if (existing) {
        throw new Error(`Country with code ${input.code} already exists`);
      }
    }

    // Update country fields
    Object.assign(country, {
      ...input,
      code: input.code ? input.code.toUpperCase() : country.code,
    });

    await repo.save(country);

    // Update translations if provided
    if (input.translations && input.translations.length > 0) {
      // Validate languages
      const languageIds = input.translations.map(t => t.languageId);
      const languageRepo = AppDataSource.getRepository(Language);
      const languages = await languageRepo.find({
        where: { id: In(languageIds) },
      });

      if (languages.length !== languageIds.length) {
        throw new Error('One or more languages not found');
      }

      // Delete existing translations for this country and tenantId (if provided)
      const deleteWhere: any = {
        model: MODEL_NAME,
        modelId: id,
      };
      if (input.tenantId !== undefined) {
        deleteWhere.tenantId = input.tenantId || null;
      }
      await this.translationRepo().delete(deleteWhere);

      // Create new translations
      const translations = input.translations.map(t => {
        const valueData: any = {};
        if (t.content) valueData.content = t.content;
        if (t.metaTitle) valueData.metaTitle = t.metaTitle;
        if (t.metaDescription) valueData.metaDescription = t.metaDescription;
        if (t.metaKeywords) valueData.metaKeywords = t.metaKeywords;
        
        const slug = t.slug || slugify(input.name || country.name);
        
        return this.translationRepo().create({
          model: MODEL_NAME,
          modelId: id,
          languageId: t.languageId,
          tenantId: input.tenantId !== undefined ? input.tenantId : null,
          name: input.name || country.name,
          slug: slug,
          value: Object.keys(valueData).length > 0 ? JSON.stringify(valueData) : undefined,
        });
      });

      await this.translationRepo().save(translations);
    }

    return this.getById(id, undefined, input.tenantId) as Promise<CountryWithTranslations>;
  }

  static async delete(id: string): Promise<void> {
    const repo = this.repository();
    const country = await repo.findOne({ where: { id } });

    if (!country) {
      throw new Error('Country not found');
    }

    await repo.remove(country);
  }

  static async toggleActive(id: string): Promise<Country> {
    const repo = this.repository();
    const country = await repo.findOne({ where: { id } });

    if (!country) {
      throw new Error('Country not found');
    }

    country.isActive = !country.isActive;
    return repo.save(country);
  }

  /**
   * Sync countries from REST Countries API
   * This will create/update countries automatically
   * Also updates existing translations to set tenantId to null (since countries are shared)
   */
  static async syncCountries(): Promise<{ created: number; updated: number; total: number; translationsUpdated: number }> {
    const repo = this.repository();
    let created = 0;
    let updated = 0;
    let translationsUpdated = 0;

    try {
      // Fetch all countries from REST Countries API with specific fields
      const response = await axios.get('https://restcountries.com/v3.1/all?fields=name,cca2,idd,flag');
      const countriesData = response.data;
      console.log(`Fetched ${countriesData.length} countries from REST Countries API`);

      // Process each country
      for (const countryData of countriesData) {
        try {
          const code = countryData.cca2?.toUpperCase();
          const name = countryData.name?.common;
          
          if (!code || !name) {
            console.warn(`Skipping country with missing code or name:`, countryData);
            continue;
          }
          
          // Extract phone code
          let phoneCode = '';
          if (countryData.idd?.root && countryData.idd?.suffixes?.length > 0) {
            phoneCode = countryData.idd.root + countryData.idd.suffixes[0];
          } else if (countryData.idd?.root) {
            phoneCode = countryData.idd.root;
          }

          if (!phoneCode || phoneCode === '+') {
            // Skip countries without valid phone codes
            console.warn(`Skipping country ${code} (${name}): No valid phone code`);
            continue;
          }

          const flag = countryData.flag || '';

          // Check if country exists
          let country = await repo.findOne({ where: { code } });

          if (country) {
            // Update existing country
            country.name = name;
            country.phoneCode = phoneCode;
            if (flag) {
              country.flag = flag;
            }
            await repo.save(country);
            updated++;
          } else {
            // Create new country
            country = repo.create({
              name,
              code,
              phoneCode,
              flag,
              isActive: true,
              showOnSite: false,
            });
            await repo.save(country);
            created++;
          }

          // Update existing translations for this country
          // Since countries are shared but content management is tenant-specific,
          // we update existing translations that don't have tenantId set to null
          // This ensures that translations created before tenantId was added are properly marked
          const translationRepo = this.translationRepo();
          const existingTranslations = await translationRepo.find({
            where: {
              model: MODEL_NAME,
              modelId: country.id,
            },
          });

          if (existingTranslations.length > 0) {
            // Update translations that have tenantId as undefined (from old data)
            // Set them to null to mark as shared/global translations
            for (const translation of existingTranslations) {
              // If tenantId is undefined (old data), set it to null (shared)
              if (translation.tenantId === undefined) {
                translation.tenantId = null;
                await translationRepo.save(translation);
                translationsUpdated++;
              }
              // If tenantId is already null or set to a specific tenant, leave it as is
            }
          }
        } catch (error) {
          console.error(`Failed to process country ${countryData.cca2}:`, error);
          // Continue with next country
        }
      }

      return {
        created,
        updated,
        total: created + updated,
        translationsUpdated,
      };
    } catch (error) {
      console.error('Failed to fetch from REST Countries API:', error);
      throw new Error(`Failed to sync countries from API: ${(error as Error).message}`);
    }
  }
}

