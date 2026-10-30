import { Repository, In } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { TransferRoute } from '../entities/transfer-route.entity';
import { TransferVehicle } from '../entities/transfer-vehicle.entity';
import { TransferPricing } from '../entities/transfer-pricing.entity';
import { TransferReservation, TransferReservationStatus } from '../entities/transfer-reservation.entity';
import { CustomerService } from '../../shared/services/customer.service';
import { Tenant, TenantCategory } from '../../tenants/entities/tenant.entity';
import { Currency } from '../../shared/entities/currency.entity';
import { TransferPricingService } from './transfer-pricing.service';

export type TransferSearchParams = {
  tenantId: string;
  languageId?: string;
  originType: 'airport' | 'hotel' | 'location';
  originId: string;
  destinationType: 'airport' | 'hotel' | 'location';
  destinationId: string;
  transferDate: string; // YYYY-MM-DD
  transferTime: string; // HH:mm
  passengerCount: number;
  isRoundTrip: boolean;
  currencyId?: string;
};

export type CreatePublicReservationInput = {
  tenantId: string;
  routeId: string;
  vehicleId: string;
  passengerName: string;
  passengerEmail: string;
  passengerPhone: string;
  passengerCount: number;
  luggageCount?: number;
  transferDate: string;
  transferTime: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  flightNumber?: string;
  flightArrivalTime?: string;
  flightDepartureTime?: string;
  isRoundTrip: boolean;
  extraServices?: Record<string, any>;
  notes?: string;
  customerNotes?: string;
};

export class TransferPublicService {
  private static routeRepo(): Repository<TransferRoute> {
    return AppDataSource.getRepository(TransferRoute);
  }

  private static vehicleRepo(): Repository<TransferVehicle> {
    return AppDataSource.getRepository(TransferVehicle);
  }

  private static pricingRepo(): Repository<TransferPricing> {
    return AppDataSource.getRepository(TransferPricing);
  }

  private static reservationRepo(): Repository<TransferReservation> {
    return AppDataSource.getRepository(TransferReservation);
  }

  /**
   * Search available transfers (routes and vehicles with pricing)
   */
  static async searchTransfers(params: TransferSearchParams) {
    const {
      tenantId,
      originType,
      originId,
      destinationType,
      destinationId,
      transferDate,
      transferTime,
      passengerCount,
      isRoundTrip,
      currencyId,
    } = params;

    // Validate tenant
    const tenantRepo = AppDataSource.getRepository(Tenant);
    const tenant = await tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant || tenant.category !== TenantCategory.TRANSFER) {
      throw new Error('Invalid tenant or tenant is not a transfer company');
    }

    // Check if it's night rate (22:00 - 06:00)
    const [hours] = transferTime.split(':').map(Number);
    const isNightRate = hours >= 22 || hours < 6;

    // Get target currency
    let targetCurrency: Currency | null = null;
    if (currencyId) {
      const currencyRepo = AppDataSource.getRepository(Currency);
      targetCurrency = await currencyRepo.findOne({ where: { id: currencyId } });
    }

    // Find matching routes based on origin and destination
    // For now, we'll get all active routes and filter manually
    // In a real implementation, you might want to use route points to match locations
    const routes = await this.routeRepo().find({
      where: {
        tenantId,
        isActive: true,
      },
      relations: ['points'],
      order: { sortOrder: 'ASC' },
    });

    // Get all vehicles for this tenant with images relation
    const vehicles = await this.vehicleRepo().find({
      where: {
        tenantId,
        isActive: true,
      },
      relations: ['images'],
      order: { sortOrder: 'ASC', passengerCapacity: 'ASC' },
    });

    // Filter vehicles by passenger capacity - ONLY return vehicles that can accommodate the requested passenger count
    const suitableVehicles = vehicles.filter(
      (v) => v.passengerCapacity >= passengerCount
    );

    // If no suitable vehicles found, return empty result
    if (suitableVehicles.length === 0) {
      return {
        transfers: [],
        searchParams: {
          originType,
          originId,
          destinationType,
          destinationId,
          transferDate,
          transferTime,
          passengerCount,
          isRoundTrip,
        },
        message: `No vehicles found that can accommodate ${passengerCount} passenger(s).`,
      };
    }

    // Get pricing for each route-vehicle combination (NEW SYSTEM)
    const results = [];

    for (const route of routes) {
      // Skip routes without distance
      if (!route.distance) continue;

      for (const vehicle of suitableVehicles) {
        try {
          // Calculate price using new system
          const priceBreakdown = await this.calculatePriceForVehicle({
            tenantId,
            vehicleId: vehicle.id,
            routeId: route.id,
            distanceKm: Number(route.distance),
            passengerCount,
            isRoundTrip,
            isNightRate,
          });

          if (priceBreakdown) {
            results.push({
              route: {
                id: route.id,
                name: route.name,
                type: route.type,
                distance: route.distance,
                averageDuration: route.averageDurationMinutes,
                points: route.points,
              },
              vehicle: {
                id: vehicle.id,
                name: vehicle.name,
                type: vehicle.type,
                capacity: vehicle.passengerCapacity,
                luggage: vehicle.luggageCapacity,
                images: vehicle.images
                  ?.sort((a, b) => {
                    // Sort: primary first, then by sortOrder
                    if (a.isPrimary) return -1;
                    if (b.isPrimary) return 1;
                    return a.sortOrder - b.sortOrder;
                  })
                  .map(img => ({
                    id: img.id,
                    url: img.imageUrl,
                    isPrimary: img.isPrimary,
                    sortOrder: img.sortOrder,
                  })) || [],
              },
              pricing: priceBreakdown,
            });
          }
        } catch (error) {
          // Skip this combination if pricing not found
          continue;
        }
      }
    }

    // Sort by price (cheapest first)
    results.sort((a, b) => a.pricing.totalPrice - b.pricing.totalPrice);

    // Group results by vehicle (to avoid duplicates if same vehicle appears in multiple routes)
    const vehicleMap = new Map<string, typeof results[0]>();
    for (const result of results) {
      const vehicleId = result.vehicle.id;
      if (!vehicleMap.has(vehicleId)) {
        vehicleMap.set(vehicleId, result);
      } else {
        // If same vehicle exists, keep the one with lower price
        const existing = vehicleMap.get(vehicleId)!;
        if (result.pricing.totalPrice < existing.pricing.totalPrice) {
          vehicleMap.set(vehicleId, result);
        }
      }
    }

    const uniqueResults = Array.from(vehicleMap.values());

    return {
      transfers: uniqueResults,
      searchParams: {
        originType,
        originId,
        destinationType,
        destinationId,
        transferDate,
        transferTime,
        passengerCount,
        isRoundTrip,
      },
      meta: {
        totalVehicles: suitableVehicles.length,
        totalResults: uniqueResults.length,
        filteredByPassengerCount: passengerCount,
      },
    };
  }

  /**
   * Get all available routes for a tenant
   */
  static async getAvailableRoutes(tenantId: string, languageId?: string) {
    const routes = await this.routeRepo().find({
      where: {
        tenantId,
        isActive: true,
      },
      relations: ['points'],
      order: { sortOrder: 'ASC', name: 'ASC' },
    });

    return routes.map((route) => ({
      id: route.id,
      name: route.name,
      type: route.type,
      distance: route.distance,
      averageDuration: route.averageDurationMinutes,
      description: route.description,
      points: route.points,
    }));
  }

  /**
   * Get pickup and dropoff locations separately for site display
   */
  static async getTransferLocations(tenantId: string) {
    const routes = await this.routeRepo().find({
      where: {
        tenantId,
        isActive: true,
      },
      relations: ['points'],
    });

    // Extract unique pickup and dropoff points
    const pickupLocationsMap = new Map();
    const dropoffLocationsMap = new Map();

    for (const route of routes) {
      for (const point of route.points) {
        if (!point.isActive) continue;

        const location = {
          id: point.id,
          name: point.name,
          type: point.type,
          address: point.address,
          latitude: point.latitude,
          longitude: point.longitude,
        };

        if (point.isPickup) {
          // Pickup location
          if (!pickupLocationsMap.has(point.id)) {
            pickupLocationsMap.set(point.id, location);
          }
        } else {
          // Dropoff location
          if (!dropoffLocationsMap.has(point.id)) {
            dropoffLocationsMap.set(point.id, location);
          }
        }
      }
    }

    return {
      pickupLocations: Array.from(pickupLocationsMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
      dropoffLocations: Array.from(dropoffLocationsMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    };
  }

  /**
   * Get available vehicles for a specific route
   */
  static async getAvailableVehicles(params: {
    tenantId: string;
    routeId: string;
    languageId?: string;
    passengerCount?: number;
  }) {
    const { tenantId, routeId, passengerCount } = params;

    // Get all pricings for this route with vehicle and images
    const pricings = await this.pricingRepo().find({
      where: {
        tenantId,
      },
      relations: ['vehicle', 'vehicle.images'],
    });

    // Extract unique vehicles and filter by capacity if specified
    const vehiclesMap = new Map();

    for (const pricing of pricings) {
      const vehicle = pricing.vehicle;
      
      // Filter by passenger capacity if specified
      if (passengerCount && vehicle.passengerCapacity < passengerCount) {
        continue;
      }

      if (!vehiclesMap.has(vehicle.id)) {
        vehiclesMap.set(vehicle.id, {
          id: vehicle.id,
          name: vehicle.name,
          type: vehicle.type,
          capacity: vehicle.passengerCapacity,
          luggage: vehicle.luggageCapacity,
          images: vehicle.images
            ?.sort((a, b) => {
              // Sort: primary first, then by sortOrder
              if (a.isPrimary) return -1;
              if (b.isPrimary) return 1;
              return a.sortOrder - b.sortOrder;
            })
            .map(img => ({
              id: img.id,
              url: img.imageUrl,
              isPrimary: img.isPrimary,
              sortOrder: img.sortOrder,
            })) || [],
          minPrice: pricing.baseKmPrice ? Number(pricing.baseKmPrice) : (pricing.basePrice ? Number(pricing.basePrice) : 0),
        });
      } else {
        // Update min price if this pricing is cheaper
        const existing = vehiclesMap.get(vehicle.id);
        const currentPrice = pricing.baseKmPrice ? Number(pricing.baseKmPrice) : (pricing.basePrice ? Number(pricing.basePrice) : 0);
        if (currentPrice > 0 && (existing.minPrice === 0 || currentPrice < existing.minPrice)) {
          existing.minPrice = currentPrice;
        }
      }
    }

    return Array.from(vehiclesMap.values()).sort((a, b) => a.minPrice - b.minPrice);
  }

  /**
   * Helper method to calculate price for a vehicle (used in search)
   */
  private static async calculatePriceForVehicle(params: {
    tenantId: string;
    vehicleId: string;
    routeId: string;
    distanceKm: number;
    passengerCount: number;
    isRoundTrip: boolean;
    isNightRate: boolean;
  }) {
    try {
      const priceBreakdown = await TransferPricingService.calculatePrice({
        tenantId: params.tenantId,
        vehicleId: params.vehicleId,
        distanceKm: params.distanceKm,
        passengerCount: params.passengerCount,
        extraServices: {},
      });
      return priceBreakdown;
    } catch (error) {
      return null;
    }
  }

  /**
   * Calculate price for specific transfer parameters (NEW SYSTEM)
   */
  static async calculatePrice(params: {
    tenantId: string;
    vehicleId: string;
    routeId?: string;
    transferDate: string;
    transferTime: string;
    passengerCount: number;
    distanceKm: number;
    isRoundTrip: boolean;
    extraServices?: Record<string, any>;
    currencyId?: string;
  }) {
    const { tenantId, vehicleId, routeId, transferTime, passengerCount, distanceKm, isRoundTrip, extraServices } = params;

    // Check if it's night rate
    const [hours] = transferTime.split(':').map(Number);
    const isNightRate = hours >= 22 || hours < 6;

    // Use TransferPricingService to calculate
    const priceBreakdown = await TransferPricingService.calculatePrice({
      tenantId,
      vehicleId,
      distanceKm,
      passengerCount,
 
      extraServices,
    });

    return priceBreakdown;
  }

  /**
   * Create a public transfer reservation (NEW SYSTEM)
   */
  static async createReservation(input: CreatePublicReservationInput) {
    // Get route to get distance
    const route = await this.routeRepo().findOne({ where: { id: input.routeId } });
    if (!route || !route.distance) {
      throw new Error('Route not found or distance not set');
    }

    // Calculate price
    const priceData = await this.calculatePrice({
      tenantId: input.tenantId,
      vehicleId: input.vehicleId,
      routeId: input.routeId,
      transferDate: input.transferDate,
      transferTime: input.transferTime,
      passengerCount: input.passengerCount,
      distanceKm: Number(route.distance),
      isRoundTrip: input.isRoundTrip,
      extraServices: input.extraServices,
    });

    // Generate reference
    const reference = await this.generateReference();

    // Create reservation
    const reservation = this.reservationRepo().create({
      tenantId: input.tenantId,
      reference,
      routeId: input.routeId,
      vehicleId: input.vehicleId,
      passengerName: input.passengerName,
      passengerEmail: input.passengerEmail,
      passengerPhone: input.passengerPhone,
      passengerCount: input.passengerCount,
      luggageCount: input.luggageCount || 0,
      transferDate: new Date(input.transferDate),
      transferTime: input.transferTime,
      pickupAddress: input.pickupAddress,
      dropoffAddress: input.dropoffAddress,
      flightNumber: input.flightNumber,
      flightArrivalTime: input.flightArrivalTime ? new Date(input.flightArrivalTime) : undefined,
      flightDepartureTime: input.flightDepartureTime ? new Date(input.flightDepartureTime) : undefined,
      basePrice: priceData.baseCalculation,
      extraServicePrice: priceData.extraServicePrice,
      totalPrice: priceData.totalPrice,
      currencyCode: priceData.currencyCode,
      extraServices: input.extraServices,
      notes: input.notes,
      customerNotes: input.customerNotes,
      status: TransferReservationStatus.PENDING,
      paymentStatus: 'pending',
    });

    const savedReservation = await this.reservationRepo().save(reservation);

    try {
      await CustomerService.ensureCustomerFromTransferBooking({
        tenantId: input.tenantId,
        email: input.passengerEmail,
        passengerName: input.passengerName,
        passengerPhone: input.passengerPhone,
      });
    } catch (err) {
      console.error('Transfer public createReservation: ensure customer failed:', err);
    }

    // Return reservation with relations
    return this.reservationRepo().findOne({
      where: { id: savedReservation.id },
      relations: ['vehicle', 'route', 'route.points'],
    });
  }

  /**
   * Get reservation by reference (public)
   */
  static async getReservationByReference(reference: string, tenantId: string) {
    return this.reservationRepo().findOne({
      where: { reference, tenantId },
      relations: ['vehicle', 'route', 'route.points', 'driver'],
    });
  }

  /**
   * Generate unique reservation reference
   */
  private static async generateReference(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.reservationRepo().count();
    const sequence = String(count + 1).padStart(5, '0');
    return `TRF-${year}-${sequence}`;
  }
}
