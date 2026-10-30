import { In, Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { TransferExtraProduct, TransferExtraChargeType } from '../entities/transfer-extra-product.entity';
import { Translation } from '../../shared/entities/translation.entity';
import { Language } from '../../shared/entities/language.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Currency } from '../../shared/entities/currency.entity';

const MODEL_NAME = 'TransferExtraProduct';

export type TransferExtraProductTranslationInput = {
  languageId: string;
  name: string;
  description?: string;
};

export type CreateTransferExtraProductInput = {
  tenantId: string;
  name: string;
  description?: string | null;
  price: number;
  currencyCode?: string;
  chargeType?: TransferExtraChargeType;
  imageUrl?: string | null;
  isActive?: boolean;
  sortOrder?: number;
  translations?: TransferExtraProductTranslationInput[];
};

export type UpdateTransferExtraProductInput = Partial<Omit<CreateTransferExtraProductInput, 'tenantId'>>;

export class TransferExtraProductService {
  private static repo(): Repository<TransferExtraProduct> {
    return AppDataSource.getRepository(TransferExtraProduct);
  }

  private static translationRepo(): Repository<Translation> {
    return AppDataSource.getRepository(Translation);
  }

  private static languageRepo(): Repository<Language> {
    return AppDataSource.getRepository(Language);
  }

  /**
   * Tenant'ın varsayılan para birimi kodunu döndürür.
   * defaultCurrencyId yoksa 'EUR' döner.
   */
  private static async getDefaultCurrencyCode(tenantId: string): Promise<string> {
    const tenant = await AppDataSource.getRepository(Tenant).findOne({
      where: { id: tenantId },
      relations: ['defaultCurrency'],
    });

    if (tenant?.defaultCurrency?.code) {
      return tenant.defaultCurrency.code;
    }

    if (tenant?.defaultCurrencyId) {
      const currency = await AppDataSource.getRepository(Currency).findOne({
        where: { id: tenant.defaultCurrencyId },
      });
      if (currency?.code) return currency.code;
    }

    return 'EUR';
  }

  /**
   * Tüm aktif ürünleri listele (panel + public için).
   * languageId verilirse sadece o dildeki çeviriyi döner.
   */
  static async list(
    tenantId: string,
    options?: { onlyActive?: boolean; languageId?: string }
  ): Promise<(TransferExtraProduct & { translations: Translation[] })[]> {
    const where: Record<string, any> = { tenantId };
    if (options?.onlyActive) where.isActive = true;

    const products = await this.repo().find({
      where,
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });

    if (!products.length) return [];

    const ids = products.map((p) => p.id);
    const translationWhere: Record<string, any> = { model: MODEL_NAME, modelId: In(ids) };
    if (options?.languageId) translationWhere.languageId = options.languageId;

    const translations = await this.translationRepo().find({ where: translationWhere });

    const translationMap = new Map<string, Translation[]>();
    for (const t of translations) {
      const list = translationMap.get(t.modelId) ?? [];
      list.push(t);
      translationMap.set(t.modelId, list);
    }

    return products.map((p) => ({ ...p, translations: translationMap.get(p.id) ?? [] }));
  }

  /** Tek ürünü çevirileriyle getir */
  static async getById(
    id: string,
    tenantId: string
  ): Promise<(TransferExtraProduct & { translations: Translation[] }) | null> {
    const product = await this.repo().findOne({ where: { id, tenantId } });
    if (!product) return null;

    const translations = await this.translationRepo().find({
      where: { model: MODEL_NAME, modelId: id },
    });

    return { ...product, translations };
  }

  /** Ürün oluştur */
  static async create(input: CreateTransferExtraProductInput): Promise<TransferExtraProduct & { translations: Translation[] }> {
    const currencyCode = input.currencyCode ?? (await this.getDefaultCurrencyCode(input.tenantId));

    const product = this.repo().create({
      tenantId: input.tenantId,
      name: input.name,
      description: input.description ?? null,
      price: input.price,
      currencyCode,
      chargeType: input.chargeType ?? TransferExtraChargeType.PER_BOOKING,
      imageUrl: input.imageUrl ?? null,
      isActive: input.isActive !== undefined ? input.isActive : true,
      sortOrder: input.sortOrder ?? 0,
    });

    const saved = await this.repo().save(product);
    const translations = await this.saveTranslations(saved.id, input.tenantId, input.translations ?? []);

    return { ...saved, translations };
  }

  /** Ürün güncelle */
  static async update(
    id: string,
    tenantId: string,
    input: UpdateTransferExtraProductInput
  ): Promise<TransferExtraProduct & { translations: Translation[] }> {
    const product = await this.repo().findOne({ where: { id, tenantId } });
    if (!product) throw new Error('Transfer extra product not found');

    const { translations, ...fields } = input as any;
    Object.assign(product, fields);
    const saved = await this.repo().save(product);

    let updatedTranslations: Translation[];
    if (translations !== undefined) {
      updatedTranslations = await this.saveTranslations(id, tenantId, translations, true);
    } else {
      updatedTranslations = await this.translationRepo().find({
        where: { model: MODEL_NAME, modelId: id },
      });
    }

    return { ...saved, translations: updatedTranslations };
  }

  /** Ürün sil (çevirilerle birlikte) */
  static async remove(id: string, tenantId: string): Promise<void> {
    const product = await this.repo().findOne({ where: { id, tenantId } });
    if (!product) throw new Error('Transfer extra product not found');

    await this.translationRepo().delete({ model: MODEL_NAME, modelId: id });
    await this.repo().remove(product);
  }

  /** Çevirileri kaydet (replace=true ise önce siler) */
  private static async saveTranslations(
    productId: string,
    tenantId: string,
    translations: TransferExtraProductTranslationInput[],
    replace = false
  ): Promise<Translation[]> {
    if (replace) {
      await this.translationRepo().delete({ model: MODEL_NAME, modelId: productId });
    }

    if (!translations.length) return [];

    const languageIds = translations.map((t) => t.languageId);
    const languages = await this.languageRepo().find({ where: { id: In(languageIds) } });

    if (languages.length !== languageIds.length) {
      throw new Error('One or more languages not found');
    }

    const { TranslationValidator } = await import('../../shared/utils/translation-validator');
    await TranslationValidator.validateActiveLanguages(tenantId, languageIds);

    const entities = translations.map((t) =>
      this.translationRepo().create({
        model: MODEL_NAME,
        modelId: productId,
        languageId: t.languageId,
        name: t.name,
        value: t.description ?? undefined,
        tenantId,
      })
    );

    return this.translationRepo().save(entities);
  }
}
