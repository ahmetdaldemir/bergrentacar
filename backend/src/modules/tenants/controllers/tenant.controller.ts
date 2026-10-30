import { Request, Response } from 'express';
import { TenantService } from '../services/tenant.service';
import { logger } from '../../../utils/logger';
import { asyncHandler, sendSuccess, ValidationError, NotFoundError, ForbiddenError } from '../../../utils/errors';
import { SITE_TENANT_ID } from '../../../security/bergrentacar-site';
import { TenantSettingsService } from '../../shared/services/tenant-settings.service';

export class TenantController {
  static create = asyncHandler(async (_req: Request, _res: Response) => {
    throw new ForbiddenError('This installation does not accept new organizations');
  });

  static getByQuery = asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.query;
    if (!tenantId || typeof tenantId !== 'string') {
      throw new ValidationError('tenantId query parameter is required');
    }
    if (tenantId !== SITE_TENANT_ID) throw new NotFoundError('Tenant', tenantId);
    const tenant = await TenantService.getTenantById(tenantId);
    if (!tenant) throw new NotFoundError('Tenant', tenantId);

    const rawSettings = await TenantSettingsService.getSettings(tenantId);

    // Hassas alanlar (smtp şifresi, api key'ler) public endpoint'e dahil edilmez
    const settings = rawSettings ? {
      siteName: rawSettings.siteName ?? null,
      siteDescription: rawSettings.siteDescription ?? null,
      logoUrl: rawSettings.logoUrl ?? null,
      faviconUrl: rawSettings.faviconUrl ?? null,
      companyName: rawSettings.companyName ?? null,
      companyAddress: rawSettings.companyAddress ?? null,
      companyPhone: rawSettings.companyPhone ?? null,
      companyEmail: rawSettings.companyEmail ?? null,
      companyWebsite: rawSettings.companyWebsite ?? null,
      companyTaxNumber: rawSettings.companyTaxNumber ?? null,
      fromEmail: rawSettings.fromEmail ?? null,
      fromName: rawSettings.fromName ?? null,
    } : null;

    sendSuccess(res, { ...tenant, settings });
  });

  static getById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (id !== SITE_TENANT_ID) throw new NotFoundError('Tenant', id);
    const tenant = await TenantService.getTenantById(id);
    if (!tenant) throw new NotFoundError('Tenant', id);
    sendSuccess(res, tenant);
  });

  static update = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (id !== SITE_TENANT_ID) throw new ForbiddenError('Forbidden');
    const { name, slug, category, defaultLanguage, supportEmail, defaultCurrencyId } = req.body;
    const tenant = await TenantService.updateTenant(id, { name, slug, category, defaultLanguage, supportEmail, defaultCurrencyId });
    sendSuccess(res, tenant);
  });

  static updateDefaultCurrency = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (id !== SITE_TENANT_ID) throw new ForbiddenError('Forbidden');
    const { defaultCurrencyId } = req.body;
    logger.info(`Update default currency request`, { tenantId: id, defaultCurrencyId, body: req.body });
    if (defaultCurrencyId === undefined) throw new ValidationError('defaultCurrencyId is required');
    const tenant = await TenantService.updateDefaultCurrency(id, defaultCurrencyId ?? null);
    sendSuccess(res, tenant);
  });
}
