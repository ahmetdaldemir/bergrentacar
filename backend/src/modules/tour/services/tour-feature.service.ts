import { In, Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { TourFeature } from '../entities/tour-feature.entity';
import { Translation } from '../../shared/entities/translation.entity';
import { Language } from '../../shared/entities/language.entity';

export type CreateTourFeatureInput = {
  icon: string;
  translations: Array<{
    languageId: string;
    name: string;
  }>;
  sortOrder?: number;
  isActive?: boolean;
};

export type UpdateTourFeatureInput = {
  icon?: string;
  translations?: Array<{
    languageId: string;
    name: string;
  }>;
  sortOrder?: number;
  isActive?: boolean;
};

const MODEL_NAME = 'TourFeature';

export type TourFeatureWithTranslations = TourFeature & {
  translations?: Translation[];
};

export class TourFeatureService {
  private static featureRepo(): Repository<TourFeature> {
    return AppDataSource.getRepository(TourFeature);
  }

  private static translationRepo(): Repository<Translation> {
    return AppDataSource.getRepository(Translation);
  }

  private static languageRepo(): Repository<Language> {
    return AppDataSource.getRepository(Language);
  }

  static async list(languageCode?: string): Promise<TourFeatureWithTranslations[]> {
    const features = await this.featureRepo().find({
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });

    // Fetch translations for all features
    const featureIds = features.map(f => f.id);
    const translations = featureIds.length > 0
      ? await this.translationRepo().find({
          where: {
            model: MODEL_NAME,
            modelId: In(featureIds),
          },
          relations: ['language'],
        })
      : [];

    // Group translations by feature
    const translationsByFeature = new Map<string, Translation[]>();
    translations.forEach(t => {
      const key = t.modelId;
      if (!translationsByFeature.has(key)) {
        translationsByFeature.set(key, []);
      }
      translationsByFeature.get(key)!.push(t);
    });

    // Combine features with translations
    return features.map(feature => ({
      ...feature,
      translations: translationsByFeature.get(feature.id) || [],
    }));
  }

  static async getById(id: string): Promise<TourFeatureWithTranslations | null> {
    const feature = await this.featureRepo().findOne({
      where: { id },
    });

    if (!feature) {
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
      ...feature,
      translations,
    };
  }

  static async create(input: CreateTourFeatureInput): Promise<TourFeatureWithTranslations> {
    // Validate languages exist
    const languageIds = input.translations.map((t) => t.languageId);
    const languages = await this.languageRepo().find({
      where: { id: In(languageIds) },
    });

    if (languages.length !== languageIds.length) {
      throw new Error('One or more languages not found');
    }

    // Create feature
    const feature = this.featureRepo().create({
      icon: input.icon,
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
    });

    const savedFeature = await this.featureRepo().save(feature);

    // Create translations using generic Translation entity
    const translations = input.translations.map((t) =>
      this.translationRepo().create({
        model: MODEL_NAME,
        modelId: savedFeature.id,
        languageId: t.languageId,
        name: t.name,
      })
    );

    await this.translationRepo().save(translations);

    return this.getById(savedFeature.id) as Promise<TourFeatureWithTranslations>;
  }

  static async update(id: string, input: UpdateTourFeatureInput): Promise<TourFeatureWithTranslations> {
    const feature = await this.featureRepo().findOne({ where: { id } });
    if (!feature) {
      throw new Error('Tour feature not found');
    }

    // Update feature fields
    if (input.icon !== undefined) {
      feature.icon = input.icon;
    }
    if (input.isActive !== undefined) {
      feature.isActive = input.isActive;
    }
    if (input.sortOrder !== undefined) {
      feature.sortOrder = input.sortOrder;
    }

    await this.featureRepo().save(feature);

    // Update translations if provided
    if (input.translations) {
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

      // Create new translations using generic Translation entity
      const translations = input.translations.map((t) =>
        this.translationRepo().create({
          model: MODEL_NAME,
          modelId: id,
          languageId: t.languageId,
          name: t.name,
        })
      );

      await this.translationRepo().save(translations);
    }

    return this.getById(id) as Promise<TourFeatureWithTranslations>;
  }

  static async remove(id: string): Promise<void> {
    const feature = await this.featureRepo().findOne({ where: { id } });
    if (!feature) {
      throw new Error('Tour feature not found');
    }

    // Delete translations first
    await this.translationRepo().delete({
      model: MODEL_NAME,
      modelId: id,
    });

    await this.featureRepo().remove(feature);
  }
}

