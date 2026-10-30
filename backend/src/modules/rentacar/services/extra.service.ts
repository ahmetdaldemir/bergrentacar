import { In, Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { Extra, ExtraSalesType } from '../entities/extra.entity';
import { Translation } from '../../shared/entities/translation.entity';
import { Language } from '../../shared/entities/language.entity';

const MODEL_NAME = 'Extra';

export type CreateExtraInput = {
  tenantId: string;
  name: string;
  price: number;
  currencyCode?: string;
  isMandatory?: boolean;
  isActive?: boolean;
  salesType?: ExtraSalesType;
  description?: string;
  imageUrl?: string;
  translations?: Array<{
    languageId: string;
    name: string;
    description?: string;
  }>;
};

export type UpdateExtraInput = Partial<Omit<CreateExtraInput, 'tenantId'>>;

export class ExtraService {
  private static repository(): Repository<Extra> {
    return AppDataSource.getRepository(Extra);
  }

  private static translationRepo(): Repository<Translation> {
    return AppDataSource.getRepository(Translation);
  }

  private static languageRepo(): Repository<Language> {
    return AppDataSource.getRepository(Language);
  }

  static async list(tenantId: string): Promise<Extra[]> {
    return this.repository().find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  static async getById(id: string, tenantId: string): Promise<(Extra & { translations?: Translation[] }) | null> {
    const extra = await this.repository().findOne({
      where: { id, tenantId },
    });

    if (!extra) {
      return null;
    }

    // Load translations
    const translations = await this.translationRepo().find({
      where: {
        model: MODEL_NAME,
        modelId: id,
      },
    });

    return {
      ...extra,
      translations,
    };
  }

  static async create(input: CreateExtraInput): Promise<Extra> {
    const repo = this.repository();
    const extra = repo.create({
      tenantId: input.tenantId,
      name: input.name,
      price: input.price,
      currencyCode: input.currencyCode || 'TRY',
      isMandatory: input.isMandatory || false,
      isActive: input.isActive !== undefined ? input.isActive : true,
      salesType: input.salesType || ExtraSalesType.DAILY,
      description: input.description,
      imageUrl: input.imageUrl,
    });

    const savedExtra = await repo.save(extra);

    // Create translations if provided
    if (input.translations && input.translations.length > 0) {
      // Validate languages exist
      const languageIds = input.translations.map((t) => t.languageId);
      const languages = await this.languageRepo().find({
        where: { id: In(languageIds) },
      });

      if (languages.length !== languageIds.length) {
        throw new Error('One or more languages not found');
      }

      // Validate that all languages are active for the tenant
      const { TranslationValidator } = await import('../../shared/utils/translation-validator');
      await TranslationValidator.validateActiveLanguages(input.tenantId, languageIds);

      // Create translations
      const translationEntities = input.translations.map((t) => {
        return this.translationRepo().create({
          model: MODEL_NAME,
          modelId: savedExtra.id,
          languageId: t.languageId,
          name: t.name,
          value: t.description || undefined,
          tenantId: input.tenantId,
        });
      });

      await this.translationRepo().save(translationEntities);
    }

    return savedExtra;
  }

  static async update(id: string, tenantId: string, input: UpdateExtraInput): Promise<Extra> {
    const repo = this.repository();
    const extra = await repo.findOne({ where: { id, tenantId } });

    if (!extra) {
      throw new Error('Extra not found');
    }

    // tenantId ve translations'ı input'tan çıkar
    const { tenantId: _, translations, ...updateData } = input as any;
    Object.assign(extra, updateData);
    const savedExtra = await repo.save(extra);

    // Handle translations if provided
    if (translations !== undefined) {
      // Validate languages if translations provided
      if (translations.length > 0) {
        const languageIds = translations.map((t: any) => t.languageId);
        const languages = await this.languageRepo().find({
          where: { id: In(languageIds) },
        });

        if (languages.length !== languageIds.length) {
          throw new Error('One or more languages not found');
        }
      }

      // Delete existing translations
      await this.translationRepo().delete({
        model: MODEL_NAME,
        modelId: id,
      });

      // Create new translations
      if (translations.length > 0) {
        const translationEntities = translations.map((t: any) => {
          return this.translationRepo().create({
            model: MODEL_NAME,
            modelId: id,
            languageId: t.languageId,
            name: t.name,
            value: t.description || undefined,
            tenantId: tenantId,
          });
        });

        await this.translationRepo().save(translationEntities);
      }
    }

    return savedExtra;
  }

  static async remove(id: string, tenantId: string): Promise<void> {
    const repo = this.repository();
    const extra = await repo.findOne({ where: { id, tenantId } });

    if (!extra) {
      throw new Error('Extra not found');
    }

    // Delete translations first
    await this.translationRepo().delete({
      model: MODEL_NAME,
      modelId: id,
    });

    await repo.remove(extra);
  }
}

