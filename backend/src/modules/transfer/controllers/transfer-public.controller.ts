import { Request, Response } from 'express';
import { TransferPublicService } from '../services/transfer-public.service';
import { TransferPricingService } from '../services/transfer-pricing.service';
import { asyncHandler } from '../../../utils/errors';
import { AppDataSource } from '../../../config/data-source';
import { TransferVehicleFeature } from '../entities/transfer-vehicle-feature.entity';
import { Translation } from '../../shared/entities/translation.entity';
import { In } from 'typeorm';

export class TransferPublicController {
  /**
   * Public endpoint - Tüm fiyatlandırma verileri (tenantId'ye göre)
   * GET /api/transfer/public/pricings?tenantId=xxx&passengerCount=2
   */
  static getAllPricings = asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, passengerCount } = req.query;

    if (!tenantId) {
      return res.status(400).json({ message: 'tenantId is required' });
    }

    const pricings = await TransferPricingService.list(tenantId as string);
    const languageId = req.query.languageId as string | undefined;
    
    // Filter by passenger capacity if passengerCount is provided
    let filteredPricings = pricings;
    if (passengerCount) {
      const passengerCountNum = parseInt(passengerCount as string, 10);
      if (!isNaN(passengerCountNum) && passengerCountNum > 0) {
        filteredPricings = pricings.filter(
          (pricing) => pricing.vehicle && pricing.vehicle.passengerCapacity >= passengerCountNum
        );
      }
    }
    
    // Enrich vehicle features with localized name/icon when languageId provided
    if (languageId) {
      const featureRepo = AppDataSource.getRepository(TransferVehicleFeature);
      const translationRepo = AppDataSource.getRepository(Translation);

      for (const pricing of filteredPricings) {
        const vehicle = pricing.vehicle as any;
        if (!vehicle || !vehicle.features || !Array.isArray(vehicle.features) || vehicle.features.length === 0) {
          continue;
        }

        const rawFeatures: string[] = vehicle.features;

        // Determine whether features are UUIDs (ids) or codes
        const areUuids = rawFeatures.every(f => typeof f === 'string' && /^[0-9a-fA-F-]{36}$/.test(f));

        let foundFeatures: TransferVehicleFeature[] = [];
        if (areUuids) {
          foundFeatures = await featureRepo.find({ where: { id: In(rawFeatures), tenantId: tenantId as string } });
        } else {
          // treat as codes
          foundFeatures = await featureRepo.find({ where: { code: In(rawFeatures), tenantId: tenantId as string } });
        }

        const featureMapById = new Map<string, TransferVehicleFeature>();
        const featureMapByCode = new Map<string, TransferVehicleFeature>();
        foundFeatures.forEach(f => {
          featureMapById.set(f.id, f);
          if (f.code) featureMapByCode.set(f.code, f);
        });

        // Fetch translations for these features
        const featureIds = foundFeatures.map(f => f.id);
        const translations = featureIds.length > 0
          ? await translationRepo.find({
              where: {
                model: 'TransferVehicleFeature',
                modelId: In(featureIds),
                languageId,
                tenantId: tenantId as string,
              },
            })
          : [];
        const translationMap = new Map<string, Translation>();
        translations.forEach(t => translationMap.set(t.modelId, t));

        // Build localized feature objects preserving original order
        const localizedFeatures = rawFeatures.map(raw => {
          const featureEntity = areUuids ? featureMapById.get(raw) : featureMapByCode.get(raw);
          const id = featureEntity ? featureEntity.id : raw;
          const code = featureEntity ? featureEntity.code : (areUuids ? null : raw);
          const translation = translationMap.get(id);
          const name = translation?.name || featureEntity?.name || raw;
          const icon = featureEntity?.icon || null;
          return { id, code, name, icon };
        });

        vehicle.features = localizedFeatures;
      }
    }

    res.json({ success: true, data: filteredPricings });
  });

  /**
   * Public endpoint - Search available transfer routes and vehicles
   * GET /api/transfer/public/search
   */
  static searchTransfers = asyncHandler(async (req: Request, res: Response) => {
    const {
      tenantId,
      languageId,
      originType,
      originId,
      destinationType,
      destinationId,
      transferDate,
      transferTime,
      passengerCount,
      isRoundTrip,
      currencyId,
    } = req.query;

    // Validate required parameters
    if (!tenantId || !originType || !originId || !destinationType || !destinationId || !transferDate) {
      return res.status(400).json({
        message: 'Missing required parameters: tenantId, originType, originId, destinationType, destinationId, transferDate are required',
      });
    }

    // Validate and parse passengerCount
    const parsedPassengerCount = passengerCount ? parseInt(passengerCount as string, 10) : 1;
    if (isNaN(parsedPassengerCount) || parsedPassengerCount < 1 || parsedPassengerCount > 50) {
      return res.status(400).json({
        message: 'passengerCount must be a valid number between 1 and 50',
      });
    }

    const result = await TransferPublicService.searchTransfers({
      tenantId: tenantId as string,
      languageId: languageId as string | undefined,
      originType: originType as 'airport' | 'hotel' | 'location',
      originId: originId as string,
      destinationType: destinationType as 'airport' | 'hotel' | 'location',
      destinationId: destinationId as string,
      transferDate: transferDate as string,
      transferTime: (transferTime as string) || '10:00',
      passengerCount: parsedPassengerCount,
      isRoundTrip: isRoundTrip === 'true',
      currencyId: currencyId as string | undefined,
    });

    res.json(result);
  });

  /**
   * Public endpoint - Get available routes
   * GET /api/transfer/public/routes
   */
  static getAvailableRoutes = asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, languageId } = req.query;

    if (!tenantId) {
      return res.status(400).json({ message: 'tenantId is required' });
    }

    const routes = await TransferPublicService.getAvailableRoutes(
      tenantId as string,
      languageId as string | undefined
    );

    res.json(routes);
  });

  /**
   * Public endpoint - Get pickup and dropoff locations (for site display)
   * GET /api/transfer/public/locations
   */
  static getTransferLocations = asyncHandler(async (req: Request, res: Response) => {
    const { tenantId } = req.query;

    if (!tenantId) {
      return res.status(400).json({ message: 'tenantId is required' });
    }

    const locations = await TransferPublicService.getTransferLocations(tenantId as string);

    res.json(locations);
  });

  /**
   * Public endpoint - Get vehicles for a specific route
   * GET /api/transfer/public/vehicles
   */
  static getAvailableVehicles = asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, routeId, languageId, passengerCount } = req.query;

    if (!tenantId || !routeId) {
      return res.status(400).json({ message: 'tenantId and routeId are required' });
    }

    const vehicles = await TransferPublicService.getAvailableVehicles({
      tenantId: tenantId as string,
      routeId: routeId as string,
      languageId: languageId as string | undefined,
      passengerCount: passengerCount ? parseInt(passengerCount as string, 10) : undefined,
    });

    res.json(vehicles);
  });

  /**
   * Public endpoint - Calculate transfer price
   * POST /api/transfer/public/calculate-price
   */
  static calculatePrice = asyncHandler(async (req: Request, res: Response) => {
    const { tenantId, vehicleId, routeId, transferDate, transferTime, passengerCount, distanceKm, isRoundTrip, extraServices, currencyId } =
      req.body;

    if (!tenantId || !vehicleId || !transferDate || !passengerCount || !distanceKm) {
      return res.status(400).json({
        message: 'tenantId, vehicleId, transferDate, passengerCount, and distanceKm are required',
      });
    }

    const result = await TransferPublicService.calculatePrice({
      tenantId,
      vehicleId,
      routeId,
      transferDate,
      transferTime: transferTime || '10:00',
      passengerCount: parseInt(passengerCount, 10) || 1,
      distanceKm: parseFloat(distanceKm) || 0,
      isRoundTrip: isRoundTrip || false,
      extraServices,
      currencyId,
    });

    res.json(result);
  });

  /**
   * Public endpoint - Create transfer reservation
   * POST /api/transfer/public/reservations
   */
  static createReservation = asyncHandler(async (req: Request, res: Response) => {
    const reservationData = req.body;

    if (!reservationData.tenantId) {
      return res.status(400).json({ message: 'tenantId is required' });
    }

    const reservation = await TransferPublicService.createReservation(reservationData);

    res.status(201).json(reservation);
  });

  /**
   * Public endpoint - Get reservation by reference
   * GET /api/transfer/public/reservations/:reference
   */
  static getReservationByReference = asyncHandler(async (req: Request, res: Response) => {
    const { reference } = req.params;
    const { tenantId } = req.query;

    if (!tenantId) {
      return res.status(400).json({ message: 'tenantId is required' });
    }

    const reservation = await TransferPublicService.getReservationByReference(reference, tenantId as string);

    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    res.json(reservation);
  });
}
