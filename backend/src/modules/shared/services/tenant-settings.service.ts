import { Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { AppError, ErrorCode } from '../../../utils/errors';
import { TenantSettings, SettingsCategory } from '../entities/tenant-settings.entity';

export type SeoEntry = {
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
};

export type SiteSettingsInput = {
  siteName?: string;
  siteDescription?: string;
  logoUrl?: string;
  faviconUrl?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  companyTaxNumber?: string;
  openaiApiKey?: string;
  googleMapsApiKey?: string;
  /** Public API GET önbellek süresi (saat); metadata.apiCacheTtlSeconds olarak saklanır */
  apiCacheTtlHours?: number;
  /** SEO per language code (e.g. { tr: { metaTitle, metaDescription }, en: {...} }) */
  seo?: Record<string, SeoEntry>;
};

export type MailSettingsInput = {
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpSecure?: boolean;
  fromEmail?: string;
  fromName?: string;
  /** CC email addresses for all reservation notification emails */
  ccEmails?: string[] | null;
};

export type PaymentSettingsInput = {
  paymentDefaultMethodId?: string | null;
};

export type AiSettingsInput = {
  aiEnabled?: boolean;
  openaiApiKey?: string;
  deeplApiKey?: string;
  googleApiKey?: string;
  useDeepLTranslation?: boolean; // Kullanıcı onayı ile DeepL çeviri kullanımı
};

export type InvoiceSettingsInput = {
  /** TRY, stored as 0 if not set */
  depositAmount?: number;
  /** Percentage (0-100) */
  vatRate?: number;
  /** 'none', 'parasut', etc. */
  eInvoiceIntegrator?: string;
};

export type UpdateTenantSettingsInput = Partial<
  SiteSettingsInput & MailSettingsInput & PaymentSettingsInput & AiSettingsInput
>;

/**
 * Her tenant için tek bir settings satırı (category: GENERAL).
 * Tüm metodlar bu tek satırı okur/yazar.
 */
export class TenantSettingsService {
  private static repository(): Repository<TenantSettings> {
    return AppDataSource.getRepository(TenantSettings);
  }

  /** Tenant'a ait tek ayar satırını döndürür (yoksa null). */
  static async getSettings(tenantId: string): Promise<TenantSettings | null> {
    return this.repository().findOne({
      where: { tenantId, category: SettingsCategory.GENERAL },
    });
  }

  /** Tenant'a ait tek ayar satırını döndürür (yoksa oluşturur). */
  static async getOrCreate(tenantId: string): Promise<TenantSettings> {
    const repo = this.repository();
    let settings = await repo.findOne({
      where: { tenantId, category: SettingsCategory.GENERAL },
    });
    if (!settings) {
      settings = repo.create({
        tenantId,
        category: SettingsCategory.GENERAL,
        smtpSecure: false,
      });
      await repo.save(settings);
    }
    return settings;
  }

  /** @deprecated Geriye dönük uyumluluk. Tek satırı liste olarak döndürür. */
  static async getByTenant(tenantId: string): Promise<TenantSettings[]> {
    const settings = await this.getSettings(tenantId);
    return settings ? [settings] : [];
  }

  /** @deprecated Tüm kategoriler GENERAL'e konsolide edildi. */
  static async getByCategory(
    tenantId: string,
    _category: SettingsCategory,
  ): Promise<TenantSettings | null> {
    return this.getSettings(tenantId);
  }

  static async getSiteSettings(tenantId: string): Promise<TenantSettings | null> {
    return this.getSettings(tenantId);
  }

  static async getMailSettings(tenantId: string): Promise<TenantSettings | null> {
    return this.getSettings(tenantId);
  }

  static async getPaymentSettings(tenantId: string): Promise<TenantSettings | null> {
    return this.getSettings(tenantId);
  }

  static async getAiSettings(tenantId: string): Promise<TenantSettings | null> {
    return this.getSettings(tenantId);
  }

  static async getInvoiceSettings(tenantId: string): Promise<TenantSettings | null> {
    return this.getSettings(tenantId);
  }

  /**
   * Public API list/cache TTL (saniye). metadata.apiCacheTtlSeconds; yoksa 86400 (24 saat).
   * Min 60 sn, max 7 gün.
   */
  static async getApiCacheTtlSeconds(tenantId: string): Promise<number> {
    const s = await this.getSettings(tenantId);
    const meta = (s?.metadata as Record<string, unknown>) || {};
    const raw = meta.apiCacheTtlSeconds;
    const DEFAULT = 86400;
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      return DEFAULT;
    }
    const clamped = Math.min(Math.max(Math.floor(raw), 60), 86400 * 7);
    return clamped;
  }

  static async updateSiteSettings(
    tenantId: string,
    input: SiteSettingsInput,
  ): Promise<TenantSettings> {
    const repo = this.repository();
    let settings = await this.getSettings(tenantId);

    const { openaiApiKey, googleMapsApiKey, seo, apiCacheTtlHours, ...rest } = input as SiteSettingsInput & {
      openaiApiKey?: string;
      googleMapsApiKey?: string;
    };

    const applyApiCacheTtl = (target: TenantSettings) => {
      if (apiCacheTtlHours === undefined) return;
      const hours = Number(apiCacheTtlHours);
      if (Number.isNaN(hours) || hours <= 0) return;
      const sec = Math.round(hours * 3600);
      const clamped = Math.min(Math.max(sec, 60), 86400 * 7);
      target.metadata = { ...(target.metadata || {}), apiCacheTtlSeconds: clamped };
    };

    if (!settings) {
      const partial: any = {
        tenantId,
        category: SettingsCategory.GENERAL,
        smtpSecure: false,
        ...rest,
      };
      if (openaiApiKey !== undefined) partial.openaiApiKey = openaiApiKey || undefined;
      if (googleMapsApiKey !== undefined) partial.googleMapsApiKey = googleMapsApiKey || undefined;
      let metadata: Record<string, unknown> = { ...(partial.metadata || {}) };
      if (seo !== undefined) {
        metadata = { ...metadata, seo };
      }
      if (apiCacheTtlHours !== undefined) {
        const hours = Number(apiCacheTtlHours);
        if (!Number.isNaN(hours) && hours > 0) {
          const sec = Math.round(hours * 3600);
          metadata.apiCacheTtlSeconds = Math.min(Math.max(sec, 60), 86400 * 7);
        }
      }
      if (Object.keys(metadata).length > 0) partial.metadata = metadata;
      return repo.save(partial);
    } else {
      Object.assign(settings, rest);
      if (openaiApiKey !== undefined) settings.openaiApiKey = openaiApiKey || undefined;
      if (googleMapsApiKey !== undefined) settings.googleMapsApiKey = googleMapsApiKey || undefined;
      if (seo !== undefined) {
        settings.metadata = { ...(settings.metadata || {}), seo };
      }
      applyApiCacheTtl(settings);
      return repo.save(settings);
    }
  }

  /** Site metadata'da locales (dil kodu -> key-value) saklar. */
  static async updateSiteLocales(
    tenantId: string,
    languageCode: string,
    translations: Record<string, string>,
  ): Promise<TenantSettings> {
    const repo = this.repository();
    let settings = await this.getSettings(tenantId);
    const metadata = (settings?.metadata as Record<string, unknown>) || {};
    const locales: Record<string, Record<string, string>> = {
      ...(metadata.locales as Record<string, Record<string, string>>),
    };
    locales[languageCode] = translations;
    if (!settings) {
      settings = repo.create({
        tenantId,
        category: SettingsCategory.GENERAL,
        smtpSecure: false,
        metadata: { ...metadata, locales },
      });
      return repo.save(settings);
    }
    settings.metadata = { ...metadata, locales };
    return repo.save(settings);
  }

  /**
   * `tenant_settings` GENERAL satırı: önce `google_maps_api_key` kolonu, yoksa metadata
   * (`googleMapsApiKey` / `googleApiKey` — AI ayarları eski kayıtlar).
   * Env fallback yok.
   */
  static async getGoogleMapsApiKey(tenantId: string): Promise<string | null> {
    const s = await this.getSettings(tenantId);
    const column = s?.googleMapsApiKey?.trim();
    if (column) return column;
    const meta = (s?.metadata as Record<string, unknown> | undefined) || {};
    const fromMeta =
      (typeof meta.googleMapsApiKey === 'string' && meta.googleMapsApiKey.trim()) ||
      (typeof meta.googleApiKey === 'string' && meta.googleApiKey.trim()) ||
      '';
    return fromMeta || null;
  }

  /**
   * `getGoogleMapsApiKey` boşsa 400 + GOOGLE_MAPS_API_KEY_REQUIRED (kolon veya metadata).
   */
  static async requireGoogleMapsApiKey(tenantId: string): Promise<string> {
    const key = await this.getGoogleMapsApiKey(tenantId);
    if (!key) {
      throw new AppError(
        ErrorCode.GOOGLE_MAPS_API_KEY_REQUIRED,
        'Google Maps işlemleri için Ayarlar sayfasından Google Maps API anahtarını tanımlamanız gerekiyor.',
        400,
      );
    }
    return key;
  }

  static async updateMailSettings(
    tenantId: string,
    input: MailSettingsInput,
  ): Promise<TenantSettings> {
    const repo = this.repository();
    let settings = await this.getSettings(tenantId);

    const { ccEmails, ...rest } = input;

    if (!settings) {
      settings = repo.create({
        tenantId,
        category: SettingsCategory.GENERAL,
        smtpSecure: false,
        ...rest,
        ...(ccEmails !== undefined ? { ccEmails: ccEmails ?? null } : {}),
      });
    } else {
      Object.assign(settings, rest);
      if (ccEmails !== undefined) settings.ccEmails = ccEmails ?? null;
    }

    return repo.save(settings);
  }

  static async updatePaymentSettings(
    tenantId: string,
    input: PaymentSettingsInput,
  ): Promise<TenantSettings> {
    const repo = this.repository();
    let settings = await this.getSettings(tenantId);

    if (!settings) {
      settings = repo.create({
        tenantId,
        category: SettingsCategory.GENERAL,
        smtpSecure: false,
        ...input,
      });
    } else {
      Object.assign(settings, input);
    }

    return repo.save(settings);
  }

  static async updateAiSettings(
    tenantId: string,
    input: AiSettingsInput,
  ): Promise<TenantSettings> {
    const repo = this.repository();
    let settings = await this.getSettings(tenantId);

    // Normalize openaiApiKey: empty string or null becomes undefined
    let openaiApiKey = input.openaiApiKey;
    if (openaiApiKey === '' || openaiApiKey === null) {
      openaiApiKey = undefined;
    } else if (openaiApiKey) {
      openaiApiKey = String(openaiApiKey).trim();
      // If trimmed key is empty, set to undefined
      if (openaiApiKey === '') {
        openaiApiKey = undefined;
      }
    }

    // Normalize deeplApiKey: empty string or null becomes undefined
    let deeplApiKey = (input as any).deeplApiKey;
    if (deeplApiKey === '' || deeplApiKey === null) {
      deeplApiKey = undefined;
    } else if (deeplApiKey) {
      deeplApiKey = String(deeplApiKey).trim();
      // If trimmed key is empty, set to undefined
      if (deeplApiKey === '') {
        deeplApiKey = undefined;
      }
    }

    // Normalize useDeepLTranslation: body JSON'dan string/number gelebilir
    const rawDeepL = input.useDeepLTranslation as boolean | string | number | undefined;
    let useDeepLTranslation: boolean;
    if (rawDeepL === 'true' || rawDeepL === 1 || rawDeepL === '1') {
      useDeepLTranslation = true;
    } else if (rawDeepL === 'false' || rawDeepL === 0 || rawDeepL === '0') {
      useDeepLTranslation = false;
    } else {
      useDeepLTranslation = rawDeepL === true;
    }

    const rawAiEnabled = input.aiEnabled as boolean | string | number | undefined;

    const googleKeyProvided = 'googleApiKey' in input;
    let googleMapsNormalized: string | undefined;
    if (googleKeyProvided) {
      const rawG = (input as AiSettingsInput).googleApiKey;
      if (rawG === null || rawG === undefined || rawG === '') {
        googleMapsNormalized = undefined;
      } else {
        const t = String(rawG).trim();
        googleMapsNormalized = t || undefined;
      }
    }

    const aiMetadata: Record<string, unknown> = {
      aiEnabled: rawAiEnabled === true || rawAiEnabled === 'true' || rawAiEnabled === 1,
      openaiApiKey: openaiApiKey || undefined,
      deeplApiKey: deeplApiKey || undefined,
      useDeepLTranslation: useDeepLTranslation, // DeepL çeviri kullanımı için kullanıcı onayı
    };
    if (googleKeyProvided) {
      aiMetadata.googleApiKey = googleMapsNormalized;
    } else {
      const prev = (settings?.metadata as Record<string, unknown>)?.googleApiKey;
      if (prev !== undefined) aiMetadata.googleApiKey = prev;
    }

    console.log(`[TenantSettings] Saving AI metadata:`, {
      aiEnabled: aiMetadata.aiEnabled,
      useDeepLTranslation: aiMetadata.useDeepLTranslation,
      hasOpenAiKey: !!aiMetadata.openaiApiKey,
      hasDeeplKey: !!aiMetadata.deeplApiKey,
      googleMapsKeyUpdated: googleKeyProvided,
    });

    if (!settings) {
      settings = repo.create({
        tenantId,
        category: SettingsCategory.GENERAL,
        smtpSecure: false,
        metadata: aiMetadata,
        // Also store in top-level columns for easier access
        openaiApiKey: openaiApiKey || undefined,
        deeplApiKey: deeplApiKey || undefined,
        googleMapsApiKey: googleKeyProvided ? googleMapsNormalized : undefined,
      });
    } else {
      settings.metadata = {
        ...(settings.metadata || {}),
        ...aiMetadata,
      };
      // Also update top-level columns
      settings.openaiApiKey = openaiApiKey || undefined;
      settings.deeplApiKey = deeplApiKey || undefined;
      if (googleKeyProvided) {
        settings.googleMapsApiKey = googleMapsNormalized;
      }
    }

    return repo.save(settings);
  }

  static async updateInvoiceSettings(
    tenantId: string,
    input: InvoiceSettingsInput,
  ): Promise<TenantSettings> {
    if (input.depositAmount !== undefined && input.depositAmount < 0) {
      throw new Error('Deposit amount must be >= 0');
    }
    if (input.vatRate !== undefined && (input.vatRate < 0 || input.vatRate > 100)) {
      throw new Error('VAT rate must be between 0 and 100');
    }

    const repo = this.repository();
    let settings = await this.getSettings(tenantId);

    const invoiceMetadata: Record<string, unknown> = {
      depositAmount: input.depositAmount ?? 0,
      vatRate: input.vatRate ?? 0,
      eInvoiceIntegrator: input.eInvoiceIntegrator || 'none',
    };

    if (!settings) {
      settings = repo.create({
        tenantId,
        category: SettingsCategory.GENERAL,
        smtpSecure: false,
        metadata: invoiceMetadata,
      });
    } else {
      settings.metadata = {
        ...(settings.metadata || {}),
        ...invoiceMetadata,
      };
    }

    return repo.save(settings);
  }

  static async updateSettings(
    tenantId: string,
    _category: SettingsCategory,
    input: UpdateTenantSettingsInput,
  ): Promise<TenantSettings> {
    const repo = this.repository();
    let settings = await this.getSettings(tenantId);

    if (!settings) {
      settings = repo.create({
        tenantId,
        category: SettingsCategory.GENERAL,
        smtpSecure: false,
        ...input,
      });
    } else {
      Object.assign(settings, input);
    }

    return repo.save(settings);
  }
}
