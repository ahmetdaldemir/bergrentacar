import { Request, Response } from 'express';
import { VehicleService } from '../services/vehicle.service';
import { VehicleImageService } from '../services/vehicle-image.service';
import { RentacarReservationService } from '../services/rentacar-reservation.service';
import { SeasonName } from '../entities/vehicle-pricing-period.entity';
import { AppDataSource } from '../../../config/data-source';
import { Vehicle } from '../entities/vehicle.entity';
import { Location } from '../entities/location.entity';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { asyncHandler, sendSuccess, ValidationError } from '../../../utils/errors';
import path from 'path';
import fs from 'fs';
import { processImageTo72DPI } from '../../../utils/image-processor';
import { getUploadsDir } from '../../../config/uploads-path';

/** İlk aktif rentacar lokasyonu (sort → oluşturulma); fiyat hesabı için gerekli */
async function getDefaultActiveRentacarLocationId(tenantId: string): Promise<string> {
  const repo = AppDataSource.getRepository(Location);
  const loc = await repo.findOne({
    where: { tenantId, isActive: true },
    order: { sort: 'ASC', createdAt: 'ASC' },
  });
  if (!loc) {
    throw new ValidationError('Bu tenant için aktif rentacar lokasyonu yok');
  }
  return loc.id;
}

async function runWeeklyPromoSearch(params: {
  tenantId: string;
  pickupLocationId: string;
  dropoffLocationId: string;
  languageId?: string;
  rentalDays: number;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const pickupDate = today.toISOString().slice(0, 10);
  const end = new Date(today);
  end.setDate(end.getDate() + params.rentalDays);
  const dropoffDate = end.toISOString().slice(0, 10);

  const result = await VehicleService.searchVehicles({
    tenantId: params.tenantId,
    languageId: params.languageId,
    pickupLocationId: params.pickupLocationId,
    dropoffLocationId: params.dropoffLocationId,
    pickupDate,
    dropoffDate,
    pickupTime: '10:00',
    dropoffTime: '10:00',
  });

  const vehicles = [...result.vehicles].sort((a, b) => a.totalPrice - b.totalPrice);
  return {
    vehicles,
    extras: result.extras,
    pickupDate,
    dropoffDate,
    rentalDays: params.rentalDays,
  };
}

export class RentacarController {
  static listVehicles = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as Record<string, unknown>;
    const tenantId =
      (query.tenantId as string) ??
      (query.params as Record<string, string> | undefined)?.tenantId ??
      (query['params[tenantId]'] as string);
    if (!tenantId) {
      return res.status(400).json({ message: 'tenantId is required' });
    }

    const vehicles = await VehicleService.listVehicles(tenantId);
    
    // Convert TypeORM entities to plain JSON objects and populate brand/model info
    const vehiclesWithBrandModel = vehicles.map(vehicle => {
      // Use JSON parse/stringify to get plain object from TypeORM entity
      const vehicleData = JSON.parse(JSON.stringify(vehicle));
      
      // Populate brandName and brandId from brand relation if available
      if (vehicle.brand) {
        if (!vehicleData.brandName && vehicle.brand.name) {
          vehicleData.brandName = vehicle.brand.name;
        }
        if (!vehicleData.brandId && vehicle.brand.id) {
          vehicleData.brandId = vehicle.brand.id;
        }
        vehicleData.brand = vehicle.brand;
      }
      
      // Populate modelName and modelId from model relation if available
      if (vehicle.model) {
        if (!vehicleData.modelName && vehicle.model.name) {
          vehicleData.modelName = vehicle.model.name;
        }
        if (!vehicleData.modelId && vehicle.model.id) {
          vehicleData.modelId = vehicle.model.id;
        }
        vehicleData.model = vehicle.model;
      }
      
      return vehicleData;
    });
    
    res.json(vehiclesWithBrandModel);
  });

  static listPlates = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const plates = await VehicleService.listPlates(tenantId);
    res.json(plates);
  });

  static getPlateCalendar = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;

    if (month < 1 || month > 12) {
      return res.status(400).json({ message: 'Invalid month' });
    }

    const calendar = await VehicleService.getPlateCalendar(tenantId, year, month);
    res.json(calendar);
  });

  /**
   * Harici web siteleri için: bugünden itibaren N günlük kiralama fiyatına göre araç listesi (totalPrice artan).
   * GET /api/rentacar/public/promo-vehicles?tenantId=&pickupLocationId=&dropoffLocationId=&rentalDays=7&languageId=
   */
  static promoVehicles = asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as Record<string, string | undefined>;
    const tenantId = q.tenantId?.trim();
    const pickupLocationId = q.pickupLocationId?.trim();
    const dropoffLocationId = q.dropoffLocationId?.trim();
    const languageId = q.languageId?.trim() || undefined;
    const rentalDaysRaw = parseInt(String(q.rentalDays ?? '7'), 10);
    const rentalDays = Number.isFinite(rentalDaysRaw) ? Math.min(30, Math.max(1, rentalDaysRaw)) : 7;

    if (!tenantId || !pickupLocationId || !dropoffLocationId) {
      throw new ValidationError('tenantId, pickupLocationId ve dropoffLocationId zorunludur');
    }

    const data = await runWeeklyPromoSearch({
      tenantId,
      pickupLocationId,
      dropoffLocationId,
      languageId,
      rentalDays,
    });
    sendSuccess(res, data);
  });

  /**
   * Tenant’ın tüm uygun araçları — bugünden itibaren N günlük kiralama fiyatı (totalPrice artan).
   * Lokasyon verilmezse tenant’ın ilk aktif rentacar lokasyonu alış ve iade için kullanılır.
   * GET /api/rentacar/public/tenant-weekly-prices?tenantId=&rentalDays=7&languageId=&pickupLocationId=&dropoffLocationId=
   */
  static tenantWeeklyPrices = asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as Record<string, string | undefined>;
    const tenantId = q.tenantId?.trim();
    if (!tenantId) {
      throw new ValidationError('tenantId zorunludur');
    }
    const languageId = q.languageId?.trim() || undefined;
    const rentalDaysRaw = parseInt(String(q.rentalDays ?? '7'), 10);
    const rentalDays = Number.isFinite(rentalDaysRaw) ? Math.min(30, Math.max(1, rentalDaysRaw)) : 7;

    const pickupQ = q.pickupLocationId?.trim();
    const dropQ = q.dropoffLocationId?.trim();
    if ((pickupQ && !dropQ) || (!pickupQ && dropQ)) {
      throw new ValidationError('pickupLocationId ve dropoffLocationId birlikte verilmeli veya ikisi de boş bırakılmalı');
    }

    let pickupLocationId = pickupQ;
    let dropoffLocationId = dropQ;
    let locationDefaulted = false;
    if (!pickupLocationId || !dropoffLocationId) {
      const defId = await getDefaultActiveRentacarLocationId(tenantId);
      pickupLocationId = defId;
      dropoffLocationId = defId;
      locationDefaulted = true;
    }

    const data = await runWeeklyPromoSearch({
      tenantId,
      pickupLocationId,
      dropoffLocationId,
      languageId,
      rentalDays,
    });
    sendSuccess(res, {
      ...data,
      pickupLocationId,
      dropoffLocationId,
      locationDefaulted,
    });
  });

  static searchVehicles = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as Record<string, string | undefined>;
    const tenantId =
      query.tenantId ??
      (query.params as Record<string, string> | undefined)?.tenantId ??
      query['params[tenantId]'];
    const {
      languageId,
      pickupLocationId,
      dropoffLocationId,
      pickupDate,
      dropoffDate,
      pickupTime,
      dropoffTime,
      currencyId,
      segment,
      sortBy,
      sortOrder,
    } = req.query;

    // Validate required parameters
    if (!tenantId || !pickupLocationId || !dropoffLocationId || !pickupDate || !dropoffDate) {
      return res.status(400).json({
        message: 'Missing required parameters: tenantId, pickupLocationId, dropoffLocationId, pickupDate, dropoffDate are required',
      });
    }

    try {
      // Fiyatlar sık değişir; GET olduğu için CDN/tarayıcı önbelleğini devre dışı bırak
      res.setHeader('Cache-Control', 'no-store');

      const result = await VehicleService.searchVehicles({
        tenantId: tenantId as string,
        languageId: languageId as string | undefined,
        pickupLocationId: pickupLocationId as string,
        dropoffLocationId: dropoffLocationId as string,
        pickupDate: pickupDate as string,
        dropoffDate: dropoffDate as string,
        pickupTime: pickupTime as string | undefined,
        dropoffTime: dropoffTime as string | undefined,
        currencyId: currencyId as string | undefined,
        segment: segment as string | undefined, // Vehicle category ID to filter by
        sortBy: typeof sortBy === 'string' ? sortBy : undefined,
        sortOrder: typeof sortOrder === 'string' ? sortOrder : undefined,
      });

      res.json(result);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  static async createVehicle(req: AuthenticatedRequest, res: Response) {
    try {
      // Get tenantId from authenticated user's token (security: prevent tenant spoofing)
      const tenantId = req.auth?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Override tenantId from body to prevent security issues
      const vehicle = await VehicleService.createVehicle({
        ...req.body,
        tenantId, // Always use authenticated user's tenantId
      });
      res.status(201).json(vehicle);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  }

  static async updateVehicle(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      // Get tenantId from authenticated user's token (security)
      const tenantId = req.auth?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      // Override tenantId from body to prevent security issues
      const vehicle = await VehicleService.updateVehicle(id, {
        ...req.body,
        tenantId, // Always use authenticated user's tenantId
      });
      res.json(vehicle);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  }

  static async getVehicle(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      // Get tenantId from authenticated user's token (security)
      const tenantId = req.auth?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      const vehicle = await VehicleService.listVehicles(tenantId);
      const found = vehicle.find(v => v.id === id);
      if (!found) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }
      res.json(found);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  }

  static async deleteVehicle(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      // Get tenantId from authenticated user's token (security)
      const tenantId = req.auth?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      const vehicleRepo = AppDataSource.getRepository(Vehicle);
      const vehicle = await vehicleRepo.findOne({ where: { id, tenantId } });
      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }
      await vehicleRepo.remove(vehicle);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  }

  static async addPlate(req: AuthenticatedRequest, res: Response) {
    try {
      const plate = await VehicleService.addPlate({
        vehicleId: req.params.vehicleId,
        plateNumber: req.body.plateNumber,
        registrationDate: req.body.registrationDate,
        documentNumber: req.body.documentNumber,
        serialNumber: req.body.serialNumber,
        km: req.body.km,
        oilKm: req.body.oilKm,
        description: req.body.description,
        comprehensiveInsuranceCompany: req.body.comprehensiveInsuranceCompany,
        comprehensiveInsuranceStart: req.body.comprehensiveInsuranceStart,
        comprehensiveInsuranceEnd: req.body.comprehensiveInsuranceEnd,
        trafficInsuranceCompany: req.body.trafficInsuranceCompany,
        trafficInsuranceStart: req.body.trafficInsuranceStart,
        trafficInsuranceEnd: req.body.trafficInsuranceEnd,
        inspectionCompany: req.body.inspectionCompany,
        inspectionStart: req.body.inspectionStart,
        inspectionEnd: req.body.inspectionEnd,
        exhaustInspectionCompany: req.body.exhaustInspectionCompany,
        exhaustInspectionStart: req.body.exhaustInspectionStart,
        exhaustInspectionEnd: req.body.exhaustInspectionEnd,
      });
      res.status(201).json(plate);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  }

  static async updatePlate(req: AuthenticatedRequest, res: Response) {
    try {
      const { vehicleId, plateId } = req.params;
      const plate = await VehicleService.updatePlate(plateId, {
        vehicleId,
        plateNumber: req.body.plateNumber,
        registrationDate: req.body.registrationDate,
        documentNumber: req.body.documentNumber,
        serialNumber: req.body.serialNumber,
        km: req.body.km,
        oilKm: req.body.oilKm,
        description: req.body.description,
        comprehensiveInsuranceCompany: req.body.comprehensiveInsuranceCompany,
        comprehensiveInsuranceStart: req.body.comprehensiveInsuranceStart,
        comprehensiveInsuranceEnd: req.body.comprehensiveInsuranceEnd,
        trafficInsuranceCompany: req.body.trafficInsuranceCompany,
        trafficInsuranceStart: req.body.trafficInsuranceStart,
        trafficInsuranceEnd: req.body.trafficInsuranceEnd,
        inspectionCompany: req.body.inspectionCompany,
        inspectionStart: req.body.inspectionStart,
        inspectionEnd: req.body.inspectionEnd,
        exhaustInspectionCompany: req.body.exhaustInspectionCompany,
        exhaustInspectionStart: req.body.exhaustInspectionStart,
        exhaustInspectionEnd: req.body.exhaustInspectionEnd,
      });
      res.json(plate);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  }

  static async deletePlate(req: AuthenticatedRequest, res: Response) {
    try {
      const { plateId } = req.params;
      await VehicleService.removePlate(plateId);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  }

  static async upsertPricing(req: AuthenticatedRequest, res: Response) {
    try {
      const pricing = await VehicleService.upsertPricing({
        vehicleId: req.params.vehicleId,
        season: req.body.season as SeasonName,
        month: req.body.month,
        dailyRate: req.body.dailyRate,
        weeklyRate: req.body.weeklyRate,
      });
      res.status(201).json(pricing);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  }

  static async assignPlate(req: AuthenticatedRequest, res: Response) {
    try {
      const assignment = await VehicleService.assignPlate({
        reservationId: req.params.reservationId,
        plateId: req.body.plateId
      });
      res.status(201).json(assignment);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  }

  static async extendReservation(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await VehicleService.extendReservation({
        reservationId: req.params.reservationId,
        newReturnDate: req.body.newReturnDate,
        newReturnTime: req.body.newReturnTime,
        plateId: req.body.plateId,
        forceExtend: req.body.forceExtend === true,
      });
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  }

  static async updateLastReturnLocation(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { locationId } = req.body as any;
      const vehicle = await VehicleService.updateLastReturnLocation(id, locationId || null);
      res.json(vehicle);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  }

  static async uploadVehicleImage(req: AuthenticatedRequest, res: Response) {
    try {
      const { vehicleId } = req.params;
      const tenantId = req.auth?.tenantId;

      if (!tenantId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const uploadsDir = getUploadsDir();
      const originalPath = path.join(uploadsDir, req.file.filename);
      
      // Process image to 72 DPI
      const processedFilename = `vehicle-${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
      const processedPath = path.join(uploadsDir, processedFilename);
      
      await processImageTo72DPI(originalPath, processedPath);
      
      // Delete original file
      if (fs.existsSync(originalPath)) {
        fs.unlinkSync(originalPath);
      }

      // Create public URL
      const fileUrl = `/uploads/${processedFilename}`;

      // Save image record
      const image = await VehicleImageService.create(
        {
          vehicleId,
          url: fileUrl,
          alt: req.body.alt,
          order: req.body.order ? parseInt(req.body.order) : undefined,
          isPrimary: req.body.isPrimary === 'true' || req.body.isPrimary === true,
        },
        tenantId
      );

      res.status(201).json(image);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  }

  static async listVehicleImages(req: AuthenticatedRequest, res: Response) {
    try {
      const { vehicleId } = req.params;
      const tenantId = req.auth?.tenantId;

      if (!tenantId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const images = await VehicleImageService.list(vehicleId, tenantId);
      res.json(images);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  }

  static async updateVehicleImage(req: AuthenticatedRequest, res: Response) {
    try {
      const { vehicleId, imageId } = req.params;
      const tenantId = req.auth?.tenantId;

      if (!tenantId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const image = await VehicleImageService.update(
        imageId,
        vehicleId,
        tenantId,
        {
          alt: req.body.alt,
          order: req.body.order,
          isPrimary: req.body.isPrimary,
        }
      );

      res.json(image);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  }

  static async deleteVehicleImage(req: AuthenticatedRequest, res: Response) {
    try {
      const { vehicleId, imageId } = req.params;
      const tenantId = req.auth?.tenantId;

      if (!tenantId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Get image to delete file
      const image = await VehicleImageService.getById(imageId, vehicleId, tenantId);
      if (image) {
        const filePath = path.join(getUploadsDir(), path.basename(image.url));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      await VehicleImageService.delete(imageId, vehicleId, tenantId);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  }

  static async reorderVehicleImages(req: AuthenticatedRequest, res: Response) {
    try {
      const { vehicleId } = req.params;
      const tenantId = req.auth?.tenantId;

      if (!tenantId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const { imageIds } = req.body;

      if (!Array.isArray(imageIds)) {
        return res.status(400).json({ message: 'imageIds must be an array' });
      }

      const images = await VehicleImageService.reorder(vehicleId, tenantId, imageIds);
      res.json(images);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  }

  /**
   * Create rentacar reservation (public endpoint)
   */
  static createReservation = asyncHandler(async (req: Request, res: Response) => {
    const { ReservationLogService } = await import('../../shared/services/reservation-log.service');
    const { ReservationLogStatus } = await import('../../shared/entities/reservation-log.entity');
    
    // Get IP address and user agent
    const ipAddress = req.ip || req.socket.remoteAddress || undefined;
    const userAgent = req.get('user-agent') || undefined;

    // Create log entry before attempting reservation creation
    let log;
    try {
      log = await ReservationLogService.create({
        tenantId: req.body.tenantId,
        requestData: req.body,
        ipAddress,
        userAgent,
      });
    } catch (logError) {
      console.error('Failed to create reservation log:', logError);
      // Continue even if log creation fails
    }

    try {
      const reservation = await RentacarReservationService.create(req.body);
      
      // Mark log as success if it was created
      if (log) {
        try {
          await ReservationLogService.markSuccess(log.id, req.body.tenantId, reservation.id);
        } catch (logError) {
          console.error('Failed to update reservation log:', logError);
        }
      }

      res.status(201).json({
        success: true,
        message: 'Reservation created successfully',
        data: reservation,
      });
    } catch (error) {
      // Mark log as failed if it was created
      if (log) {
        try {
          await ReservationLogService.markFailed(log.id, req.body.tenantId, (error as Error).message);
        } catch (logError) {
          console.error('Failed to update reservation log:', logError);
        }
      }

      res.status(400).json({
        success: false,
        message: (error as Error).message,
      });
    }
  });

  /**
   * Admin: Approve a pending reservation
   */
  static approveReservation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
    const reservation = await RentacarReservationService.approve(req.params.id, tenantId);
    res.json({ success: true, data: reservation });
  });

  /**
   * Admin: Reject a pending reservation
   */
  static rejectReservation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
    const { reason } = req.body;
    const reservation = await RentacarReservationService.reject(req.params.id, tenantId, reason);
    res.json({ success: true, data: reservation });
  });

  /**
   * Admin or customer: Cancel a reservation (24h rule for CONFIRMED)
   */
  static cancelReservation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
    const reservation = await RentacarReservationService.cancel(req.params.id, tenantId);
    res.json({ success: true, data: reservation });
  });

  /**
   * Get notifications: new reservations + upcoming departures
   */
  static getNotifications = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
    const data = await RentacarReservationService.getNotifications(tenantId);
    res.json({ success: true, data });
  });
}
