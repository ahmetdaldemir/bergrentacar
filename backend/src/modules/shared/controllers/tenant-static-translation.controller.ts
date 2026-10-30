import { Request, Response } from 'express';
import { TenantStaticTranslationService } from '../services/tenant-static-translation.service';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import {
  asyncHandler,
  sendSuccess,
  ValidationError,
  UnauthorizedError,
} from '../../../utils/errors';
import { getTenantIdFromAuth } from '../../../utils/validation';

function requireTenantId(req: AuthenticatedRequest): string {
  const tenantId = getTenantIdFromAuth(req);
  if (!tenantId) throw new UnauthorizedError('Bu işlem için tenant kimliği gereklidir.');
  return tenantId;
}

export class TenantStaticTranslationController {
  /**
   * GET /settings/static-translations?namespace=xxx
   * Tenant'ın tüm statik çeviri anahtarlarını ve dil değerlerini listeler.
   */
  static list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = requireTenantId(req);
    const namespace = req.query.namespace as string | undefined;
    const rows = await TenantStaticTranslationService.list(tenantId, namespace);
    sendSuccess(res, rows);
  });

  /**
   * GET /api/settings/static-translations/export?lang=en&namespace=xxx
   * Public endpoint: web sitesi için düz { key: value } JSON döndürür.
   */
  static exportPublic = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.query.tenantId as string | undefined;
    if (!tenantId) throw new ValidationError('tenantId is required');

    const lang = req.query.lang as string | undefined;
    if (!lang) throw new ValidationError('lang is required');

    const namespace = req.query.namespace as string | undefined;
    const result = await TenantStaticTranslationService.exportForLanguage(
      tenantId,
      lang,
      namespace,
    );
    sendSuccess(res, result);
  });

  /**
   * POST /settings/static-translations
   * Yeni çeviri anahtarı ekler.
   */
  static create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = requireTenantId(req);

    const { key, values, namespace } = req.body;
    if (!key || typeof key !== 'string' || !key.trim()) {
      throw new ValidationError('key alanı zorunludur');
    }
    if (values !== undefined && (typeof values !== 'object' || Array.isArray(values))) {
      throw new ValidationError('values nesne (key-value) formatında olmalıdır');
    }

    const row = await TenantStaticTranslationService.create(tenantId, {
      key: key.trim(),
      values: values ?? {},
      namespace: namespace ?? null,
    });
    sendSuccess(res, row, 201);
  });

  /**
   * PUT /settings/static-translations/:key
   * Bir anahtarın tüm dil değerlerini günceller.
   */
  static update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = requireTenantId(req);
    const { key } = req.params;

    const { values, namespace } = req.body;
    if (!values || typeof values !== 'object' || Array.isArray(values)) {
      throw new ValidationError('values nesne (key-value) formatında olmalıdır');
    }

    const normalized: Record<string, string> = {};
    for (const [lang, val] of Object.entries(values)) {
      normalized[lang] = val == null ? '' : String(val);
    }

    const row = await TenantStaticTranslationService.update(
      tenantId,
      decodeURIComponent(key),
      normalized,
      namespace,
    );
    sendSuccess(res, row);
  });

  /**
   * DELETE /settings/static-translations/:key
   * Çeviri anahtarını siler.
   */
  static deleteKey = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = requireTenantId(req);
    const { key } = req.params;

    await TenantStaticTranslationService.deleteKey(tenantId, decodeURIComponent(key));
    sendSuccess(res, { message: 'Anahtar silindi.' });
  });

  /**
   * POST /settings/static-translations/import
   * Varsayılan dil JSON'ını içe aktarır, anahtarları oluşturur/günceller.
   * Body: { defaultLanguage: 'en', json: { 'hero.title': 'Welcome', ... }, namespace?: 'header' }
   */
  static importJson = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = requireTenantId(req);

    const { defaultLanguage, json, namespace } = req.body;
    if (!defaultLanguage || typeof defaultLanguage !== 'string') {
      throw new ValidationError('defaultLanguage zorunludur');
    }
    if (!json || typeof json !== 'object' || Array.isArray(json)) {
      throw new ValidationError('json nesne (key-value) formatında olmalıdır');
    }

    const normalized: Record<string, string> = {};
    for (const [k, v] of Object.entries(json as Record<string, unknown>)) {
      if (typeof k === 'string') {
        normalized[k] = v == null ? '' : String(v);
      }
    }

    const result = await TenantStaticTranslationService.importJson(
      tenantId,
      defaultLanguage,
      normalized,
      namespace ?? null,
    );
    sendSuccess(res, { ...result, message: `${result.created} oluşturuldu, ${result.updated} güncellendi.` });
  });

  /**
   * PUT /settings/static-translations/bulk-language
   * Bir dil için tüm çevirileri toplu günceller.
   * Body: { languageCode: 'tr', translations: { 'hero.title': 'Hoş Geldiniz', ... } }
   */
  static bulkUpdateLanguage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = requireTenantId(req);

    const { languageCode, translations } = req.body;
    if (!languageCode || typeof languageCode !== 'string') {
      throw new ValidationError('languageCode zorunludur');
    }
    if (!translations || typeof translations !== 'object' || Array.isArray(translations)) {
      throw new ValidationError('translations nesne (key-value) formatında olmalıdır');
    }

    const normalized: Record<string, string> = {};
    for (const [k, v] of Object.entries(translations as Record<string, unknown>)) {
      normalized[k] = v == null ? '' : String(v);
    }

    const result = await TenantStaticTranslationService.bulkUpdateLanguage(
      tenantId,
      languageCode,
      normalized,
    );
    sendSuccess(res, { ...result, message: `${result.updated} çeviri güncellendi.` });
  });
}
