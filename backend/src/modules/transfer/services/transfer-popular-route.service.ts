import { Repository, IsNull } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { TransferPopularRoute } from '../entities/transfer-popular-route.entity';
import { Currency } from '../../shared/entities/currency.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { GoogleMapsService } from '../../../services/google-maps.service';
import { TransferPricingService } from './transfer-pricing.service';
import { TenantSettingsService } from '../../shared/services/tenant-settings.service';

export type CreateTransferPopularRouteInput = {
  tenantId: string;
  // Google Maps locations
  pickupPlaceId: string;
  pickupAddress: string;
  pickupLat: string;
  pickupLng: string;
  dropoffPlaceId: string;
  dropoffAddress: string;
  dropoffLat: string;
  dropoffLng: string;
  // Vehicle
  vehicleId: string;
  // Optional
  name?: string; // Auto-generated if not provided
  routeId?: string; // Legacy support
  fixedPrice?: number; // Legacy support - if not provided, will be calculated
  currencyId?: string;
  isActive?: boolean;
  sortOrder?: number;
  description?: string;
  // For price calculation
  passengerCount?: number; // Default: 1
};

export type UpdateTransferPopularRouteInput = Partial<Omit<CreateTransferPopularRouteInput, 'tenantId'>>;

export class TransferPopularRouteService {
  private static repository(): Repository<TransferPopularRoute> {
    return AppDataSource.getRepository(TransferPopularRoute);
  }

  private static currencyRepo(): Repository<Currency> {
    return AppDataSource.getRepository(Currency);
  }

  private static tenantRepo(): Repository<Tenant> {
    return AppDataSource.getRepository(Tenant);
  }

  static async list(tenantId: string, isActive?: boolean): Promise<TransferPopularRoute[]> {
    const where: any = { tenantId };
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    return this.repository().find({
      where,
      relations: ['route', 'vehicle', 'currency'],
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  static async getById(id: string, tenantId: string): Promise<TransferPopularRoute | null> {
    return this.repository().findOne({
      where: { id, tenantId },
      relations: ['route', 'vehicle', 'currency'],
    });
  }

  static async getByPickupDropoffAndVehicle(
    pickupPlaceId: string,
    dropoffPlaceId: string,
    vehicleId: string,
    tenantId: string
  ): Promise<TransferPopularRoute | null> {
    return this.repository().findOne({
      where: {
        tenantId,
        pickupPlaceId,
        dropoffPlaceId,
        vehicleId,
      },
      relations: ['vehicle', 'currency', 'route'],
    });
  }

  static async create(input: CreateTransferPopularRouteInput): Promise<TransferPopularRoute> {
    const repo = this.repository();

    // Check if already exists
    const existing = await repo.findOne({
      where: {
        tenantId: input.tenantId,
        pickupPlaceId: input.pickupPlaceId,
        dropoffPlaceId: input.dropoffPlaceId,
        vehicleId: input.vehicleId,
      },
    });

    if (existing) {
      throw new Error('Bu rota ve araç kombinasyonu için zaten popüler rota tanımı mevcut');
    }

    const mapsKey = await TenantSettingsService.requireGoogleMapsApiKey(input.tenantId);
    const distanceResult = await GoogleMapsService.calculateDistance(
      { lat: parseFloat(input.pickupLat), lng: parseFloat(input.pickupLng) },
      { lat: parseFloat(input.dropoffLat), lng: parseFloat(input.dropoffLng) },
      { apiKey: mapsKey },
    );

    const distanceKm = Math.round((distanceResult.distanceMeters / 1000) * 100) / 100; // Round to 2 decimals
    const durationMinutes = Math.round(distanceResult.durationSeconds / 60);

    // Generate route name if not provided
    const routeName = input.name || `${input.pickupAddress} → ${input.dropoffAddress}`;

    // Calculate price if fixedPrice is not provided
    let fixedPrice: number | null = input.fixedPrice ?? null;
    let currencyId = input.currencyId;

    if (!fixedPrice) {
      // Calculate price using TransferPricing
      const passengerCount = input.passengerCount || 1;
      try {
        const priceBreakdown = await TransferPricingService.calculatePrice({
          tenantId: input.tenantId,
          vehicleId: input.vehicleId,
          distanceKm,
          passengerCount,
        });

        // Use calculated price as fixed price
        fixedPrice = priceBreakdown.totalPrice;
        if (!currencyId && priceBreakdown.currencyId) {
          currencyId = priceBreakdown.currencyId;
        }
      } catch (error: any) {
        // If pricing not found, fixedPrice will remain null
        console.warn('Could not calculate price for popular route:', error.message);
      }
    }

    // Get currency (use tenant's default if not provided)
    if (!currencyId) {
      const tenant = await this.tenantRepo().findOne({
        where: { id: input.tenantId },
        relations: ['defaultCurrency'],
      });
      if (tenant?.defaultCurrencyId) {
        currencyId = tenant.defaultCurrencyId;
      }
    }

    const popularRoute = repo.create({
      tenantId: input.tenantId,
      pickupPlaceId: input.pickupPlaceId,
      pickupAddress: input.pickupAddress,
      pickupLat: input.pickupLat,
      pickupLng: input.pickupLng,
      dropoffPlaceId: input.dropoffPlaceId,
      dropoffAddress: input.dropoffAddress,
      dropoffLat: input.dropoffLat,
      dropoffLng: input.dropoffLng,
      name: routeName,
      distanceKm,
      averageDurationMinutes: durationMinutes,
      vehicleId: input.vehicleId,
      routeId: input.routeId || null,
      fixedPrice,
      currencyId,
      isActive: input.isActive !== undefined ? input.isActive : true,
      sortOrder: input.sortOrder ?? 0,
      description: input.description,
    });

    return repo.save(popularRoute);
  }

  static async update(
    id: string,
    tenantId: string,
    input: UpdateTransferPopularRouteInput
  ): Promise<TransferPopularRoute> {
    const repo = this.repository();
    const popularRoute = await repo.findOne({ where: { id, tenantId } });

    if (!popularRoute) {
      throw new Error('Popüler rota bulunamadı');
    }

    // If routeId or vehicleId is being changed, check for duplicates
    if (input.routeId || input.vehicleId) {
      const newRouteId = input.routeId || popularRoute.routeId;
      const newVehicleId = input.vehicleId || popularRoute.vehicleId;

      if (newRouteId !== popularRoute.routeId || newVehicleId !== popularRoute.vehicleId) {
        const whereCondition: any = {
          tenantId,
          vehicleId: newVehicleId,
        };
        
        // Handle null routeId
        if (newRouteId === null || newRouteId === undefined) {
          whereCondition.routeId = IsNull();
        } else {
          whereCondition.routeId = newRouteId;
        }

        const existing = await repo.findOne({
          where: whereCondition,
        });

        if (existing && existing.id !== id) {
          throw new Error('Bu rota ve araç kombinasyonu için zaten popüler rota tanımı mevcut');
        }
      }
    }

    Object.assign(popularRoute, input);
    return repo.save(popularRoute);
  }

  static async delete(id: string, tenantId: string): Promise<void> {
    const repo = this.repository();
    const popularRoute = await repo.findOne({ where: { id, tenantId } });

    if (!popularRoute) {
      throw new Error('Popüler rota bulunamadı');
    }

    await repo.remove(popularRoute);
  }

  /**
   * Get price for a popular route-vehicle combination
   * If fixedPrice exists, returns it. Otherwise calculates from TransferPricing
   */
  static async getPrice(
    pickupPlaceId: string,
    dropoffPlaceId: string,
    vehicleId: string,
    tenantId: string,
    passengerCount: number = 1
  ): Promise<{ price: number; currencyCode: string; isFixed: boolean } | null> {
    const popularRoute = await this.getByPickupDropoffAndVehicle(
      pickupPlaceId,
      dropoffPlaceId,
      vehicleId,
      tenantId
    );

    if (!popularRoute || !popularRoute.isActive) {
      return null;
    }

    const currencyCode = popularRoute.currency?.code || 'EUR';

    // If fixed price exists, use it
    if (popularRoute.fixedPrice !== null && popularRoute.fixedPrice !== undefined) {
      return {
        price: Number(popularRoute.fixedPrice),
        currencyCode,
        isFixed: true,
      };
    }

    // Otherwise, calculate from TransferPricing
    try {
      const priceBreakdown = await TransferPricingService.calculatePrice({
        tenantId,
        vehicleId,
        distanceKm: Number(popularRoute.distanceKm),
        passengerCount,
      });

      return {
        price: priceBreakdown.totalPrice,
        currencyCode: priceBreakdown.currencyCode,
        isFixed: false,
      };
    } catch (error: any) {
      throw new Error(`Fiyat hesaplanamadı: ${error.message}`);
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  static async getFixedPrice(
    routeId: string,
    vehicleId: string,
    tenantId: string
  ): Promise<{ fixedPrice: number; currencyCode: string } | null> {
    // Try to find by routeId (legacy)
    const popularRoute = await this.repository().findOne({
      where: { routeId, vehicleId, tenantId },
      relations: ['currency'],
    });

    if (!popularRoute || !popularRoute.isActive) {
      return null;
    }

    const currencyCode = popularRoute.currency?.code || 'EUR';

    if (popularRoute.fixedPrice !== null && popularRoute.fixedPrice !== undefined) {
      return {
        fixedPrice: Number(popularRoute.fixedPrice),
        currencyCode,
      };
    }

    // If no fixed price, calculate it
    try {
      const priceBreakdown = await TransferPricingService.calculatePrice({
        tenantId,
        vehicleId,
        distanceKm: Number(popularRoute.distanceKm),
        passengerCount: 1,
      });

      return {
        fixedPrice: priceBreakdown.totalPrice,
        currencyCode: priceBreakdown.currencyCode,
      };
    } catch (error: any) {
      return null;
    }
  }
}
