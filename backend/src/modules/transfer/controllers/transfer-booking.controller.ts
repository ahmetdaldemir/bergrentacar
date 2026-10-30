import { Request, Response } from 'express';
import { asyncHandler } from '../../../utils/errors';
import { GoogleMapsService } from '../../../services/google-maps.service';
import { TransferPricingService } from '../services/transfer-pricing.service';
import { TenantSettingsService } from '../../shared/services/tenant-settings.service';
import { TenantFeaturesService } from '../../shared/services/tenant-features.service';
import { AppDataSource } from '../../../config/data-source';
import { TransferReservation, TransferReservationStatus } from '../entities/transfer-reservation.entity';
import { TransferVehicle, TransferVehicleType } from '../entities/transfer-vehicle.entity';

/**
 * Transfer Booking Controller
 * 
 * Complete booking flow with Google Maps integration:
 * 1. Search vehicles with price calculation
 * 2. Create reservation with all details
 */

export type TransferBookingSearchInput = {
  tenantId: string;
  pickupPlaceId: string;
  dropoffPlaceId: string;
  transferDate: string;
  transferTime: string;
  passengerCount: number;
  isRoundTrip: boolean;
  /** Panel: VIP hattı (vip+premium+luxury) veya Shuttle */
  productLine?: 'vip' | 'shuttle';
};

export type TransferBookingCreateInput = {
  tenantId: string;
  vehicleId: string;

  // Pickup location (from Google Maps)
  pickupPlaceName: string;
  pickupAddress: string;
  pickupLat: string;
  pickupLng: string;

  // Dropoff location (from Google Maps)
  dropoffPlaceName: string;
  dropoffAddress: string;
  dropoffLat: string;
  dropoffLng: string;

  // Transfer details
  transferDate: string;
  transferTime: string;
  passengerCount: number;
  luggageCount?: number;
  isRoundTrip: boolean;

  // Customer details
  passengerName: string;
  passengerEmail: string;
  passengerPhone: string;

  // Optional details
  flightNumber?: string;
  flightArrivalTime?: string;
  flightDepartureTime?: string;
  customerNotes?: string;
  extraServices?: Record<string, any>;

  // Payment
  paymentMethod?: string;
  paymentType?: string;

  // Pricing (from frontend: gidiş + dönüş toplamı)
  totalPrice: number;
  currencyCode?: string;

  // ── Dönüş bacak (isRoundTrip === true iken zorunlu) ─────────────────────
  returnVehicleId?: string;
  returnTransferDate?: string;
  returnTransferTime?: string;
  returnPickupPlaceName?: string;
  returnPickupAddress?: string;
  returnPickupLat?: string;
  returnPickupLng?: string;
  returnDropoffPlaceName?: string;
  returnDropoffAddress?: string;
  returnDropoffLat?: string;
  returnDropoffLng?: string;
  returnPrice?: number;
};

export class TransferBookingController {
  /**
   * Search available vehicles with pricing
   * POST /api/transfer/booking/search
   * 
   * Flow:
   * 1. Calculate distance using Google Maps
   * 2. Get available vehicles
   * 3. Calculate price for each vehicle based on distance and passenger count
   * 4. Return sorted by price
   */
  static searchVehicles = asyncHandler(async (req: Request, res: Response) => {
    const {
      tenantId,
      pickupPlaceId,
      dropoffPlaceId,
      transferDate,
      transferTime,
      passengerCount,
      isRoundTrip,
      productLine,
    }: TransferBookingSearchInput = req.body;

    // Validate required fields
    if (!tenantId || !pickupPlaceId || !dropoffPlaceId || !transferDate || !transferTime || !passengerCount) {
      return res.status(400).json({
        message: 'Missing required fields: tenantId, pickupPlaceId, dropoffPlaceId, transferDate, transferTime, passengerCount',
      });
    }

    if (productLine === 'shuttle') {
      const shuttleOk = await TenantFeaturesService.hasFeature(tenantId, 'transferShuttle');
      if (!shuttleOk) {
        return res.status(403).json({
          success: false,
          message: 'Shuttle transfer is disabled for this tenant',
        });
      }
    }

    const mapsKey = await TenantSettingsService.requireGoogleMapsApiKey(tenantId);

    const [pickupDetails, dropoffDetails] = await Promise.all([
      GoogleMapsService.getPlaceDetails(pickupPlaceId, { language: 'tr', apiKey: mapsKey }),
      GoogleMapsService.getPlaceDetails(dropoffPlaceId, { language: 'tr', apiKey: mapsKey }),
    ]);

    const distanceResult = await GoogleMapsService.calculateDistance(
      { lat: pickupDetails.latitude, lng: pickupDetails.longitude },
      { lat: dropoffDetails.latitude, lng: dropoffDetails.longitude },
      { apiKey: mapsKey },
    );

    const distanceKm = Math.round(distanceResult.distanceMeters / 1000);

    // Check if night rate
    const [hours] = transferTime.split(':').map(Number);
    const isNightRate = hours >= 22 || hours < 6;

    // Get available vehicles
    const vehicleRepo = AppDataSource.getRepository(TransferVehicle);
    const vehicles = await vehicleRepo.find({
      where: {
        tenantId,
        isActive: true,
      },
      relations: ['images', 'brand', 'model'],
    });

    // Filter by passenger capacity + ürün hattı (VIP / Shuttle)
    const vipLine = new Set([
      TransferVehicleType.VIP,
      TransferVehicleType.PREMIUM,
      TransferVehicleType.LUXURY,
    ]);
    let suitableVehicles = vehicles.filter((v) => v.passengerCapacity >= passengerCount);
    if (productLine === 'vip') {
      suitableVehicles = suitableVehicles.filter((v) => vipLine.has(v.type));
    } else if (productLine === 'shuttle') {
      suitableVehicles = suitableVehicles.filter((v) => v.type === TransferVehicleType.SHUTTLE);
    }

    // Calculate price for each vehicle
    const vehiclesWithPricing = [];

    for (const vehicle of suitableVehicles) {
      try {
        const priceBreakdown = await TransferPricingService.calculatePrice({
          tenantId,
          vehicleId: vehicle.id,
          distanceKm,
          passengerCount,
          extraServices: {},
        });

        vehiclesWithPricing.push({
          vehicle: {
            id: vehicle.id,
            name: vehicle.name,
            type: vehicle.type,
            brand: vehicle.brand?.name,
            model: vehicle.model?.name,
            year: vehicle.year,
            capacity: vehicle.passengerCapacity,
            luggage: vehicle.luggageCapacity,
            features: vehicle.features,
            images: vehicle.images?.sort((a, b) => a.sortOrder - b.sortOrder).map(img => ({
              id: img.id,
              url: img.imageUrl,
              isPrimary: img.isPrimary,
            })),
            primaryImage: vehicle.images?.find(img => img.isPrimary)?.imageUrl ||
              vehicle.images?.[0]?.imageUrl,
          },
          pricing: priceBreakdown,
        });
      } catch (error) {
        // Skip vehicle if pricing not available
        continue;
      }
    }

    // Sort by price
    vehiclesWithPricing.sort((a, b) => a.pricing.totalPrice - b.pricing.totalPrice);

    res.json({
      success: true,
      search: {
        pickup: {
          placeId: pickupPlaceId,
          name: pickupDetails.name,
          address: pickupDetails.formattedAddress,
          lat: pickupDetails.latitude,
          lng: pickupDetails.longitude,
        },
        dropoff: {
          placeId: dropoffPlaceId,
          name: dropoffDetails.name,
          address: dropoffDetails.formattedAddress,
          lat: dropoffDetails.latitude,
          lng: dropoffDetails.longitude,
        },
        distance: {
          km: distanceKm,
          text: distanceResult.distanceText,
          duration: distanceResult.durationText,
        },
        transferDate,
        transferTime,
        passengerCount,
        isRoundTrip: isRoundTrip || false,
        isNightRate,
      },
      vehicles: vehiclesWithPricing,
      count: vehiclesWithPricing.length,
    });
  });

  /**
   * Create transfer reservation (tek bacak veya gidiş-dönüş).
   * POST /api/transfer/booking/create
   *
   * Gidiş-dönüş (isRoundTrip: true): body'de returnVehicleId, returnTransferDate, returnTransferTime,
   * returnPickup*, returnDropoff*, returnPrice zorunludur. Dönüş tarihi gidiş tarihinden önce olamaz.
   * Toplam fiyat = gidiş + dönüş (totalPrice frontend'den gelir).
   */
  static createReservation = asyncHandler(async (req: Request, res: Response) => {
    const input: TransferBookingCreateInput = req.body;

    // Validate required fields (outbound leg)
    if (!input.tenantId || !input.vehicleId || !input.pickupPlaceName || !input.pickupAddress ||
        !input.pickupLat || !input.pickupLng || !input.dropoffPlaceName || !input.dropoffAddress ||
        !input.dropoffLat || !input.dropoffLng || !input.transferDate || !input.transferTime ||
        !input.passengerCount || !input.passengerName || !input.passengerEmail || !input.passengerPhone ||
        input.totalPrice === undefined || input.totalPrice === null) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const vehicleRepoForShuttle = AppDataSource.getRepository(TransferVehicle);
    const outboundV = await vehicleRepoForShuttle.findOne({
      where: { id: input.vehicleId, tenantId: input.tenantId },
    });
    if (!outboundV) {
      return res.status(400).json({ success: false, message: 'Invalid vehicle' });
    }
    if (outboundV.type === TransferVehicleType.SHUTTLE) {
      const shuttleOk = await TenantFeaturesService.hasFeature(input.tenantId, 'transferShuttle');
      if (!shuttleOk) {
        return res.status(403).json({
          success: false,
          message: 'Shuttle transfer is disabled for this tenant',
        });
      }
    }
    if (input.isRoundTrip && input.returnVehicleId) {
      const returnV = await vehicleRepoForShuttle.findOne({
        where: { id: input.returnVehicleId, tenantId: input.tenantId },
      });
      if (returnV?.type === TransferVehicleType.SHUTTLE) {
        const shuttleOk = await TenantFeaturesService.hasFeature(input.tenantId, 'transferShuttle');
        if (!shuttleOk) {
          return res.status(403).json({
            success: false,
            message: 'Shuttle transfer is disabled for this tenant',
          });
        }
      }
    }

    // When round-trip: require return leg fields
    if (input.isRoundTrip) {
      if (!input.returnVehicleId || !input.returnTransferDate || !input.returnTransferTime ||
          !input.returnPickupPlaceName || !input.returnPickupAddress || !input.returnPickupLat || !input.returnPickupLng ||
          !input.returnDropoffPlaceName || !input.returnDropoffAddress || !input.returnDropoffLat || !input.returnDropoffLng ||
          input.returnPrice === undefined || input.returnPrice === null) {
        return res.status(400).json({
          success: false,
          message: 'Gidiş-dönüş rezervasyonunda dönüş bacak bilgileri zorunludur (returnVehicleId, returnTransferDate, returnTransferTime, return pickup/dropoff, returnPrice)',
        });
      }
      const outboundDate = new Date(input.transferDate);
      const returnDate = new Date(input.returnTransferDate);
      if (isNaN(outboundDate.getTime()) || isNaN(returnDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Geçersiz tarih formatı',
        });
      }
      if (returnDate < outboundDate) {
        return res.status(400).json({
          success: false,
          message: 'Dönüş tarihi gidiş tarihinden önce olamaz',
        });
      }
      if (returnDate.getTime() === outboundDate.getTime()) {
        const [outH, outM] = input.transferTime.split(':').map(Number);
        const [retH, retM] = input.returnTransferTime.split(':').map(Number);
        const outMin = outH * 60 + outM;
        const retMin = retH * 60 + retM;
        if (retMin <= outMin) {
          return res.status(400).json({
            success: false,
            message: 'Dönüş saati gidiş saatinden sonra olmalıdır',
          });
        }
      }
    }

    const mapsKey = await TenantSettingsService.requireGoogleMapsApiKey(input.tenantId);
    const distanceResult = await GoogleMapsService.calculateDistanceCoordsWithFallback(
      { lat: parseFloat(input.pickupLat), lng: parseFloat(input.pickupLng) },
      { lat: parseFloat(input.dropoffLat), lng: parseFloat(input.dropoffLng) },
      { apiKey: mapsKey },
    );

    const distanceKm = Math.round(distanceResult.distanceMeters / 1000);

    // Check if night rate
    const [hours] = input.transferTime.split(':').map(Number);
    const isNightRate = hours >= 22 || hours < 6;

    // Price is sent from frontend, use it directly
    // Optional: Calculate price for validation/logging purposes
    let calculatedPrice = null;
    try {
      const priceBreakdown = await TransferPricingService.calculatePrice({
        tenantId: input.tenantId,
        vehicleId: input.vehicleId,
        distanceKm,
        passengerCount: input.passengerCount,
        extraServices: input.extraServices,
      });
      calculatedPrice = priceBreakdown;
    } catch (error) {
      // Price calculation failed, but we'll use the price from frontend
      console.warn('Price calculation failed, using frontend price:', error);
    }

    // Generate reference
    const year = new Date().getFullYear();
    const reservationRepo = AppDataSource.getRepository(TransferReservation);
    const count = await reservationRepo.count();
    const sequence = String(count + 1).padStart(5, '0');
    const reference = `TRF-${year}-${sequence}`;

    // Create reservation
    const reservation = reservationRepo.create({
      tenantId: input.tenantId,
      vehicleId: input.vehicleId,
      routeId: undefined, // Booking doesn't use routeId
      reference,
      
      // Pickup & Dropoff (Google Maps)
      pickupPlaceName: input.pickupPlaceName,
      pickupAddress: input.pickupAddress,
      pickupLat: input.pickupLat,
      pickupLng: input.pickupLng,
      
      dropoffPlaceName: input.dropoffPlaceName,
      dropoffAddress: input.dropoffAddress,
      dropoffLat: input.dropoffLat,
      dropoffLng: input.dropoffLng,
      
      distanceKm,
      
      // Transfer details
      transferDate: (() => {
        const date = new Date(input.transferDate);
        if (isNaN(date.getTime())) {
          throw new Error('Invalid transferDate format');
        }
        return date;
      })(),
      transferTime: input.transferTime,
      passengerCount: input.passengerCount,
      luggageCount: input.luggageCount || 0,
      isRoundTrip: input.isRoundTrip,
      isNightRate,
      
      // Customer details
      passengerName: input.passengerName,
      passengerEmail: input.passengerEmail,
      passengerPhone: input.passengerPhone,
      
      // Optional details
      flightNumber: input.flightNumber,
      flightArrivalTime: input.flightArrivalTime && input.flightArrivalTime.trim() 
        ? (() => {
            const date = new Date(input.flightArrivalTime);
            return isNaN(date.getTime()) ? undefined : date;
          })()
        : undefined,
      flightDepartureTime: input.flightDepartureTime && input.flightDepartureTime.trim()
        ? (() => {
            const date = new Date(input.flightDepartureTime);
            return isNaN(date.getTime()) ? undefined : date;
          })()
        : undefined,
      customerNotes: input.customerNotes,
      extraServices: input.extraServices,
      
      // Pricing (from frontend: gidiş + gidiş ekstraları; gidiş-dönüşte totalPrice = gidiş + returnPrice + ekstralar)
      basePrice: calculatedPrice?.baseCalculation ?? input.totalPrice - (input.isRoundTrip ? (input.returnPrice ?? 0) : 0),
      extraServicePrice: calculatedPrice?.extraServicePrice || 0,
      totalPrice: input.totalPrice,
      currencyCode: input.currencyCode || calculatedPrice?.currencyCode || 'EUR',

      // Payment
      paymentMethod: input.paymentMethod || 'cash',
      paymentType: input.paymentType || 'pay_at_pickup',
      paymentStatus: 'pending',

      // Status
      status: TransferReservationStatus.PENDING,

      // Dönüş bacak (gidiş-dönüş)
      ...(input.isRoundTrip && input.returnVehicleId && input.returnTransferDate && input.returnTransferTime
        ? {
            returnVehicleId: input.returnVehicleId,
            returnTransferDate: (() => {
              const d = new Date(input.returnTransferDate!);
              if (isNaN(d.getTime())) throw new Error('Invalid returnTransferDate');
              return d;
            })(),
            returnTransferTime: input.returnTransferTime,
            returnPickupPlaceName: input.returnPickupPlaceName,
            returnPickupAddress: input.returnPickupAddress,
            returnPickupLat: input.returnPickupLat,
            returnPickupLng: input.returnPickupLng,
            returnDropoffPlaceName: input.returnDropoffPlaceName,
            returnDropoffAddress: input.returnDropoffAddress,
            returnDropoffLat: input.returnDropoffLat,
            returnDropoffLng: input.returnDropoffLng,
            returnPrice: input.returnPrice ?? 0,
            returnIsNightRate: (() => {
              const [h] = input.returnTransferTime!.split(':').map(Number);
              return h >= 22 || h < 6;
            })(),
          }
        : {}),
    });

    const savedReservation = await reservationRepo.save(reservation);

    try {
      const { CustomerService } = await import('../../shared/services/customer.service');
      await CustomerService.ensureCustomerFromTransferBooking({
        tenantId: input.tenantId,
        email: input.passengerEmail,
        passengerName: input.passengerName,
        passengerPhone: input.passengerPhone,
      });
    } catch (err) {
      console.error('Transfer booking: ensure customer failed:', err);
    }

    // Reload with relations (include returnVehicle for round-trip)
    const fullReservation = await reservationRepo.findOne({
      where: { id: savedReservation.id },
      relations: [
        'vehicle',
        'vehicle.images',
        'vehicle.brand',
        'vehicle.model',
        ...(savedReservation.returnVehicleId ? ['returnVehicle', 'returnVehicle.images', 'returnVehicle.brand', 'returnVehicle.model'] : []),
      ],
    });

    // Send confirmation email (ilk rezervasyonda)
    if (fullReservation && fullReservation.passengerEmail) {
      try {
        const { sendTransferReservationEmail } = await import('../../../services/transfer-email.service');
        const { EmailTemplateType } = await import('../../shared/entities/email-template.entity');
        await sendTransferReservationEmail(fullReservation, EmailTemplateType.RESERVATION_CONFIRMATION);
      } catch (error) {
        console.error('Failed to send transfer reservation confirmation email:', error);
        // Email hatası rezervasyon oluşturmayı engellemez
      }
    }

    res.status(201).json({
      success: true,
      reservation: fullReservation,
      message: 'Reservation created successfully. Confirmation email will be sent shortly.',
    });
  });
}
