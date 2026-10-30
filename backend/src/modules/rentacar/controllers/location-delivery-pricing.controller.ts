import { Request, Response } from 'express';
import { LocationDeliveryPricingService } from '../services/location-delivery-pricing.service';
import { asyncHandler, sendSuccess, ValidationError } from '../../../utils/errors';

export class LocationDeliveryPricingController {
  static listByLocation = asyncHandler(async (req: Request, res: Response) => {
    const { locationId } = req.query;
    if (!locationId || typeof locationId !== 'string') throw new ValidationError('Location ID is required');

    const pricings = await LocationDeliveryPricingService.listByLocation(locationId);
    sendSuccess(res, pricings);
  });

  static upsert = asyncHandler(async (req: Request, res: Response) => {
    const pricing = await LocationDeliveryPricingService.upsert(req.body);
    sendSuccess(res, pricing);
  });

  static bulkUpsert = asyncHandler(async (req: Request, res: Response) => {
    const pricings = await LocationDeliveryPricingService.bulkUpsert(req.body);
    sendSuccess(res, pricings);
  });

  static remove = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await LocationDeliveryPricingService.remove(id);
    res.status(204).send();
  });
}
