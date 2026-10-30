import { Repository, In } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { TransferVehicleFeature } from '../entities/transfer-vehicle-feature.entity';
import { Translation } from '../../shared/entities/translation.entity';
import { TenantLanguageService } from '../../tenants/services/tenant-language.service';
import { TranslationService } from '../../shared/services/translation.service';
import { Language } from '../../shared/entities/language.entity';

export type CreateTransferVehicleFeatureInput = {
  tenantId: string;
  name: string;
  icon?: string;
  code?: string;
  isActive?: boolean;
  sortOrder?: number;
  translations?: Array<{ languageId: string; name: string; value?: string }>;
};

export type UpdateTransferVehicleFeatureInput = Partial<Omit<CreateTransferVehicleFeatureInput, 'tenantId'>>;

export class TransferVehicleFeatureService {
  private static repo(): Repository<TransferVehicleFeature> {
    return AppDataSource.getRepository(TransferVehicleFeature);
  }
  private static translationRepo() {
    return AppDataSource.getRepository(Translation);
  }

  static async list(tenantId: string, isActive?: boolean): Promise<TransferVehicleFeature[]> {
    const where: any = { tenantId };
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    return this.repo().find({
      where,
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  static async getById(id: string, tenantId: string): Promise<TransferVehicleFeature | null> {
    const feature = await this.repo().findOne({
      where: { id, tenantId },
    });

    if (!feature) return null;

    // Load translations for this feature
    const translations = await this.translationRepo().find({
      where: { model: 'TransferVehicleFeature', modelId: feature.id, tenantId },
    });
    // @ts-ignore - attach translations for admin UI consumption
    (feature as any).translations = translations;
    return feature;
  }

  static async create(input: CreateTransferVehicleFeatureInput): Promise<TransferVehicleFeature> {
    const feature = this.repo().create({
      ...input,
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
    });
    const saved = await this.repo().save(feature);

    // Handle translations (if provided) or create default translation from name
    const translationRepo = this.translationRepo();
    const tenantId = input.tenantId;

    // Get tenant active languages and default language
    const tenantLanguages = await TenantLanguageService.list(tenantId, true);
    const languageMap: Record<string, Language> = {};
    tenantLanguages.forEach(tl => {
      if (tl.language) languageMap[tl.languageId] = tl.language;
    });

    const providedTranslations = input.translations || [];
    const providedLangIds = new Set(providedTranslations.map(t => t.languageId));

    const translationsToSave: Translation[] = [];

    // Save provided translations
    for (const t of providedTranslations) {
      const tr = translationRepo.create();
      tr.tenantId = tenantId;
      tr.model = 'TransferVehicleFeature';
      tr.modelId = saved.id;
      tr.languageId = t.languageId;
      tr.name = t.name;
      tr.value = t.value ?? undefined;
      translationsToSave.push(tr);
    }

    // If no provided translation exists for default language, create one from input.name
    const defaultLanguageId = await TenantLanguageService.getDefaultLanguageId(tenantId);
    if (defaultLanguageId && !providedLangIds.has(defaultLanguageId)) {
      const tr = translationRepo.create();
      tr.tenantId = tenantId;
      tr.model = 'TransferVehicleFeature';
      tr.modelId = saved.id;
      tr.languageId = defaultLanguageId;
      tr.name = input.name;
      translationsToSave.push(tr);
      providedLangIds.add(defaultLanguageId);
    }

    // Auto-translate missing active languages using DeepL (if translation service available)
    for (const tl of tenantLanguages) {
      const langId = tl.languageId;
      if (providedLangIds.has(langId)) continue;
      const targetLangCode = tl.language?.code;
      if (!targetLangCode) continue;
      try {
        const sourceText = input.name;
        const translated = await TranslationService.translateText({
          text: sourceText,
          targetLanguageCode: targetLangCode,
        });
        const tr = translationRepo.create();
        tr.tenantId = tenantId;
        tr.model = 'TransferVehicleFeature';
        tr.modelId = saved.id;
        tr.languageId = langId;
        tr.name = translated;
        translationsToSave.push(tr);
      } catch (err) {
        // ignore translation failures
      }
    }

    if (translationsToSave.length > 0) {
      await translationRepo.save(translationsToSave);
    }

    // @ts-ignore attach translations for response
    (saved as any).translations = translationsToSave;
    return saved;
  }

  static async update(
    id: string,
    tenantId: string,
    input: UpdateTransferVehicleFeatureInput
  ): Promise<TransferVehicleFeature> {
    const feature = await this.getById(id, tenantId);
    if (!feature) {
      throw new Error('Transfer vehicle feature not found');
    }

    Object.assign(feature, input);
    const saved = await this.repo().save(feature);

    // Upsert translations if provided
    const translationRepo = this.translationRepo();
    const tenantLanguages = await TenantLanguageService.list(tenantId, true);
    const providedTranslations = input.translations || [];
    const providedLangIds = new Set(providedTranslations.map(t => t.languageId));

    for (const t of providedTranslations) {
      const existing = await translationRepo.findOne({
        where: { model: 'TransferVehicleFeature', modelId: saved.id, languageId: t.languageId, tenantId },
      });
      if (existing) {
        existing.name = t.name;
        existing.value = t.value ?? existing.value;
        await translationRepo.save(existing);
      } else {
        const tr = translationRepo.create();
        tr.tenantId = tenantId;
        tr.model = 'TransferVehicleFeature';
        tr.modelId = saved.id;
        tr.languageId = t.languageId;
        tr.name = t.name;
        tr.value = t.value ?? undefined;
        await translationRepo.save(tr);
      }
    }

    // If default language translation missing, create from input.name (if provided)
    const defaultLanguageId = await TenantLanguageService.getDefaultLanguageId(tenantId);
    if (input.name && defaultLanguageId && !providedLangIds.has(defaultLanguageId)) {
      const existingDefault = await translationRepo.findOne({
        where: { model: 'TransferVehicleFeature', modelId: saved.id, languageId: defaultLanguageId, tenantId },
      });
      if (existingDefault) {
        existingDefault.name = input.name;
        await translationRepo.save(existingDefault);
      } else {
        const tr = translationRepo.create();
        tr.tenantId = tenantId;
        tr.model = 'TransferVehicleFeature';
        tr.modelId = saved.id;
        tr.languageId = defaultLanguageId;
        tr.name = input.name;
        await translationRepo.save(tr);
      }
      providedLangIds.add(defaultLanguageId);
    }

    // Auto-translate missing active languages
    for (const tl of tenantLanguages) {
      const langId = tl.languageId;
      if (providedLangIds.has(langId)) continue;
      const targetLangCode = tl.language?.code;
      if (!targetLangCode) continue;
      // Find source text: prefer default language translation, fall back to input.name
      let sourceText = input.name || '';
      if (!sourceText && defaultLanguageId) {
        const defaultTr = await translationRepo.findOne({
          where: { model: 'TransferVehicleFeature', modelId: saved.id, languageId: defaultLanguageId, tenantId },
        });
        sourceText = defaultTr?.name || '';
      }
      if (!sourceText) continue;
      try {
        const translated = await TranslationService.translateText({
          text: sourceText,
          targetLanguageCode: targetLangCode,
        });
        const tr = translationRepo.create();
        tr.tenantId = tenantId;
        tr.model = 'TransferVehicleFeature';
        tr.modelId = saved.id;
        tr.languageId = langId;
        tr.name = translated;
        await translationRepo.save(tr);
      } catch (err) {
        // ignore
      }
    }

    // reload translations and attach
    const translations = await translationRepo.find({
      where: { model: 'TransferVehicleFeature', modelId: saved.id, tenantId },
    });
    // @ts-ignore
    (saved as any).translations = translations;
    return saved;
  }

  static async delete(id: string, tenantId: string): Promise<void> {
    const feature = await this.getById(id, tenantId);
    if (!feature) {
      throw new Error('Transfer vehicle feature not found');
    }
    await this.repo().remove(feature);
  }

  /**
   * Reorder features
   */
  static async reorder(
    tenantId: string,
    featureOrders: Array<{ featureId: string; sortOrder: number }>
  ): Promise<void> {
    for (const order of featureOrders) {
      await this.repo().update(
        { id: order.featureId, tenantId },
        { sortOrder: order.sortOrder }
      );
    }
  }
}

