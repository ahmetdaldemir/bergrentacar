import { Request, Response } from 'express';
import { LocationService } from '../services/location.service';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { asyncHandler, sendSuccess, ValidationError, UnauthorizedError, NotFoundError } from '../../../utils/errors';

export class LocationController {
  static list = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as Record<string, unknown>;
    const tenantId =
      (query.tenantId as string) ??
      (query.params as Record<string, string> | undefined)?.tenantId ??
      (query['params[tenantId]'] as string);
    const parentLocationId = query.parentLocationId as string | undefined;
    const isActiveParam = query.isActive as string | undefined;
    if (!tenantId) throw new ValidationError('tenantId is required');

    let isActive: boolean | undefined = undefined;
    if (isActiveParam !== undefined) isActive = isActiveParam === 'true' || isActiveParam === '1';

    const locations = await LocationService.list(tenantId, parentLocationId, isActive);
    sendSuccess(res, locations);
  });

  static create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');

    const location = await LocationService.create({ ...req.body, tenantId });
    sendSuccess(res, location, 201);
  });

  static getById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const location = await LocationService.getById(id);
    if (!location) throw new NotFoundError('Location', id);
    sendSuccess(res, location);
  });

  static update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const location = await LocationService.update(id, req.body);
    sendSuccess(res, location);
  });

  static remove = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    await LocationService.remove(id);
    res.status(204).send();
  });
}
