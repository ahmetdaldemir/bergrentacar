import { Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { LocationVehiclePricing, DayRange } from '../entities/location-vehicle-pricing.entity';
import { Location } from '../entities/location.entity';
import { Vehicle } from '../entities/vehicle.entity';

export type CreateLocationPricingInput = {
  locationId: string;
  vehicleId: string;
  month: number;
  dayRange: DayRange;
  price: number;
  discount?: number;
  minDays?: number;
  isActive?: boolean;
};

export type BulkLocationPricingInput = {
  locationId: string;
  month: number;
  pricings: Array<{
    vehicleId: string;
    dayRange: DayRange;
    price: number;
    discount?: number;
    minDays?: number;
    isActive?: boolean;
  }>;
};

export type LocationPricingDto = {
  id: string;
  locationId: string;
  vehicleId: string;
  vehicleName?: string;
  month: number;
  dayRange: DayRange;
  price: number;
  discount: number;
  minDays: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export class LocationPricingService {
  private static pricingRepo(): Repository<LocationVehiclePricing> {
    return AppDataSource.getRepository(LocationVehiclePricing);
  }

  private static locationRepo(): Repository<Location> {
    return AppDataSource.getRepository(Location);
  }

  private static vehicleRepo(): Repository<Vehicle> {
    return AppDataSource.getRepository(Vehicle);
  }

  static async listByLocation(locationId: string, month?: number): Promise<LocationPricingDto[]> {
    const where: any = { locationId };
    if (month !== undefined) {
      where.month = month;
    }

    const pricings = await this.pricingRepo().find({
      where,
      relations: ['vehicle', 'vehicle.brand', 'vehicle.model'],
      order: { month: 'ASC', vehicle: { brandName: 'ASC', modelName: 'ASC' }, dayRange: 'ASC' },
    });

    return pricings.map((p) => ({
      id: p.id,
      locationId: p.locationId,
      vehicleId: p.vehicleId,
      vehicleName: `${p.vehicle.brandName} ${p.vehicle.modelName}`,
      month: p.month,
      dayRange: p.dayRange,
      price: Number(p.price),
      discount: Number(p.discount),
      minDays: p.minDays,
      isActive: p.isActive,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }

  static async getByLocationAndVehicle(
    locationId: string,
    vehicleId: string,
    month?: number
  ): Promise<LocationPricingDto[]> {
    const where: any = { locationId, vehicleId };
    if (month !== undefined) {
      where.month = month;
    }

    const pricings = await this.pricingRepo().find({
      where,
      order: { month: 'ASC', dayRange: 'ASC' },
    });

    return pricings.map((p) => ({
      id: p.id,
      locationId: p.locationId,
      vehicleId: p.vehicleId,
      month: p.month,
      dayRange: p.dayRange,
      price: Number(p.price),
      discount: Number(p.discount),
      minDays: p.minDays,
      isActive: p.isActive,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }

  static async upsert(input: CreateLocationPricingInput): Promise<LocationVehiclePricing> {
    if (input.month < 1 || input.month > 12) {
      throw new Error('Month must be between 1 and 12');
    }

    const location = await this.locationRepo().findOne({ where: { id: input.locationId } });
    if (!location) {
      throw new Error('Location not found');
    }

    const vehicle = await this.vehicleRepo().findOne({ where: { id: input.vehicleId } });
    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    let pricing = await this.pricingRepo().findOne({
      where: {
        locationId: input.locationId,
        vehicleId: input.vehicleId,
        month: input.month,
        dayRange: input.dayRange,
      },
    });

    if (!pricing) {
      pricing = this.pricingRepo().create({
        location,
        vehicle,
        month: input.month,
        dayRange: input.dayRange,
        price: input.price,
        discount: input.discount || 0,
        minDays: input.minDays || 0,
        isActive: input.isActive !== undefined ? input.isActive : true,
      });
    } else {
      pricing.price = input.price;
      pricing.discount = input.discount !== undefined ? input.discount : pricing.discount;
      pricing.minDays = input.minDays !== undefined ? input.minDays : pricing.minDays;
      pricing.isActive = input.isActive !== undefined ? input.isActive : pricing.isActive;
    }

    return this.pricingRepo().save(pricing);
  }

  static async bulkUpsert(input: BulkLocationPricingInput): Promise<LocationVehiclePricing[]> {
    if (input.month < 1 || input.month > 12) {
      throw new Error('Month must be between 1 and 12');
    }

    const location = await this.locationRepo().findOne({ where: { id: input.locationId } });
    if (!location) {
      throw new Error('Location not found');
    }

    const results: LocationVehiclePricing[] = [];

    for (const pricingInput of input.pricings) {
      const vehicle = await this.vehicleRepo().findOne({ where: { id: pricingInput.vehicleId } });
      if (!vehicle) {
        continue; // Skip if vehicle not found
      }

      let pricing = await this.pricingRepo().findOne({
        where: {
          locationId: input.locationId,
          vehicleId: pricingInput.vehicleId,
          month: input.month,
          dayRange: pricingInput.dayRange,
        },
      });

      if (!pricing) {
        pricing = this.pricingRepo().create({
          location,
          vehicle,
          month: input.month,
          dayRange: pricingInput.dayRange,
          price: pricingInput.price,
          discount: pricingInput.discount || 0,
          minDays: pricingInput.minDays || 0,
          isActive: pricingInput.isActive !== undefined ? pricingInput.isActive : true,
        });
      } else {
        pricing.price = pricingInput.price;
        pricing.discount = pricingInput.discount !== undefined ? pricingInput.discount : pricing.discount;
        pricing.minDays = pricingInput.minDays !== undefined ? pricingInput.minDays : pricing.minDays;
        pricing.isActive = pricingInput.isActive !== undefined ? pricingInput.isActive : pricing.isActive;
      }

      const saved = await this.pricingRepo().save(pricing);
      results.push(saved);
    }

    return results;
  }

  static async remove(id: string): Promise<void> {
    const pricing = await this.pricingRepo().findOne({ where: { id } });
    if (!pricing) {
      throw new Error('Pricing not found');
    }
    await this.pricingRepo().remove(pricing);
  }

  static async removeByLocationAndMonth(locationId: string, month: number): Promise<void> {
    await this.pricingRepo().delete({ locationId, month });
  }

  static async bulkCopyPrice(input: {
    locationId: string;
    sourceVehicleId: string;
    sourceMonth: number;
    dayRange: string;
    price: number;
    copyToAllVehicles?: boolean;
    copyToAllMonths?: boolean;
    copyToAllDayRanges?: boolean;
  }): Promise<LocationVehiclePricing[]> {
    const { 
      locationId, 
      sourceVehicleId, 
      sourceMonth, 
      dayRange, 
      price,
      copyToAllVehicles = false,
      copyToAllMonths = false,
      copyToAllDayRanges = false,
    } = input;

    // Validate inputs
    if (sourceMonth < 1 || sourceMonth > 12) {
      throw new Error('Source month must be between 1 and 12');
    }

    const location = await this.locationRepo().findOne({ where: { id: locationId } });
    if (!location) {
      throw new Error('Location not found');
    }

    // Determine target vehicles
    let targetVehicles: any[] = [];
    if (copyToAllVehicles) {
      targetVehicles = await this.vehicleRepo().find({
        where: { tenantId: location.tenantId },
      });
    } else {
      const sourceVehicle = await this.vehicleRepo().findOne({ where: { id: sourceVehicleId } });
      if (!sourceVehicle) {
        throw new Error('Source vehicle not found');
      }
      targetVehicles = [sourceVehicle];
    }

    if (targetVehicles.length === 0) {
      throw new Error('No vehicles found');
    }

    // Determine target months
    const targetMonths = copyToAllMonths 
      ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      : [sourceMonth];

    // Determine target day ranges
    const allDayRanges: DayRange[] = [
      DayRange.RANGE_1_3,
      DayRange.RANGE_4_6,
      DayRange.RANGE_7_10,
      DayRange.RANGE_11_13,
      DayRange.RANGE_14_20,
      DayRange.RANGE_21_29,
      DayRange.RANGE_30_PLUS,
    ];
    const targetDayRanges = copyToAllDayRanges
      ? allDayRanges
      : [dayRange as DayRange];

    const pricingsToSave: LocationVehiclePricing[] = [];

    // Copy price based on options
    for (const vehicle of targetVehicles) {
      for (const month of targetMonths) {
        for (const targetDayRange of targetDayRanges) {
          let pricing = await this.pricingRepo().findOne({
            where: {
              locationId,
              vehicleId: vehicle.id,
              month,
              dayRange: targetDayRange,
            },
          });

          if (!pricing) {
            pricing = this.pricingRepo().create({
              location,
              vehicle,
              month,
              dayRange: targetDayRange,
              price,
              discount: 0,
              minDays: 0,
              isActive: true,
            });
          } else {
            pricing.price = price;
          }

          pricingsToSave.push(pricing);
        }
      }
    }

    // Bulk save all pricings
    const results = await this.pricingRepo().save(pricingsToSave);
    return results;
  }
}

