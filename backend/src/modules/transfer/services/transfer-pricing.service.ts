import { Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { TransferPricing } from '../entities/transfer-pricing.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { TransferRoute } from '../entities/transfer-route.entity';

/** Mesafe aralığı anahtarları: 0-50, 50-100, 100-200, 200+ km */
export const DISTANCE_TIER_KEYS = ['0_50', '50_100', '100_200', '200_plus'] as const;
export type DistanceTierKey = (typeof DISTANCE_TIER_KEYS)[number];

export function getDistanceTierKey(distanceKm: number): DistanceTierKey {
  if (distanceKm <= 50) return '0_50';
  if (distanceKm <= 100) return '50_100';
  if (distanceKm <= 200) return '100_200';
  return '200_plus';
}

export type CreateTransferPricingInput = {
  tenantId: string;
  vehicleId: string;
  distanceTierPrices?: Record<string, number>; // { "0_50": 2.5, "50_100": 2.0, "100_200": 1.8, "200_plus": 1.5 }
  baseKmPrice?: number; // Legacy fallback - distanceTierPrices yoksa kullanılır
  passengerMultipliers: Record<string, number>; // { "1": 0.8, "2": 1, "3": 1.5, "4": 2 }
  currencyId?: string; // Use tenant's default if not provided
  extraServicePrices?: Record<string, number>;
  notes?: string;
};

export type UpdateTransferPricingInput = Partial<Omit<CreateTransferPricingInput, 'tenantId'>>;

export type CalculatePriceParams = {
  tenantId: string;
  vehicleId: string;
  distanceKm: number; // Distance in kilometers
  passengerCount: number; // Number of passengers
  extraServices?: Record<string, any>;
};

export type PriceBreakdown = {
  baseKmPrice: number; // Kullanılan km fiyatı (tier veya legacy)
  distanceKm: number;
  distanceTier?: string; // Kullanılan aralık: "0-50", "50-100", "100-200", "200+"
  passengerCount: number;
  passengerMultiplier: number;
  baseCalculation: number; // distance × baseKmPrice × multiplier
  extraServicePrice: number;
  subtotal: number;
  totalPrice: number;
  currencyCode: string;
  currencyId: string;
};

export class TransferPricingService {
  private static pricingRepo(): Repository<TransferPricing> {
    return AppDataSource.getRepository(TransferPricing);
  }

  private static tenantRepo(): Repository<Tenant> {
    return AppDataSource.getRepository(Tenant);
  }

  private static routeRepo(): Repository<TransferRoute> {
    return AppDataSource.getRepository(TransferRoute);
  }

  static async list(tenantId: string, filters?: { vehicleId?: string }): Promise<TransferPricing[]> {
    const where: any = { tenantId };
    if (filters?.vehicleId) {
      where.vehicleId = filters.vehicleId;
    }

    return this.pricingRepo().find({
      where,
      relations: ['vehicle', 'vehicle.images', 'currency'],
      order: { createdAt: 'DESC' },
    });
  }

  static async getById(id: string, tenantId: string): Promise<TransferPricing | null> {
    return this.pricingRepo().findOne({
      where: { id, tenantId },
      relations: ['vehicle', 'vehicle.images', 'currency'],
    });
  }

  static async create(input: CreateTransferPricingInput): Promise<TransferPricing> {
    // En az bir mesafe aralığı fiyatı veya baseKmPrice gerekli
    const hasTierPrices = input.distanceTierPrices && Object.keys(input.distanceTierPrices).length > 0;
    const hasBasePrice = input.baseKmPrice != null && Number(input.baseKmPrice) > 0;
    if (!hasTierPrices && !hasBasePrice) {
      throw new Error('Mesafe aralığı fiyatları (0-50, 50-100, 100-200, 200+ km) veya taban KM fiyatı gereklidir');
    }

    // Check if pricing already exists for this tenant and vehicle
    const existing = await this.pricingRepo().findOne({
      where: {
        tenantId: input.tenantId,
        vehicleId: input.vehicleId,
      },
    });

    if (existing) {
      throw new Error('Bu araç için zaten bir fiyatlandırma tanımı mevcut. Lütfen mevcut fiyatlandırmayı güncelleyin.');
    }

    // Get tenant's default currency if not provided
    let currencyId = input.currencyId;
    if (!currencyId) {
      const tenant = await this.tenantRepo().findOne({
        where: { id: input.tenantId },
        relations: ['defaultCurrency'],
      });
      if (tenant?.defaultCurrencyId) {
        currencyId = tenant.defaultCurrencyId;
      }
    }

    const pricing = this.pricingRepo().create({
      tenantId: input.tenantId,
      vehicleId: input.vehicleId,
      distanceTierPrices: input.distanceTierPrices,
      baseKmPrice: input.baseKmPrice,
      passengerMultipliers: input.passengerMultipliers,
      extraServicePrices: input.extraServicePrices,
      notes: input.notes,
      currencyId,
    });
    return this.pricingRepo().save(pricing);
  }

  static async update(id: string, tenantId: string, input: UpdateTransferPricingInput): Promise<TransferPricing> {
    const pricing = await this.getById(id, tenantId);
    if (!pricing) {
      throw new Error('Transfer pricing not found');
    }

    Object.assign(pricing, input);
    return this.pricingRepo().save(pricing);
  }

  static async delete(id: string, tenantId: string): Promise<void> {
    const pricing = await this.pricingRepo().findOne({ where: { id, tenantId } });
    if (!pricing) {
      throw new Error('Transfer pricing not found');
    }
    await this.pricingRepo().remove(pricing);
  }

  /**
   * Calculate price for a transfer reservation (NEW SYSTEM)
   * 
   * Formula: (Distance × Base KM Price × Passenger Multiplier × Round Trip Multiplier) + Night Surcharge + Extra Services
   * 
   * Example:
   * - Distance: 50 km
   * - Base KM Price: 2 EUR
   * - Passengers: 3, Multiplier: 1.5
   * - Round Trip: Yes (×2)
   * - Night Rate: 10 EUR
   * - Result: (50 × 2 × 1.5 × 2) + 10 = 310 EUR
   */
  static async calculatePrice(params: CalculatePriceParams): Promise<PriceBreakdown> {
    // Find pricing for vehicle
    const pricing = await this.pricingRepo().findOne({
      where: {
        tenantId: params.tenantId,
        vehicleId: params.vehicleId,
      },
      relations: ['vehicle', 'vehicle.images', 'currency'],
    });

    if (!pricing) {
      throw new Error('Pricing not found for the given vehicle');
    }

    if (!pricing.passengerMultipliers) {
      throw new Error('Passenger multipliers are not set for this pricing');
    }

    // Mesafe aralığına göre km fiyatı seç (distanceTierPrices > baseKmPrice)
    const tierKey = getDistanceTierKey(params.distanceKm);
    let baseKmPrice: number;

    if (pricing.distanceTierPrices && pricing.distanceTierPrices[tierKey] != null) {
      baseKmPrice = Number(pricing.distanceTierPrices[tierKey]);
    } else if (pricing.baseKmPrice != null) {
      baseKmPrice = Number(pricing.baseKmPrice);
    } else {
      throw new Error('Pricing not configured: distance tier prices or base KM price is required');
    }

    const tierLabels: Record<DistanceTierKey, string> = {
      '0_50': '0-50',
      '50_100': '50-100',
      '100_200': '100-200',
      '200_plus': '200+',
    };

    // Get passenger multiplier
    const passengerMultiplier = pricing.passengerMultipliers[params.passengerCount.toString()] || 1;

    // Base calculation: distance × base_km_price × passenger_multiplier
    const baseCalculation = params.distanceKm * baseKmPrice * passengerMultiplier;



    // Extra service prices
    let extraServicePrice = 0;
    if (params.extraServices && pricing.extraServicePrices) {
      Object.keys(params.extraServices).forEach((key) => {
        if (params.extraServices![key] && pricing.extraServicePrices![key]) {
          extraServicePrice += Number(pricing.extraServicePrices![key]);
        }
      });
    }

    // Subtotal (before round trip multiplier)
    const subtotal = baseCalculation  + extraServicePrice;

    // Total price
    const totalPrice = subtotal;

    // Get currency info
    const currencyCode = pricing.currency?.code || 'EUR';
    const currencyId = pricing.currencyId || '';

    return {
      baseKmPrice,
      distanceKm: params.distanceKm,
      distanceTier: tierLabels[tierKey],
      passengerCount: params.passengerCount,
      passengerMultiplier,
      baseCalculation,
      extraServicePrice,
      subtotal,
      totalPrice,
      currencyCode,
      currencyId,
    };
  }

  /**
   * Get pricing by vehicle ID
   */
  static async getByVehicleId(vehicleId: string, tenantId: string): Promise<TransferPricing | null> {
    return this.pricingRepo().findOne({
      where: { vehicleId, tenantId},
      relations: ['vehicle', 'vehicle.images', 'currency'],
    });
  }
}

