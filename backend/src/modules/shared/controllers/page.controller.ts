import { Response } from 'express';
import { PageService } from '../services/page.service';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { TenantRequest } from '../../../middleware/tenant.middleware';
import { asyncHandler, ValidationError, NotFoundError } from '../../../utils/errors';
import { logger } from '../../../utils/logger';
import { LanguageService } from '../services/language.service';

export class PageController {
  static list = asyncHandler(async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    // Get tenantId from authenticated user's token (security) or from Host header (public API)
    const tenantId = req.auth?.tenantId || req.tenant?.id;
    const category = req.query.category as string | undefined;
    
    // Get languageId from query param or use tenant's default language
    let languageId: string | undefined = req.query.languageId as string | undefined;
    
    // If no languageId provided and tenant exists, use tenant's default language
    if (!languageId && req.tenant?.defaultLanguage) {
      const defaultLanguage = await LanguageService.getByCode(req.tenant.defaultLanguage);
      if (defaultLanguage) {
        languageId = defaultLanguage.id;
      }
    }
    
    // If still no languageId, get system default language
    if (!languageId) {
      const systemDefaultLanguage = await LanguageService.getDefault();
      if (systemDefaultLanguage) {
        languageId = systemDefaultLanguage.id;
      }
    }

    if (!tenantId) {
      throw new ValidationError('tenantId is required');
    }

    const pages = await PageService.list(tenantId, languageId, category);
    logger.info(`Listed pages for tenant ${tenantId}`, { tenantId, languageId, category, count: pages.length });
    res.json({ success: true, data: pages });
  });

  static getById = asyncHandler(async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    const { id } = req.params;
    
    // Get languageId from query param or use tenant's default language
    let languageId: string | undefined = req.query.languageId as string | undefined;
    
    // If no languageId provided and tenant exists, use tenant's default language
    if (!languageId && req.tenant?.defaultLanguage) {
      const defaultLanguage = await LanguageService.getByCode(req.tenant.defaultLanguage);
      if (defaultLanguage) {
        languageId = defaultLanguage.id;
      }
    }
    
    // If still no languageId, get system default language
    if (!languageId) {
      const systemDefaultLanguage = await LanguageService.getDefault();
      if (systemDefaultLanguage) {
        languageId = systemDefaultLanguage.id;
      }
    }
    
    const page = await PageService.getById(id, languageId);
    
    if (!page) {
      throw new NotFoundError('Page', id);
    }

    logger.info(`Retrieved page ${id}`);
    res.json({ success: true, data: page });
  });

  static create = asyncHandler(async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    // Get tenantId from authenticated user's token (security: prevent tenant spoofing)
    const tenantId = req.auth?.tenantId;

    if (!tenantId) {
      throw new ValidationError('Authentication required');
    }

    const { category, images, translations } = req.body;

    if (!category) {
      throw new ValidationError('category is required');
    }

    if (!translations || !Array.isArray(translations) || translations.length === 0) {
      throw new ValidationError('At least one translation is required');
    }

    // Validate each translation
    for (const translation of translations) {
      if (!translation.languageId || !translation.title) {
        throw new ValidationError('Each translation must have languageId and title');
      }
    }

    const page = await PageService.create({
      tenantId,
      category,
      images,
      translations,
    });

    logger.info(`Created page ${page.id}`, { pageId: page.id, tenantId, category });
    res.status(201).json({ success: true, data: page });
  });

  static update = asyncHandler(async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    const { id } = req.params;
    const { category, images, translations } = req.body;

    // Validate translations if provided
    if (translations !== undefined) {
      if (!Array.isArray(translations)) {
        throw new ValidationError('Translations must be an array');
      }

      for (const translation of translations) {
        if (!translation.languageId || !translation.title) {
          throw new ValidationError('Each translation must have languageId and title');
        }
      }
    }

    const page = await PageService.update(id, {
      category,
      images,
      translations,
    });

    logger.info(`Updated page ${id}`);
    res.json({ success: true, data: page });
  });

  static remove = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    await PageService.remove(id);
    logger.info(`Deleted page ${id}`);
    res.status(204).send();
  });
}

