import { Response } from 'express';
import { VehicleTimelineService } from '../services/vehicle-timeline.service';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { asyncHandler, sendSuccess, UnauthorizedError } from '../../../utils/errors';

export class VehicleTimelineController {
  static getTimeline = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const { id: vehicleId } = req.params;
    const timeline = await VehicleTimelineService.getTimeline(vehicleId, tenantId);
    sendSuccess(res, timeline);
  });
}
