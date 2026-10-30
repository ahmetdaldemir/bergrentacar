import { Request, Response } from 'express';
import axios from 'axios';
import { TenantSettingsService, SeoEntry } from '../services/tenant-settings.service';
import { TenantService } from '../../tenants/services/tenant.service';
import { TenantFeaturesService } from '../services/tenant-features.service';
import { TenantLanguageService } from '../../tenants/services/tenant-language.service';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { TenantRequest } from '../../../middleware/tenant.middleware';
import { asyncHandler, sendSuccess, ValidationError, UnauthorizedError, NotFoundError } from '../../../utils/errors';

export class TenantSettingsController {
  static getAll = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.query.tenantId as string | undefined;
    if (!tenantId) throw new ValidationError('tenantId is required');

    const settings = await TenantSettingsService.getByTenant(tenantId);
    sendSuccess(res, settings);
  });

  static getSite = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.query.tenantId as string | undefined;
    if (!tenantId) throw new ValidationError('tenantId is required');

    const settings = await TenantSettingsService.getSiteSettings(tenantId);
    const tenantLanguages = await TenantLanguageService.list(tenantId, true);
    const storedSeo = (settings?.metadata as Record<string, unknown> | undefined)?.seo as Record<string, SeoEntry> | undefined;

    const seo: Record<string, SeoEntry> = {};
    for (const tl of tenantLanguages) {
      const code = tl.language?.code || tl.languageId;
      seo[code] = storedSeo?.[code] || { metaTitle: '', metaDescription: '', metaKeywords: '' };
    }
    if (Object.keys(seo).length === 0 && (storedSeo && Object.keys(storedSeo).length > 0)) {
      Object.assign(seo, storedSeo);
    }

    const meta = (settings?.metadata as Record<string, unknown> | undefined) || {};
    const apiCacheTtlSeconds =
      typeof meta.apiCacheTtlSeconds === 'number' && Number.isFinite(meta.apiCacheTtlSeconds)
        ? meta.apiCacheTtlSeconds
        : 86400;
    const apiCacheTtlHours = Math.round((apiCacheTtlSeconds / 3600) * 100) / 100;

    const tenantRow = await TenantService.getTenantById(tenantId);
    const slug = tenantRow?.slug ?? null;

    const payload = settings
      ? { ...settings, seo, apiCacheTtlHours, apiCacheTtlSeconds, slug }
      : { seo, apiCacheTtlHours: 24, apiCacheTtlSeconds: 86400, slug };
    sendSuccess(res, payload);
  });

  static getMail = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.query.tenantId as string | undefined;
    if (!tenantId) throw new ValidationError('tenantId is required');

    const settings = await TenantSettingsService.getMailSettings(tenantId);
    if (settings && settings.smtpPassword) {
      settings.smtpPassword = '***';
    }
    sendSuccess(res, settings || {});
  });

  static getPayment = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.query.tenantId as string | undefined;
    if (!tenantId) throw new ValidationError('tenantId is required');

    const settings = await TenantSettingsService.getPaymentSettings(tenantId);
    sendSuccess(res, settings || {});
  });

  static getAi = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.query.tenantId as string | undefined;
    if (!tenantId) throw new ValidationError('tenantId is required');

    const settings = await TenantSettingsService.getAiSettings(tenantId);
    if (settings) {
      // Merge top-level columns with metadata
      const metadata = { ...(settings.metadata as Record<string, unknown> || {}) };
      
      // Get API keys from top-level columns (priority: top-level > metadata)
      const topLevelOpenAiKey = (settings as any).openaiApiKey;
      const topLevelDeeplKey = (settings as any).deeplApiKey;
      const topLevelGoogleKey = (settings as any).googleMapsApiKey;
      
      // Always use top-level columns if available (they are the source of truth)
      if (topLevelOpenAiKey !== undefined && topLevelOpenAiKey !== null) {
        metadata.openaiApiKey = topLevelOpenAiKey;
      }
      if (topLevelDeeplKey !== undefined && topLevelDeeplKey !== null) {
        metadata.deeplApiKey = topLevelDeeplKey;
      }
      if (topLevelGoogleKey !== undefined && topLevelGoogleKey !== null) {
        metadata.googleApiKey = topLevelGoogleKey;
      }
      
      // Return actual values (not masked) for frontend to display
      sendSuccess(res, { ...settings, metadata });
      return;
    }
    sendSuccess(res, { metadata: { aiEnabled: false } });
  });

  static updateSite = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError('Unauthorized');

    const tenantId = req.auth.tenantId;
    if (!tenantId) throw new UnauthorizedError('Unauthorized');
    const {
      siteName,
      siteDescription,
      logoUrl,
      faviconUrl,
      companyName,
      companyAddress,
      companyEmail,
      companyPhone,
      companyWebsite,
      companyTaxNumber,
      openaiApiKey,
      googleMapsApiKey,
      seo,
      apiCacheTtlHours,
    } = req.body;

    const settings = await TenantSettingsService.updateSiteSettings(tenantId, {
      siteName,
      siteDescription,
      logoUrl,
      faviconUrl,
      companyName,
      companyAddress,
      companyEmail,
      companyPhone,
      companyWebsite,
      companyTaxNumber,
      openaiApiKey,
      googleMapsApiKey,
      seo,
      apiCacheTtlHours,
    });

    const {
      invalidateTenantApiCacheTtlMemory,
      invalidatePublicApiCacheForTenant,
    } = await import('../../../middleware/api-public-response-cache.middleware');
    invalidateTenantApiCacheTtlMemory(tenantId);
    await invalidatePublicApiCacheForTenant(tenantId);

    const tenantLanguages = await TenantLanguageService.list(tenantId, true);
    const storedSeo = (settings.metadata as Record<string, unknown> | undefined)?.seo as Record<string, SeoEntry> | undefined;
    const seoResponse: Record<string, SeoEntry> = {};
    for (const tl of tenantLanguages) {
      const code = tl.language?.code || tl.languageId;
      seoResponse[code] = storedSeo?.[code] || { metaTitle: '', metaDescription: '', metaKeywords: '' };
    }
    if (Object.keys(seoResponse).length === 0 && storedSeo) Object.assign(seoResponse, storedSeo);

    const metaOut = (settings.metadata as Record<string, unknown> | undefined) || {};
    const apiCacheTtlSecondsOut =
      typeof metaOut.apiCacheTtlSeconds === 'number' && Number.isFinite(metaOut.apiCacheTtlSeconds)
        ? metaOut.apiCacheTtlSeconds
        : 86400;
    const apiCacheTtlHoursOut = Math.round((apiCacheTtlSecondsOut / 3600) * 100) / 100;

    sendSuccess(res, {
      ...settings,
      seo: seoResponse,
      apiCacheTtlHours: apiCacheTtlHoursOut,
      apiCacheTtlSeconds: apiCacheTtlSecondsOut,
    });
  });

  /** POST /api/settings/cache/clear — sadece oturumdaki tenant için public API Redis önbelleğini temizler */
  static clearPublicApiCache = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Unauthorized');
    const {
      invalidateTenantApiCacheTtlMemory,
      invalidatePublicApiCacheForTenant,
    } = await import('../../../middleware/api-public-response-cache.middleware');
    invalidateTenantApiCacheTtlMemory(tenantId);
    const deletedKeys = await invalidatePublicApiCacheForTenant(tenantId);
    sendSuccess(res, { deletedKeys, tenantId });
  });

  static updateMail = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError('Unauthorized');

    const tenantId = req.auth.tenantId;
    if (!tenantId) throw new UnauthorizedError('Unauthorized');
    const {
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPassword,
      smtpSecure,
      fromEmail,
      fromName,
    } = req.body;

    const settings = await TenantSettingsService.updateMailSettings(tenantId, {
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPassword,
      smtpSecure,
      fromEmail,
      fromName,
    });

    const response = { ...settings };
    if (response.smtpPassword) response.smtpPassword = '***';
    sendSuccess(res, response);
  });

  static updatePayment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError('Unauthorized');

    const tenantId = req.auth.tenantId;
    if (!tenantId) throw new UnauthorizedError('Unauthorized');
    const { paymentDefaultMethodId } = req.body;

    const settings = await TenantSettingsService.updatePaymentSettings(tenantId, {
      paymentDefaultMethodId,
    });
    sendSuccess(res, settings);
  });

  static updateAi = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError('Unauthorized');

    const tenantId = req.auth.tenantId;
    if (!tenantId) throw new UnauthorizedError('Unauthorized');
    let { aiEnabled, openaiApiKey, deeplApiKey, useDeepLTranslation } = req.body;
    const hasGoogleApiKeyInBody = Object.prototype.hasOwnProperty.call(req.body, 'googleApiKey');
    let googleApiKey: string | undefined;
    if (hasGoogleApiKeyInBody) {
      const raw = req.body.googleApiKey;
      if (raw === null || raw === undefined) {
        googleApiKey = undefined;
      } else {
        const t = String(raw).trim();
        googleApiKey = t === '' ? undefined : t;
      }
    }

    // Validate OpenAI API key if provided
    if (openaiApiKey !== undefined && openaiApiKey !== null && openaiApiKey !== '') {
      const trimmedKey = String(openaiApiKey).trim();
      // Reject common test/placeholder values
      const invalidKeys = ['Password123!', 'password123', 'test', 'test123', 'sk-test'];
      if (invalidKeys.some(invalid => trimmedKey.toLowerCase() === invalid.toLowerCase())) {
        throw new ValidationError('Geçersiz OpenAI API key. Lütfen geçerli bir API key girin veya boş bırakın.');
      }
      // Valid OpenAI keys start with 'sk-' or 'sk-proj-'
      if (!trimmedKey.startsWith('sk-') || trimmedKey.length <= 20) {
        throw new ValidationError('OpenAI API key formatı geçersiz. Key "sk-" ile başlamalı ve en az 20 karakter olmalıdır.');
      }
      openaiApiKey = trimmedKey;
    } else if (openaiApiKey === '') {
      // Empty string means clear the key
      openaiApiKey = undefined;
    }

    console.log(`[TenantSettings] Updating AI settings for tenant ${tenantId}:`, {
      aiEnabled,
      hasOpenAiKey: !!openaiApiKey,
      hasDeeplKey: !!deeplApiKey,
      useDeepLTranslation,
      useDeepLTranslationType: typeof useDeepLTranslation,
    });

    const settings = await TenantSettingsService.updateAiSettings(tenantId, {
      aiEnabled: aiEnabled === true || aiEnabled === 'true',
      openaiApiKey,
      deeplApiKey: deeplApiKey !== undefined ? deeplApiKey : undefined, // Always pass, let service normalize
      ...(hasGoogleApiKeyInBody ? { googleApiKey } : {}),
      useDeepLTranslation: useDeepLTranslation === true || useDeepLTranslation === 'true' || useDeepLTranslation === 1,
    });
    
    console.log(`[TenantSettings] AI settings updated, metadata:`, {
      aiEnabled: (settings.metadata as any)?.aiEnabled,
      useDeepLTranslation: (settings.metadata as any)?.useDeepLTranslation,
    });

    const response = { ...settings };
    if (response.metadata && (response.metadata as Record<string, unknown>).openaiApiKey) {
      (response.metadata as Record<string, unknown>).openaiApiKey = '***';
    }
    sendSuccess(res, response);
  });

  static getInvoice = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.query.tenantId as string | undefined;
    if (!tenantId) throw new ValidationError('tenantId is required');

    const settings = await TenantSettingsService.getInvoiceSettings(tenantId);
    if (!settings || !settings.metadata) {
      sendSuccess(res, { depositAmount: 0, vatRate: 0, eInvoiceIntegrator: 'none' });
      return;
    }

    const metadata = settings.metadata as Record<string, unknown>;
    sendSuccess(res, {
      depositAmount: metadata.depositAmount ?? 0,
      vatRate: metadata.vatRate ?? 0,
      eInvoiceIntegrator: metadata.eInvoiceIntegrator || 'none',
    });
  });

  static updateInvoice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.auth) throw new UnauthorizedError('Unauthorized');

    const tenantId = req.auth.tenantId;
    if (!tenantId) throw new UnauthorizedError('Unauthorized');
    const { depositAmount, vatRate, eInvoiceIntegrator } = req.body;

    const settings = await TenantSettingsService.updateInvoiceSettings(tenantId, {
      depositAmount,
      vatRate,
      eInvoiceIntegrator,
    });

    const metadata = settings.metadata as Record<string, unknown>;
    sendSuccess(res, {
      depositAmount: metadata.depositAmount ?? 0,
      vatRate: metadata.vatRate ?? 0,
      eInvoiceIntegrator: metadata.eInvoiceIntegrator || 'none',
    });
  });

  /**
   * GET /settings/translations?tenantId=xxx
   * Tenant'ın kullandığı dillere göre sitesindeki locales/{code}.json dosyalarını çeker.
   */
  static getTranslations = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req.query.tenantId as string) || (req as AuthenticatedRequest).auth?.tenantId;
    if (!tenantId) throw new ValidationError('tenantId is required');

    const siteSettings = await TenantSettingsService.getSiteSettings(tenantId);
    let baseUrl = '';
    const baseUrlRaw = (siteSettings?.companyWebsite || '').trim();
    if (baseUrlRaw) {
      try {
        const u = baseUrlRaw.startsWith('http') ? baseUrlRaw : `https://${baseUrlRaw}`;
        baseUrl = new URL(u).origin;
      } catch {
        baseUrl = '';
      }
    }
    if (!baseUrl) {
      sendSuccess(res, {
        baseUrl: '',
        languages: [],
        translations: {},
        message: 'Şirket web sitesi (Site Ayarları) girilmediği için çeviri dosyaları çekilemiyor.',
      });
      return;
    }

    const tenantLanguages = await TenantLanguageService.list(tenantId, true);
    const languages = tenantLanguages.map((tl) => ({
      code: tl.language?.code || tl.languageId,
      name: tl.language?.name || tl.languageId,
    }));

    const translations: Record<string, Record<string, string>> = {};
    for (const lang of languages) {
      const url = `${baseUrl}/locales/${lang.code}.json`;
      try {
        const { data } = await axios.get<Record<string, string>>(url, { timeout: 10000 });
        translations[lang.code] = typeof data === 'object' && data !== null ? data : {};
      } catch {
        translations[lang.code] = {};
      }
    }

    const dbLocales = (siteSettings?.metadata as Record<string, unknown>)?.locales as Record<string, Record<string, string>> | undefined;
    if (dbLocales && typeof dbLocales === 'object') {
      for (const code of Object.keys(dbLocales)) {
        const fromDb = dbLocales[code];
        if (fromDb && typeof fromDb === 'object') {
          translations[code] = { ...(translations[code] || {}), ...fromDb };
        }
      }
    }

    sendSuccess(res, { baseUrl, languages, translations });
  });

  /**
   * PUT /settings/translations
   * Seçilen dil için çevirileri veritabanında (site metadata.locales) günceller.
   */
  static putTranslations = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = (req.body?.tenantId as string) || req.auth?.tenantId;
    if (!tenantId) throw new ValidationError('tenantId is required');

    const languageCode = (req.body?.languageCode as string)?.trim();
    const translations = req.body?.translations;
    if (!languageCode) throw new ValidationError('languageCode is required');
    if (!translations || typeof translations !== 'object' || Array.isArray(translations)) {
      throw new ValidationError('translations must be an object (key-value)');
    }

    const normalized: Record<string, string> = {};
    for (const [k, v] of Object.entries(translations)) {
      if (typeof k === 'string' && (typeof v === 'string' || v === null || v === undefined)) {
        normalized[k] = v == null ? '' : String(v);
      }
    }
    await TenantSettingsService.updateSiteLocales(tenantId, languageCode, normalized);
    sendSuccess(res, { message: 'Çeviriler kaydedildi.', languageCode });
  });

  static getFeatures = asyncHandler(async (req: TenantRequest, res: Response) => {
    if (!req.tenant) throw new NotFoundError('Tenant');

    const merged = await TenantFeaturesService.getMergedFeatures(req.tenant.id);
    sendSuccess(res, merged);
  });

  /** Mobil / API subdomain: `req.tenant` yok; JWT `tenantId` ile modül bayrakları */
  static getFeaturesAuthenticated = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.auth?.tenantId) throw new UnauthorizedError();

    const merged = await TenantFeaturesService.getMergedFeatures(req.auth.tenantId);
    sendSuccess(res, merged);
  });
}

