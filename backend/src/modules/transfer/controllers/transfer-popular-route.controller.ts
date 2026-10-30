import { Response } from 'express';
import { TransferPopularRouteService } from '../services/transfer-popular-route.service';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { asyncHandler, sendSuccess, ValidationError, NotFoundError, UnauthorizedError } from '../../../utils/errors';

export class TransferPopularRouteController {
  static list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
    const popularRoutes = await TransferPopularRouteService.list(tenantId, isActive);
    sendSuccess(res, popularRoutes);
  });

  static getById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { id } = req.params;
    const popularRoute = await TransferPopularRouteService.getById(id, tenantId);
    if (!popularRoute) throw new NotFoundError('Popular route', id);
    sendSuccess(res, popularRoute);
  });

  static create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const {
      pickupPlaceId,
      pickupAddress,
      pickupLat,
      pickupLng,
      dropoffPlaceId,
      dropoffAddress,
      dropoffLat,
      dropoffLng,
      vehicleId,
      name,
      routeId,
      fixedPrice,
      currencyId,
      isActive,
      sortOrder,
      description,
      passengerCount,
    } = req.body;
    if (
      !pickupPlaceId ||
      !pickupAddress ||
      !pickupLat ||
      !pickupLng ||
      !dropoffPlaceId ||
      !dropoffAddress ||
      !dropoffLat ||
      !dropoffLng ||
      !vehicleId
    ) {
      throw new ValidationError(
        'pickupPlaceId, pickupAddress, pickupLat, pickupLng, dropoffPlaceId, dropoffAddress, dropoffLat, dropoffLng and vehicleId are required'
      );
    }
    if (fixedPrice !== undefined && fixedPrice < 0) throw new ValidationError('Price cannot be negative');
    const popularRoute = await TransferPopularRouteService.create({
      tenantId,
      pickupPlaceId,
      pickupAddress,
      pickupLat,
      pickupLng,
      dropoffPlaceId,
      dropoffAddress,
      dropoffLat,
      dropoffLng,
      vehicleId,
      name,
      routeId,
      fixedPrice: fixedPrice !== undefined ? Number(fixedPrice) : undefined,
      currencyId,
      isActive,
      sortOrder,
      description,
      passengerCount: passengerCount ? Number(passengerCount) : 1,
    });
    sendSuccess(res, popularRoute, 201);
  });

  static update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { id } = req.params;
    const { fixedPrice, currencyId, isActive, sortOrder, description, routeId, vehicleId } = req.body;
    if (fixedPrice !== undefined && fixedPrice < 0) throw new ValidationError('Price cannot be negative');
    const updateData: any = {
      fixedPrice: fixedPrice !== undefined ? Number(fixedPrice) : undefined,
      currencyId,
      isActive,
      sortOrder,
      description,
    };
    if (routeId !== undefined) updateData.routeId = routeId;
    if (vehicleId !== undefined) updateData.vehicleId = vehicleId;
    const popularRoute = await TransferPopularRouteService.update(id, tenantId, updateData);
    sendSuccess(res, popularRoute);
  });

  static delete = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { id } = req.params;
    await TransferPopularRouteService.delete(id, tenantId);
    res.status(204).send();
  });

  static getPrice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { pickupPlaceId, dropoffPlaceId, vehicleId, passengerCount } = req.query;
    if (!pickupPlaceId || !dropoffPlaceId || !vehicleId) {
      throw new ValidationError('pickupPlaceId, dropoffPlaceId and vehicleId query params are required');
    }
    const price = await TransferPopularRouteService.getPrice(
      pickupPlaceId as string,
      dropoffPlaceId as string,
      vehicleId as string,
      tenantId,
      passengerCount ? Number(passengerCount) : 1
    );
    if (!price) throw new NotFoundError('Popular route price', 'combination');
    sendSuccess(res, price);
  });

  static getFixedPrice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { routeId, vehicleId } = req.query;
    if (!routeId || !vehicleId) {
      throw new ValidationError('routeId and vehicleId query params are required');
    }
    const price = await TransferPopularRouteService.getFixedPrice(
      routeId as string,
      vehicleId as string,
      tenantId
    );
    if (!price) throw new NotFoundError('Popular route fixed price', 'combination');
    sendSuccess(res, price);
  });
}
