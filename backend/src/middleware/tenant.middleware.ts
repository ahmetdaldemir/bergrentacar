/**
 * Single-site tenant binding.
 * The process always serves the bergrentacar.com tenant. Subdomain SaaS resolution is not used.
 */

import { Request, Response, NextFunction } from 'express';
import { TenantService } from '../modules/tenants/services/tenant.service';
import { Tenant } from '../modules/tenants/entities/tenant.entity';
import { SITE_TENANT_ID } from '../security/bergrentacar-site';
import { logger } from '../utils/logger';

export interface TenantRequest extends Request {
  tenant?: Tenant;
  tenantSlug?: string;
}

export const tenantMiddleware = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenant = await TenantService.getTenantById(SITE_TENANT_ID);
    if (!tenant || !tenant.isActive) {
      logger.error('bergrentacar tenant is missing or inactive', { tenantId: SITE_TENANT_ID });
      res.status(503).json({ message: 'Site is not available' });
      return;
    }

    req.tenant = tenant;
    req.tenantSlug = tenant.slug;
    next();
  } catch (error) {
    next(error);
  }
};
