import { In, Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { VehicleCategory } from '../entities/vehicle-category.entity';
import { Translation } from '../../shared/entities/translation.entity';
import { Language } from '../../shared/entities/language.entity';
import { TranslationService } from '../../shared/services/translation.service';
import { Vehicle } from '../entities/vehicle.entity';

export type CreateVehicleCategoryInput = {
  translations: Array<{
    languageId: string;
    name: string;
  }>;
  sortOrder?: number;
  isActive?: boolean;
};

export type UpdateVehicleCategoryInput = Partial<CreateVehicleCategoryInput>;

const MODEL_NAME = 'VehicleCategory';

export type VehicleCategoryWithTranslations = VehicleCategory & {
  translations?: Translation[];
};

export class VehicleCategoryService {
  private static categoryRepo(): Repository<VehicleCategory> {
    return AppDataSource.getRepository(VehicleCategory);
  }

  private static translationRepo(): Repository<Translation> {
    return AppDataSource.getRepository(Translation);
  }

  private static languageRepo(): Repository<Language> {
    return AppDataSource.getRepository(Language);
  }

  static async list(languageId?: string): Promise<VehicleCategoryWithTranslations[]> {
    const categories = await this.categoryRepo().find({
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });

    // Fetch translations for all categories
    const categoryIds = categories.map(c => c.id);
    
    // Build translation where clause
    const translationWhere: any = {
      model: MODEL_NAME,
      modelId: In(categoryIds),
    };
    
    // Filter by languageId if provided
    if (languageId) {
      translationWhere.languageId = languageId;
    }

    const translations = categoryIds.length > 0
      ? await this.translationRepo().find({
          where: translationWhere,
          relations: ['language'],
        })
      : [];

    // Group translations by category
    const translationsByCategory = new Map<string, Translation[]>();
    translations.forEach(t => {
      const key = t.modelId;
      if (!translationsByCategory.has(key)) {
        translationsByCategory.set(key, []);
      }
      translationsByCategory.get(key)!.push(t);
    });

    // Combine categories with translations
    return categories.map(category => ({
      ...category,
      translations: translationsByCategory.get(category.id) || [],
    }));
  }

  static async create(input: CreateVehicleCategoryInput): Promise<VehicleCategoryWithTranslations> {
    const { translations: inputTranslations, sortOrder, isActive } = input;

    if (!inputTranslations || inputTranslations.length === 0) {
      throw new Error('At least one translation is required');
    }

    const category = this.categoryRepo().create({
      sortOrder,
      isActive,
    });

    const savedCategory = await this.categoryRepo().save(category);

    // Get default language
    const defaultLanguage = await this.languageRepo().findOne({ where: { isDefault: true } });
    const defaultTranslation = inputTranslations.find(t => 
      defaultLanguage && t.languageId === defaultLanguage.id
    ) || inputTranslations[0];

    // Auto-translate for other languages if default language is provided
    const translationEntities = await Promise.all(
      inputTranslations.map(async (t) => {
        const language = await this.languageRepo().findOne({ where: { id: t.languageId } });
        if (!language) {
          throw new Error(`Language with ID ${t.languageId} not found`);
        }

        let name = t.name;
        
        // Auto-translate if this is not the default language and default translation exists
        if (defaultLanguage && t.languageId !== defaultLanguage.id && defaultTranslation.name) {
          try {
            name = await TranslationService.translateText({
              text: defaultTranslation.name,
              targetLanguageCode: language.code,
              sourceLanguageCode: defaultLanguage.code,
            });
          } catch (error) {
            console.error('Auto-translation failed, using provided name:', error);
          }
        }

        return this.translationRepo().create({
          model: MODEL_NAME,
          modelId: savedCategory.id,
          languageId: t.languageId,
          name,
        });
      })
    );

    await this.translationRepo().save(translationEntities);

    return this.getById(savedCategory.id) as Promise<VehicleCategoryWithTranslations>;
  }

  static async getById(id: string): Promise<VehicleCategoryWithTranslations | null> {
    const category = await this.categoryRepo().findOne({
      where: { id },
    });

    if (!category) {
      return null;
    }

    const translations = await this.translationRepo().find({
      where: {
        model: MODEL_NAME,
        modelId: id,
      },
      relations: ['language'],
    });

    return {
      ...category,
      translations,
    };
  }

  static async update(id: string, input: UpdateVehicleCategoryInput): Promise<VehicleCategoryWithTranslations> {
    const category = await this.categoryRepo().findOne({ where: { id } });
    if (!category) {
      throw new Error('Vehicle category not found');
    }

    if (input.sortOrder !== undefined) category.sortOrder = input.sortOrder;
    if (input.isActive !== undefined) category.isActive = input.isActive;

    const savedCategory = await this.categoryRepo().save(category);

    if (input.translations !== undefined) {
      await this.translationRepo().delete({
        model: MODEL_NAME,
        modelId: id,
      });

      const defaultLanguage = await this.languageRepo().findOne({ where: { isDefault: true } });
      const defaultTranslation = input.translations.find(t => 
        defaultLanguage && t.languageId === defaultLanguage.id
      ) || input.translations[0];

      const translationEntities = await Promise.all(
        input.translations.map(async (t) => {
          const language = await this.languageRepo().findOne({ where: { id: t.languageId } });
          if (!language) {
            throw new Error(`Language with ID ${t.languageId} not found`);
          }

          let name = t.name;
          
          if (defaultLanguage && t.languageId !== defaultLanguage.id && defaultTranslation.name) {
            try {
              name = await TranslationService.translateText({
                text: defaultTranslation.name,
                targetLanguageCode: language.code,
                sourceLanguageCode: defaultLanguage.code,
              });
            } catch (error) {
              console.error('Auto-translation failed, using provided name:', error);
            }
          }

          return this.translationRepo().create({
            model: MODEL_NAME,
            modelId: savedCategory.id,
            languageId: t.languageId,
            name,
          });
        })
      );
      await this.translationRepo().save(translationEntities);
    }

    return this.getById(savedCategory.id) as Promise<VehicleCategoryWithTranslations>;
  }

  static async remove(id: string): Promise<void> {
    const category = await this.categoryRepo().findOne({ where: { id } });
    if (!category) {
      throw new Error('Vehicle category not found');
    }

    // Check if there are any vehicles using this category
    const vehicleRepo = AppDataSource.getRepository(Vehicle);
    const vehiclesCount = await vehicleRepo.count({
      where: { categoryId: id },
    });

    if (vehiclesCount > 0) {
      throw new Error(
        `Bu kategori silinemez çünkü ${vehiclesCount} adet araç bu kategoriye bağlı. Lütfen önce bu araçların kategorilerini değiştirin veya araçları silin.`
      );
    }

    // Delete translations first
    await this.translationRepo().delete({
      model: MODEL_NAME,
      modelId: id,
    });

    await this.categoryRepo().remove(category);
  }
}

