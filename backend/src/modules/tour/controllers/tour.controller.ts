import { Response } from 'express';
import { TourService } from '../services/tour.service';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { TenantRequest } from '../../../middleware/tenant.middleware';
import { asyncHandler, sendSuccess, UnauthorizedError, NotFoundError } from '../../../utils/errors';

type TourRequest = AuthenticatedRequest & TenantRequest;

export class TourController {
  static create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const tour = await TourService.createTour({ ...req.body, tenantId });
    sendSuccess(res, tour, 201);
  });

  static list = asyncHandler(async (req: TourRequest, res: Response) => {
    // Panel: req.auth?.tenantId (JWT); Public site: req.tenant?.id (subdomain)
    const tenantId = req.auth?.tenantId ?? req.tenant?.id;
    if (!tenantId) throw new UnauthorizedError('Tenant context required');
    const tours = await TourService.listTours(tenantId);
    sendSuccess(res, tours);
  });

  static getById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tour = await TourService.getTourById(id);
    if (!tour) throw new NotFoundError('Tour', id);
    sendSuccess(res, tour);
  });

  static update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const tour = await TourService.updateTour(id, { ...req.body, tenantId });
    sendSuccess(res, tour);
  });

  static remove = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    await TourService.removeTour(id);
    res.status(204).send();
  });
}
