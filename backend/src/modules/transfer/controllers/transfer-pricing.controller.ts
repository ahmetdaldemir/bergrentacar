import { Request, Response } from 'express';
import { TransferPricingService, CreateTransferPricingInput, UpdateTransferPricingInput } from '../services/transfer-pricing.service';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { asyncHandler, sendSuccess, ValidationError, NotFoundError, UnauthorizedError } from '../../../utils/errors';

export class TransferPricingController {
  static list = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as AuthenticatedRequest).auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const filters: any = {};
    if (req.query.vehicleId) filters.vehicleId = req.query.vehicleId as string;
    const pricings = await TransferPricingService.list(tenantId, filters);
    sendSuccess(res, pricings);
  });

  static getById = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as AuthenticatedRequest).auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { id } = req.params;
    const pricing = await TransferPricingService.getById(id, tenantId);
    if (!pricing) throw new NotFoundError('Transfer pricing', id);
    sendSuccess(res, pricing);
  });

  static create = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as AuthenticatedRequest).auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const input: CreateTransferPricingInput = { ...req.body, tenantId };
    const pricing = await TransferPricingService.create(input);
    sendSuccess(res, pricing, 201);
  });

  static update = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as AuthenticatedRequest).auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { id } = req.params;
    const input: UpdateTransferPricingInput = req.body;
    const pricing = await TransferPricingService.update(id, tenantId, input);
    sendSuccess(res, pricing);
  });

  static delete = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as AuthenticatedRequest).auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { id } = req.params;
    await TransferPricingService.delete(id, tenantId);
    res.status(204).send();
  });

  static calculatePrice = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as AuthenticatedRequest).auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { vehicleId, routeId, distanceKm, passengerCount, isRoundTrip, isNightRate, extraServices } = req.body;
    if (!vehicleId || !distanceKm || !passengerCount) {
      throw new ValidationError('vehicleId, distanceKm, and passengerCount are required');
    }
    const result = await TransferPricingService.calculatePrice({
      tenantId,
      vehicleId,
      distanceKm: Number(distanceKm),
      passengerCount: Number(passengerCount),
      extraServices,
    });
    sendSuccess(res, result);
  });

  static getByVehicleId = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as AuthenticatedRequest).auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { vehicleId } = req.params;
    const pricing = await TransferPricingService.getByVehicleId(vehicleId, tenantId);
    if (!pricing) throw new NotFoundError('Pricing', vehicleId);
    sendSuccess(res, pricing);
  });
}
