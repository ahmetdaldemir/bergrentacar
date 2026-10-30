import { Request, Response } from 'express';
import { LocationPricingService } from '../services/location-pricing.service';
import { asyncHandler, sendSuccess, ValidationError } from '../../../utils/errors';

export class LocationPricingController {
  static listByLocation = asyncHandler(async (req: Request, res: Response) => {
    const { locationId, month } = req.query;
    if (!locationId || typeof locationId !== 'string') throw new ValidationError('Location ID is required');

    const monthNum = month ? parseInt(month as string, 10) : undefined;
    if (monthNum !== undefined && (monthNum < 1 || monthNum > 12)) throw new ValidationError('Month must be between 1 and 12');

    const pricings = await LocationPricingService.listByLocation(locationId, monthNum);
    sendSuccess(res, pricings);
  });

  static getByLocationAndVehicle = asyncHandler(async (req: Request, res: Response) => {
    const { locationId, vehicleId, month } = req.query;
    if (!locationId || typeof locationId !== 'string') throw new ValidationError('Location ID is required');
    if (!vehicleId || typeof vehicleId !== 'string') throw new ValidationError('Vehicle ID is required');

    const monthNum = month ? parseInt(month as string, 10) : undefined;
    if (monthNum !== undefined && (monthNum < 1 || monthNum > 12)) throw new ValidationError('Month must be between 1 and 12');

    const pricings = await LocationPricingService.getByLocationAndVehicle(locationId, vehicleId, monthNum);
    sendSuccess(res, pricings);
  });

  static upsert = asyncHandler(async (req: Request, res: Response) => {
    const pricing = await LocationPricingService.upsert(req.body);
    sendSuccess(res, pricing);
  });

  static bulkUpsert = asyncHandler(async (req: Request, res: Response) => {
    const pricings = await LocationPricingService.bulkUpsert(req.body);
    sendSuccess(res, pricings);
  });

  static remove = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await LocationPricingService.remove(id);
    res.status(204).send();
  });

  static bulkCopyPrice = asyncHandler(async (req: Request, res: Response) => {
    const {
      locationId,
      sourceVehicleId,
      sourceMonth,
      dayRange,
      price,
      copyToAllVehicles = false,
      copyToAllMonths = false,
      copyToAllDayRanges = false,
    } = req.body;

    if (!locationId || !sourceVehicleId || !sourceMonth || !dayRange || price === undefined) {
      throw new ValidationError('locationId, sourceVehicleId, sourceMonth, dayRange, and price are required');
    }

    const pricings = await LocationPricingService.bulkCopyPrice({
      locationId,
      sourceVehicleId,
      sourceMonth: parseInt(sourceMonth, 10),
      dayRange,
      price: parseFloat(price),
      copyToAllVehicles: Boolean(copyToAllVehicles),
      copyToAllMonths: Boolean(copyToAllMonths),
      copyToAllDayRanges: Boolean(copyToAllDayRanges),
    });
    sendSuccess(res, { message: `Price copied to ${pricings.length} pricing entries`, count: pricings.length });
  });
}
