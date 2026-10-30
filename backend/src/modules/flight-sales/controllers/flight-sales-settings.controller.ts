import { Response } from 'express';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { asyncHandler, sendSuccess } from '../../../utils/errors';
import { getTenantIdFromAuth } from '../../../utils/validation';
import { FlightSalesSettingsService } from '../services/flight-sales-settings.service';

export class FlightSalesSettingsController {
  static get = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = getTenantIdFromAuth(req)!;
    const settings = await FlightSalesSettingsService.getPublic(tenantId);
    sendSuccess(res, settings);
  });

  static update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = getTenantIdFromAuth(req)!;
    const settings = await FlightSalesSettingsService.update(tenantId, req.body || {});
    sendSuccess(res, settings);
  });
}
