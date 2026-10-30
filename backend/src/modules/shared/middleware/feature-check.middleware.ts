import { Request, Response, NextFunction } from 'express';
import { TenantRequest } from '../../../middleware/tenant.middleware';
import { TenantFeaturesService } from '../services/tenant-features.service';
import { ForbiddenError } from '../../../utils/errors';

/**
 * Middleware to check if tenant has a specific feature enabled.
 * Includes both utility features (finance, chat, …) and product modules (tour, transfer, rentacar).
 */
export function requireFeature(
  feature: 'finance' | 'vehicleTracking' | 'chat' | 'ai' | 'tour' | 'transfer' | 'rentacar' | 'hotel' | 'flight',
) {
  return async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.tenant) {
        throw new ForbiddenError('Tenant not found');
      }

      const hasFeature = await TenantFeaturesService.hasFeature(req.tenant.id, feature);
      if (!hasFeature) {
        throw new ForbiddenError(`Feature '${feature}' is not enabled for this tenant`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

