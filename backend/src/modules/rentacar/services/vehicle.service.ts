import { Repository, In } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { Vehicle, FuelType, TransmissionType } from '../entities/vehicle.entity';
import { VehiclePlate } from '../entities/vehicle-plate.entity';
import { VehiclePricingPeriod, SeasonName } from '../entities/vehicle-pricing-period.entity';
import { VehicleReservationAssignment } from '../entities/vehicle-reservation-assignment.entity';
import { VehicleCategory } from '../entities/vehicle-category.entity';
import { VehicleBrand } from '../entities/vehicle-brand.entity';
import { VehicleModel } from '../entities/vehicle-model.entity';
import { Location } from '../entities/location.entity';
import { Tenant, TenantCategory } from '../../tenants/entities/tenant.entity';
import { Reservation, ReservationStatus, ReservationType } from '../../shared/entities/reservation.entity';
import { Translation } from '../../shared/entities/translation.entity';
import { LocationVehiclePricing, DayRange } from '../entities/location-vehicle-pricing.entity';
import { LocationPricingService } from './location-pricing.service';
import { CurrencyService } from '../../shared/services/currency.service';
import { Currency } from '../../shared/entities/currency.entity';
import { ExtraService } from './extra.service';
import { Extra } from '../entities/extra.entity';

export type CreateVehicleInput = {
  tenantId: string;
  /** Görünen araç adı */
  name?: string;
  categoryId?: string | null;
  brandId?: string | null;
  modelId?: string | null;
  year?: number;
  transmission?: TransmissionType;
  fuelType?: FuelType;
  seats?: number;
  luggage?: number;
  largeLuggage?: number;
  smallLuggage?: number;
  doors?: number;
  engineSize?: string;
  horsepower?: string;
  bodyType?: string;
  hasHydraulicSteering?: boolean;
  isFourWheelDrive?: boolean;
  hasAirConditioning?: boolean;
  hasAbs?: boolean;
  hasRadio?: boolean;
  hasCd?: boolean;
  hasSunroof?: boolean;
  order?: number;
  description?: string;
  baseRate?: number;
  currencyCode?: string;
  // Legacy fields
  brand?: string;
  model?: string;
};

export type CreatePlateInput = {
  vehicleId: string;
  plateNumber: string;
  registrationDate?: string;
  documentNumber?: string;
  serialNumber?: string;
  km?: number;
  oilKm?: number;
  description?: string;
  comprehensiveInsuranceCompany?: string;
  comprehensiveInsuranceStart?: string;
  comprehensiveInsuranceEnd?: string;
  trafficInsuranceCompany?: string;
  trafficInsuranceStart?: string;
  trafficInsuranceEnd?: string;
  inspectionCompany?: string;
  inspectionStart?: string;
  inspectionEnd?: string;
  exhaustInspectionCompany?: string;
  exhaustInspectionStart?: string;
  exhaustInspectionEnd?: string;
  lastReturnLocationId?: string | null;
};

export type UpsertPricingInput = {
  vehicleId: string;
  season: SeasonName;
  month: number;
  dailyRate: number;
  weeklyRate?: number | null;
};

export type AssignPlateInput = {
  reservationId: string;
  plateId: string;
};

export type ExtendReservationInput = {
  reservationId: string;
  newReturnDate: string; // YYYY-MM-DD format
  newReturnTime?: string; // HH:mm format
  plateId?: string; // Optional: if provided, use this plate instead of current one
  forceExtend?: boolean; // If true, extend even if plate is assigned elsewhere
};

export type VehicleSearchSortBy = 'order' | 'total_price' | 'daily_price' | 'name';

export type VehicleSearchSortOrder = 'asc' | 'desc';

export function resolveVehicleSearchSort(
  sortBy?: string,
  sortOrder?: string
): { by: VehicleSearchSortBy; order: VehicleSearchSortOrder } {
  const allowed: VehicleSearchSortBy[] = ['order', 'total_price', 'daily_price', 'name'];
  const by =
    typeof sortBy === 'string' && allowed.includes(sortBy as VehicleSearchSortBy)
      ? (sortBy as VehicleSearchSortBy)
      : 'order';
  const order: VehicleSearchSortOrder = sortOrder === 'desc' ? 'desc' : 'asc';
  return { by, order };
}

type VehicleSearchResultRow = {
  id: string;
  totalPrice: number;
  dailyPrice: number;
  displayOrder: number;
  brand?: { id?: string; name?: string } | null;
  model?: { id?: string; name?: string } | null;
};

function sortVehicleSearchResults(
  rows: VehicleSearchResultRow[],
  by: VehicleSearchSortBy,
  order: VehicleSearchSortOrder
): void {
  const dir = order === 'desc' ? -1 : 1;
  const numCmp = (a: number, b: number) => (a === b ? 0 : a < b ? -dir : dir);
  if (by === 'total_price') {
    rows.sort((a, b) => numCmp(a.totalPrice, b.totalPrice) || numCmp(a.displayOrder, b.displayOrder));
    return;
  }
  if (by === 'daily_price') {
    rows.sort((a, b) => numCmp(a.dailyPrice, b.dailyPrice) || numCmp(a.displayOrder, b.displayOrder));
    return;
  }
  if (by === 'name') {
    rows.sort((a, b) => {
      const na = `${a.brand?.name ?? ''} ${a.model?.name ?? ''}`.trim().toLowerCase();
      const nb = `${b.brand?.name ?? ''} ${b.model?.name ?? ''}`.trim().toLowerCase();
      const r = na.localeCompare(nb, 'tr');
      if (r !== 0) return order === 'desc' ? -r : r;
      return numCmp(a.displayOrder, b.displayOrder);
    });
    return;
  }
  rows.sort((a, b) => numCmp(a.displayOrder, b.displayOrder));
}

export class VehicleService {
  private static vehicleRepo(): Repository<Vehicle> {
    return AppDataSource.getRepository(Vehicle);
  }

  private static plateRepo(): Repository<VehiclePlate> {
    return AppDataSource.getRepository(VehiclePlate);
  }

  private static pricingRepo(): Repository<VehiclePricingPeriod> {
    return AppDataSource.getRepository(VehiclePricingPeriod);
  }

  private static assignmentRepo(): Repository<VehicleReservationAssignment> {
    return AppDataSource.getRepository(VehicleReservationAssignment);
  }

  static async createVehicle(input: CreateVehicleInput): Promise<Vehicle> {
    const tenantRepo = AppDataSource.getRepository(Tenant);
    const tenant = await tenantRepo.findOne({ where: { id: input.tenantId } });

    if (!tenant) {
      throw new Error('Tenant not found');
    }
    if (tenant.category !== TenantCategory.RENTACAR) {
      throw new Error('Tenant category must be rentacar');
    }

    let category: VehicleCategory | null = null;
    if (input.categoryId) {
      const categoryRepo = AppDataSource.getRepository(VehicleCategory);
      category = await categoryRepo.findOne({ where: { id: input.categoryId } });
      if (!category) {
        throw new Error('Vehicle category not found');
      }
    }

    let brand: VehicleBrand | null = null;
    let brandName: string | undefined = input.brand;
    if (input.brandId) {
      const brandRepo = AppDataSource.getRepository(VehicleBrand);
      brand = await brandRepo.findOne({ where: { id: input.brandId } });
      if (!brand) {
        throw new Error('Vehicle brand not found');
      }
      brandName = brand.name;
    }

    let model: VehicleModel | null = null;
    let modelName: string | undefined = input.model;
    if (input.modelId) {
      const modelRepo = AppDataSource.getRepository(VehicleModel);
      model = await modelRepo.findOne({ where: { id: input.modelId } });
      if (!model) {
        throw new Error('Vehicle model not found');
      }
      modelName = model.name;
    }

    const displayName =
      typeof input.name === 'string' && input.name.trim()
        ? input.name.trim()
        : [brandName, modelName].filter(Boolean).join(' ').trim() || null;

    const vehicle = this.vehicleRepo().create({
      tenant,
      category,
      categoryId: input.categoryId || null,
      brand,
      brandId: input.brandId || null,
      model,
      modelId: input.modelId || null,
      name: displayName,
      brandName,
      modelName,
      year: input.year,
      transmission: input.transmission ?? TransmissionType.AUTOMATIC,
      fuelType: input.fuelType ?? FuelType.GASOLINE,
      seats: input.seats ?? 4,
      luggage: input.luggage ?? 2,
      largeLuggage: input.largeLuggage ?? 0,
      smallLuggage: input.smallLuggage ?? 0,
      doors: input.doors ?? 4,
      engineSize: input.engineSize,
      horsepower: input.horsepower,
      bodyType: input.bodyType,
      hasHydraulicSteering: input.hasHydraulicSteering ?? false,
      isFourWheelDrive: input.isFourWheelDrive ?? false,
      hasAirConditioning: input.hasAirConditioning ?? false,
      hasAbs: input.hasAbs ?? false,
      hasRadio: input.hasRadio ?? false,
      hasCd: input.hasCd ?? false,
      hasSunroof: input.hasSunroof ?? false,
      order: input.order ?? 0,
      description: input.description,
      baseRate: input.baseRate ?? 0,
      currencyCode: input.currencyCode ?? 'EUR',
    });

    return this.vehicleRepo().save(vehicle);
  }

  static async addPlate(input: CreatePlateInput): Promise<VehiclePlate> {
    const vehicle = await this.vehicleRepo().findOne({ where: { id: input.vehicleId } });
    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    const existingPlate = await this.plateRepo().findOne({ where: { plateNumber: input.plateNumber } });
    if (existingPlate) {
      throw new Error('Plate already assigned');
    }

    let lastReturnLocation = null;
    if (input.lastReturnLocationId) {
      const locationRepo = AppDataSource.getRepository(Location);
      const location = await locationRepo.findOne({ where: { id: input.lastReturnLocationId } });
      if (!location) {
        throw new Error('Location not found');
      }
      if (location.tenantId !== vehicle.tenantId) {
        throw new Error('Location and vehicle belong to different tenants');
      }
      lastReturnLocation = location;
    }

    const plate = this.plateRepo().create({
      vehicle,
      plateNumber: input.plateNumber,
      registrationDate: input.registrationDate ? new Date(input.registrationDate) : undefined,
      documentNumber: input.documentNumber,
      serialNumber: input.serialNumber,
      km: input.km,
      oilKm: input.oilKm,
      description: input.description,
      comprehensiveInsuranceCompany: input.comprehensiveInsuranceCompany,
      comprehensiveInsuranceStart: input.comprehensiveInsuranceStart ? new Date(input.comprehensiveInsuranceStart) : undefined,
      comprehensiveInsuranceEnd: input.comprehensiveInsuranceEnd ? new Date(input.comprehensiveInsuranceEnd) : undefined,
      trafficInsuranceCompany: input.trafficInsuranceCompany,
      trafficInsuranceStart: input.trafficInsuranceStart ? new Date(input.trafficInsuranceStart) : undefined,
      trafficInsuranceEnd: input.trafficInsuranceEnd ? new Date(input.trafficInsuranceEnd) : undefined,
      inspectionCompany: input.inspectionCompany,
      inspectionStart: input.inspectionStart ? new Date(input.inspectionStart) : undefined,
      inspectionEnd: input.inspectionEnd ? new Date(input.inspectionEnd) : undefined,
      exhaustInspectionCompany: input.exhaustInspectionCompany,
      exhaustInspectionStart: input.exhaustInspectionStart ? new Date(input.exhaustInspectionStart) : undefined,
      exhaustInspectionEnd: input.exhaustInspectionEnd ? new Date(input.exhaustInspectionEnd) : undefined,
      lastReturnLocation,
      lastReturnLocationId: input.lastReturnLocationId || null,
    });

    return this.plateRepo().save(plate);
  }

  static async updatePlate(plateId: string, input: Partial<CreatePlateInput>): Promise<VehiclePlate> {
    const plate = await this.plateRepo().findOne({ where: { id: plateId } });
    if (!plate) {
      throw new Error('Plate not found');
    }

    // Check if plate number is being changed and if it's already taken
    if (input.plateNumber && input.plateNumber !== plate.plateNumber) {
      const existingPlate = await this.plateRepo().findOne({ where: { plateNumber: input.plateNumber } });
      if (existingPlate) {
        throw new Error('Plate number already assigned to another vehicle');
      }
      plate.plateNumber = input.plateNumber;
    }

    if (input.registrationDate !== undefined) {
      plate.registrationDate = input.registrationDate ? new Date(input.registrationDate) : undefined;
    }
    if (input.documentNumber !== undefined) plate.documentNumber = input.documentNumber;
    if (input.serialNumber !== undefined) plate.serialNumber = input.serialNumber;
    if (input.km !== undefined) plate.km = input.km;
    if (input.oilKm !== undefined) plate.oilKm = input.oilKm;
    if (input.description !== undefined) plate.description = input.description;
    if (input.comprehensiveInsuranceCompany !== undefined) plate.comprehensiveInsuranceCompany = input.comprehensiveInsuranceCompany;
    if (input.comprehensiveInsuranceStart !== undefined) {
      plate.comprehensiveInsuranceStart = input.comprehensiveInsuranceStart ? new Date(input.comprehensiveInsuranceStart) : undefined;
    }
    if (input.comprehensiveInsuranceEnd !== undefined) {
      plate.comprehensiveInsuranceEnd = input.comprehensiveInsuranceEnd ? new Date(input.comprehensiveInsuranceEnd) : undefined;
    }
    if (input.trafficInsuranceCompany !== undefined) plate.trafficInsuranceCompany = input.trafficInsuranceCompany;
    if (input.trafficInsuranceStart !== undefined) {
      plate.trafficInsuranceStart = input.trafficInsuranceStart ? new Date(input.trafficInsuranceStart) : undefined;
    }
    if (input.trafficInsuranceEnd !== undefined) {
      plate.trafficInsuranceEnd = input.trafficInsuranceEnd ? new Date(input.trafficInsuranceEnd) : undefined;
    }
    if (input.inspectionCompany !== undefined) plate.inspectionCompany = input.inspectionCompany;
    if (input.inspectionStart !== undefined) {
      plate.inspectionStart = input.inspectionStart ? new Date(input.inspectionStart) : undefined;
    }
    if (input.inspectionEnd !== undefined) {
      plate.inspectionEnd = input.inspectionEnd ? new Date(input.inspectionEnd) : undefined;
    }
    if (input.exhaustInspectionCompany !== undefined) plate.exhaustInspectionCompany = input.exhaustInspectionCompany;
    if (input.exhaustInspectionStart !== undefined) {
      plate.exhaustInspectionStart = input.exhaustInspectionStart ? new Date(input.exhaustInspectionStart) : undefined;
    }
    if (input.exhaustInspectionEnd !== undefined) {
      plate.exhaustInspectionEnd = input.exhaustInspectionEnd ? new Date(input.exhaustInspectionEnd) : undefined;
    }
    if (input.lastReturnLocationId !== undefined) {
      if (input.lastReturnLocationId) {
        const locationRepo = AppDataSource.getRepository(Location);
        const location = await locationRepo.findOne({ where: { id: input.lastReturnLocationId } });
        if (!location) {
          throw new Error('Location not found');
        }
        const vehicle = await this.vehicleRepo().findOne({ where: { id: plate.vehicleId } });
        if (vehicle && location.tenantId !== vehicle.tenantId) {
          throw new Error('Location and plate belong to different tenants');
        }
        plate.lastReturnLocation = location;
        plate.lastReturnLocationId = input.lastReturnLocationId;
      } else {
        plate.lastReturnLocation = null;
        plate.lastReturnLocationId = null;
      }
    }

    return this.plateRepo().save(plate);
  }

  static async removePlate(plateId: string): Promise<void> {
    const plate = await this.plateRepo().findOne({ where: { id: plateId } });
    if (!plate) {
      throw new Error('Plate not found');
    }
    await this.plateRepo().remove(plate);
  }

  static async upsertPricing(input: UpsertPricingInput): Promise<VehiclePricingPeriod> {
    if (input.month < 1 || input.month > 12) {
      throw new Error('Month must be between 1 and 12');
    }

    const vehicle = await this.vehicleRepo().findOne({ where: { id: input.vehicleId } });
    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    let pricing = await this.pricingRepo().findOne({ where: { vehicleId: input.vehicleId, month: input.month } });

    if (!pricing) {
      pricing = this.pricingRepo().create({
        vehicle,
        season: input.season,
        month: input.month,
        dailyRate: input.dailyRate,
        weeklyRate: input.weeklyRate ?? null,
      });
    } else {
      pricing.season = input.season;
      pricing.dailyRate = input.dailyRate;
      pricing.weeklyRate = input.weeklyRate ?? null;
    }

    return this.pricingRepo().save(pricing);
  }

  static async assignPlate(input: AssignPlateInput): Promise<VehicleReservationAssignment> {
    const reservationRepo = AppDataSource.getRepository(Reservation);

    const reservation = await reservationRepo.findOne({ where: { id: input.reservationId } });
    if (!reservation) {
      throw new Error('Rezervasyon bulunamadı');
    }
    if (reservation.type !== ReservationType.RENTACAR) {
      throw new Error('Bu rezervasyon araç kiralama tipinde değil');
    }

    if (![ReservationStatus.CONFIRMED, ReservationStatus.PENDING].includes(reservation.status)) {
      throw new Error('Plaka ataması için rezervasyon onaylanmış veya bekliyor durumunda olmalıdır');
    }

    const plate = await this.plateRepo().findOne({ where: { id: input.plateId }, relations: ['vehicle'] });
    if (!plate) {
      throw new Error('Plaka bulunamadı');
    }

    if (reservation.tenantId !== plate.vehicle.tenantId) {
      throw new Error('Rezervasyon ve plaka farklı kiracılara ait');
    }

    // Get pickup and return dates from reservation checkIn/checkOut (reservation dates set during booking)
    if (!reservation.checkIn || !reservation.checkOut) {
      throw new Error('Rezervasyonda alış ve dönüş tarihleri belirlenmiş olmalıdır');
    }

    const startDate = new Date(reservation.checkIn);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(reservation.checkOut);
    endDate.setHours(0, 0, 0, 0);

    // Check for overlapping assignments
    const overlapping = await this.assignmentRepo()
      .createQueryBuilder('assignment')
      .where('assignment.plateId = :plateId', { plateId: plate.id })
      .andWhere('assignment.reservationId != :reservationId', { reservationId: reservation.id })
      .andWhere('assignment.startDate <= :endDate AND assignment.endDate >= :startDate', {
        startDate,
        endDate,
      })
      .getOne();

    if (overlapping) {
      throw new Error('Bu plaka belirtilen tarih aralığında başka bir rezervasyona atanmış');
    }

    let assignment = await this.assignmentRepo().findOne({ where: { reservationId: reservation.id } });
    if (!assignment) {
      assignment = this.assignmentRepo().create({
        reservation,
        plate,
        startDate,
        endDate,
      });
    } else {
      assignment.plate = plate;
      assignment.plateId = plate.id;
      assignment.startDate = startDate;
      assignment.endDate = endDate;
    }

    const savedAssignment = await this.assignmentRepo().save(assignment);

    const meta = (reservation.metadata || {}) as Record<string, unknown>;
    meta.plateNumber = plate.plateNumber;
    meta.vehicleId = plate.vehicleId;
    if (plate.vehicle) {
      meta.vehicleName = [plate.vehicle.brandName, plate.vehicle.modelName].filter(Boolean).join(' ') || undefined;
      meta.brandName = plate.vehicle.brandName;
      meta.modelName = plate.vehicle.modelName;
      meta.fuelType = plate.vehicle.fuelType;
      meta.transmission = plate.vehicle.transmission;
    }
    reservation.metadata = meta;
    await reservationRepo.save(reservation);

    return savedAssignment;
  }

  /**
   * Extend a reservation's return date
   * If the current plate is available, extend the assignment
   * If the current plate is assigned elsewhere, check if alternative plate is provided or require confirmation
   */
  static async extendReservation(input: ExtendReservationInput): Promise<{ reservation: Reservation; assignment?: VehicleReservationAssignment; conflict?: { reservationId: string; plateId: string } }> {
    const reservationRepo = AppDataSource.getRepository(Reservation);

    const reservation = await reservationRepo.findOne({ where: { id: input.reservationId } });
    if (!reservation) {
      throw new Error('Reservation not found');
    }
    if (reservation.type !== ReservationType.RENTACAR) {
      throw new Error('Reservation type must be rentacar');
    }

    const metadata = (reservation.metadata || {}) as Record<string, unknown>;
    if (!metadata.checkoutCompletedAt) {
      throw new Error('Çıkışı yapılmamış rezervasyona uzatma yapılamaz. Önce çıkış işlemini tamamlayın.');
    }

    const currentPickupDate = metadata.pickupDate as string | undefined;
    const currentDropoffDate = metadata.dropoffDate as string | undefined;

    if (!currentPickupDate || !currentDropoffDate) {
      throw new Error('Reservation must have pickup and return dates in metadata');
    }

    const newReturnDate = new Date(input.newReturnDate);
    newReturnDate.setHours(0, 0, 0, 0);
    const currentReturnDate = new Date(currentDropoffDate);
    currentReturnDate.setHours(0, 0, 0, 0);
    const minExtendDate = new Date(currentReturnDate);
    minExtendDate.setDate(minExtendDate.getDate() + 1);

    if (newReturnDate < minExtendDate) {
      throw new Error('Uzatma tarihi dönüş tarihinden en az 1 gün sonraya olabilir.');
    }

    // Get current assignment if exists
    const currentAssignment = await this.assignmentRepo().findOne({ 
      where: { reservationId: reservation.id },
      relations: ['plate']
    });

    const newReturnTime = input.newReturnTime || (metadata.dropoffTime as string) || '09:00';

    // Update reservation metadata and checkOut
    const [hours, minutes] = newReturnTime.split(':').map(Number);
    const newReturnDateTime = new Date(newReturnDate);
    newReturnDateTime.setHours(hours, minutes, 0, 0);

    const updatedMetadata = {
      ...metadata,
      dropoffDate: input.newReturnDate,
      dropoffTime: newReturnTime,
    };

    reservation.metadata = updatedMetadata;
    reservation.checkOut = newReturnDateTime;

    // If plate assignment exists, try to extend it
    if (currentAssignment) {
      const plateToUse = input.plateId 
        ? await this.plateRepo().findOne({ where: { id: input.plateId }, relations: ['vehicle'] })
        : currentAssignment.plate;

      if (!plateToUse) {
        throw new Error('Plate not found');
      }

      if (reservation.tenantId !== plateToUse.vehicle.tenantId) {
        throw new Error('Reservation and plate belong to different tenants');
      }

      const pickupDate = new Date(currentPickupDate);
      pickupDate.setHours(0, 0, 0, 0);

      // Check if plate is available in the extended period
      const overlapping = await this.assignmentRepo()
        .createQueryBuilder('assignment')
        .where('assignment.plateId = :plateId', { plateId: plateToUse.id })
        .andWhere('assignment.reservationId != :reservationId', { reservationId: reservation.id })
        .andWhere('assignment.startDate <= :endDate AND assignment.endDate >= :startDate', {
          startDate: pickupDate,
          endDate: newReturnDate,
        })
        .getOne();

      if (overlapping && !input.forceExtend) {
        // Conflict detected - return conflict info
        return {
          reservation: await reservationRepo.save(reservation),
          conflict: {
            reservationId: overlapping.reservationId,
            plateId: plateToUse.id,
          },
        };
      }

      // Check if plate is being changed
      const isPlateChanged = input.plateId && input.plateId !== currentAssignment.plateId;
      
      if (isPlateChanged) {
        // Plate change during extension: 
        // 1. Update current assignment to end at the extension start date (current return date)
        // 2. Create new assignment for the new plate from extension start to new return date
        
        const extensionStartDate = new Date(currentReturnDate);
        extensionStartDate.setHours(0, 0, 0, 0);
        
        // Update current assignment to end at extension start
        currentAssignment.endDate = extensionStartDate;
        await this.assignmentRepo().save(currentAssignment);
        
        // Create new assignment for new plate from extension start to new return date
        const newAssignment = this.assignmentRepo().create({
          reservation,
          plate: plateToUse,
          plateId: plateToUse.id,
          startDate: extensionStartDate,
          endDate: newReturnDate,
        });
        
        const savedNewAssignment = await this.assignmentRepo().save(newAssignment);
        
        const savedReservation = await reservationRepo.save(reservation);
        return {
          reservation: savedReservation,
          assignment: savedNewAssignment,
        };
      } else {
        // Same plate - just extend the current assignment
        if (overlapping && input.forceExtend) {
          // Force extend - this will create an overlap, but user confirmed
          currentAssignment.endDate = newReturnDate;
          await this.assignmentRepo().save(currentAssignment);
        } else {
          // No conflict - extend the assignment
          currentAssignment.endDate = newReturnDate;
          await this.assignmentRepo().save(currentAssignment);
        }

        const savedReservation = await reservationRepo.save(reservation);
        return {
          reservation: savedReservation,
          assignment: currentAssignment,
        };
      }
    } else {
      // No current assignment - just update reservation dates
      const savedReservation = await reservationRepo.save(reservation);
      return {
        reservation: savedReservation,
      };
    }
  }

  static async updateVehicle(id: string, input: Partial<CreateVehicleInput>): Promise<Vehicle> {
    const vehicle = await this.vehicleRepo().findOne({ where: { id } });
    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    if (input.categoryId !== undefined) {
      if (input.categoryId) {
        const categoryRepo = AppDataSource.getRepository(VehicleCategory);
        const category = await categoryRepo.findOne({ where: { id: input.categoryId } });
        if (!category) {
          throw new Error('Vehicle category not found');
        }
        vehicle.category = category;
        vehicle.categoryId = input.categoryId;
      } else {
        vehicle.category = null;
        vehicle.categoryId = null;
      }
    }

    if (input.brandId !== undefined) {
      if (input.brandId) {
        const brandRepo = AppDataSource.getRepository(VehicleBrand);
        const brand = await brandRepo.findOne({ where: { id: input.brandId } });
        if (!brand) {
          throw new Error('Vehicle brand not found');
        }
        vehicle.brand = brand;
        vehicle.brandId = input.brandId;
        vehicle.brandName = brand.name;
      } else {
        vehicle.brand = null;
        vehicle.brandId = null;
        vehicle.brandName = input.brand;
      }
    }

    if (input.modelId !== undefined) {
      if (input.modelId) {
        const modelRepo = AppDataSource.getRepository(VehicleModel);
        const model = await modelRepo.findOne({ where: { id: input.modelId } });
        if (!model) {
          throw new Error('Vehicle model not found');
        }
        vehicle.model = model;
        vehicle.modelId = input.modelId;
        vehicle.modelName = model.name;
      } else {
        vehicle.model = null;
        vehicle.modelId = null;
        vehicle.modelName = input.model;
      }
    }

    if (input.name !== undefined) {
      const t = typeof input.name === 'string' ? input.name.trim() : '';
      vehicle.name = t.length > 0 ? t : null;
    }
    if (input.year !== undefined) vehicle.year = input.year;
    if (input.transmission !== undefined) vehicle.transmission = input.transmission;
    if (input.fuelType !== undefined) vehicle.fuelType = input.fuelType;
    if (input.seats !== undefined) vehicle.seats = input.seats;
    if (input.luggage !== undefined) vehicle.luggage = input.luggage;
    if (input.largeLuggage !== undefined) vehicle.largeLuggage = input.largeLuggage;
    if (input.smallLuggage !== undefined) vehicle.smallLuggage = input.smallLuggage;
    if (input.doors !== undefined) vehicle.doors = input.doors;
    if (input.engineSize !== undefined) vehicle.engineSize = input.engineSize;
    if (input.horsepower !== undefined) vehicle.horsepower = input.horsepower;
    if (input.bodyType !== undefined) vehicle.bodyType = input.bodyType;
    if (input.hasHydraulicSteering !== undefined) vehicle.hasHydraulicSteering = input.hasHydraulicSteering;
    if (input.isFourWheelDrive !== undefined) vehicle.isFourWheelDrive = input.isFourWheelDrive;
    if (input.hasAirConditioning !== undefined) vehicle.hasAirConditioning = input.hasAirConditioning;
    if (input.hasAbs !== undefined) vehicle.hasAbs = input.hasAbs;
    if (input.hasRadio !== undefined) vehicle.hasRadio = input.hasRadio;
    if (input.hasCd !== undefined) vehicle.hasCd = input.hasCd;
    if (input.hasSunroof !== undefined) vehicle.hasSunroof = input.hasSunroof;
    if (input.order !== undefined) vehicle.order = input.order;
    if (input.description !== undefined) vehicle.description = input.description;
    if (input.baseRate !== undefined) vehicle.baseRate = input.baseRate;
    if (input.currencyCode !== undefined) vehicle.currencyCode = input.currencyCode;

    return this.vehicleRepo().save(vehicle);
  }

  static async listVehicles(tenantId: string): Promise<Vehicle[]> {
    const vehicles = await this.vehicleRepo().find({
      where: { tenantId },
      relations: ['category', 'brand', 'model', 'plates', 'plates.lastReturnLocation', 'pricingPeriods', 'lastReturnLocation', 'images'],
      order: { order: 'ASC', createdAt: 'DESC' },
    });

    // Load translations separately for categories to avoid nested relation issues
    if (vehicles.length > 0) {
      const categoryIds = vehicles
        .map(v => v.categoryId)
        .filter((id): id is string => id !== null && id !== undefined);
      
      if (categoryIds.length > 0) {
        const translationRepo = AppDataSource.getRepository(Translation);
        const translations = await translationRepo.find({
          where: {
            model: 'VehicleCategory',
            modelId: In(categoryIds),
          },
          relations: ['language'],
        });

        // Group translations by category ID
        const translationsByCategory = new Map<string, typeof translations>();
        translations.forEach(t => {
          const key = t.modelId;
          if (!translationsByCategory.has(key)) {
            translationsByCategory.set(key, []);
          }
          translationsByCategory.get(key)!.push(t);
        });

        // Attach translations to category entities
        vehicles.forEach(vehicle => {
          if (vehicle.category && vehicle.categoryId) {
            (vehicle.category as any).translations = translationsByCategory.get(vehicle.categoryId) || [];
          }
          // Sort images by order field for public API
          if (vehicle.images && vehicle.images.length > 0) {
            vehicle.images.sort((a, b) => a.order - b.order);
          }
        });
      }
    }

    return vehicles;
  }

  /**
   * Get all vehicle plates for a tenant with vehicle information
   */
  static async listPlates(tenantId: string): Promise<Array<VehiclePlate & { vehicleName?: string }>> {
    const vehicles = await this.vehicleRepo().find({
      where: { tenantId },
      relations: ['plates', 'plates.lastReturnLocation', 'brand', 'model'],
    });

    // Flatten all plates from all vehicles and include vehicle name
    const allPlates: Array<VehiclePlate & { vehicleName?: string }> = [];
    vehicles.forEach(vehicle => {
      if (vehicle.plates && vehicle.plates.length > 0) {
        // Generate vehicle name from brand and model
        const vehicleName = `${vehicle.brand?.name || ''} ${vehicle.model?.name || ''}`.trim() || 'Araç';
        
        vehicle.plates.forEach(plate => {
          allPlates.push({
            ...plate,
            vehicleName,
          });
        });
      }
    });

    // Sort by plate number
    allPlates.sort((a, b) => a.plateNumber.localeCompare(b.plateNumber));

    return allPlates;
  }

  static async updateLastReturnLocation(vehicleId: string, locationId: string | null): Promise<Vehicle> {
    const vehicle = await this.vehicleRepo().findOne({ where: { id: vehicleId } });
    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    if (locationId) {
      const locationRepo = AppDataSource.getRepository(Location);
      const location = await locationRepo.findOne({ where: { id: locationId } });
      if (!location) {
        throw new Error('Location not found');
      }
      if (location.tenantId !== vehicle.tenantId) {
        throw new Error('Location and vehicle belong to different tenants');
      }
      vehicle.lastReturnLocation = location;
      vehicle.lastReturnLocationId = locationId;
    } else {
      vehicle.lastReturnLocation = null;
      vehicle.lastReturnLocationId = null;
    }

    return this.vehicleRepo().save(vehicle);
  }

  /**
   * Helper function to get day range based on number of days
   */
  private static getDayRange(days: number): DayRange {
    if (days >= 1 && days <= 3) return DayRange.RANGE_1_3;
    if (days >= 4 && days <= 6) return DayRange.RANGE_4_6;
    if (days >= 7 && days <= 10) return DayRange.RANGE_7_10;
    if (days >= 11 && days <= 13) return DayRange.RANGE_11_13;
    if (days >= 14 && days <= 20) return DayRange.RANGE_14_20;
    if (days >= 21 && days <= 29) return DayRange.RANGE_21_29;
    if (days >= 30) return DayRange.RANGE_30_PLUS;
    return DayRange.RANGE_1_3; // Default
  }

  /**
   * Calculate rental days considering time difference
   * If pickup time and dropoff time difference is more than 2 hours, add +1 day
   */
  private static calculateRentalDays(
    pickupDate: string,
    dropoffDate: string,
    pickupTime?: string,
    dropoffTime?: string
  ): number {
    const pickup = new Date(pickupDate);
    const dropoff = new Date(dropoffDate);
    
    // Parse times if provided (HH:mm format)
    if (pickupTime) {
      const [hours, minutes] = pickupTime.split(':').map(Number);
      pickup.setHours(hours || 0, minutes || 0, 0, 0);
    } else {
      pickup.setHours(0, 0, 0, 0);
    }
    
    if (dropoffTime) {
      const [hours, minutes] = dropoffTime.split(':').map(Number);
      dropoff.setHours(hours || 0, minutes || 0, 0, 0);
    } else {
      dropoff.setHours(0, 0, 0, 0);
    }
    
    // Calculate base days (date difference)
    const dateOnlyPickup = new Date(pickup.getFullYear(), pickup.getMonth(), pickup.getDate());
    const dateOnlyDropoff = new Date(dropoff.getFullYear(), dropoff.getMonth(), dropoff.getDate());
    const diffDays = Math.floor((dateOnlyDropoff.getTime() - dateOnlyPickup.getTime()) / (1000 * 60 * 60 * 24));
    
    // If pickup and dropoff are on the same day
    if (diffDays === 0) { 
      // Check time difference - if more than 2 hours, it's 1 day rental
      if (pickupTime && dropoffTime) {
        const timeDiffHours = (dropoff.getTime() - pickup.getTime()) / (1000 * 60 * 60);
        if (timeDiffHours > 2) {
          return 1;
        }
      }
      // Same day with <= 2 hours difference is still 1 day minimum
      return 1;
    }
    
    // For multi-day rentals, check if time difference on dropoff day is more than 2 hours
    if (pickupTime && dropoffTime) {
      // Calculate time difference on the dropoff day
      const dropoffDayStart = new Date(dateOnlyDropoff);
      dropoffDayStart.setHours(pickup.getHours(), pickup.getMinutes(), 0, 0);
      
      // If dropoff time is more than 2 hours after pickup time on dropoff day, add 1 day
      const timeDiffOnDropoffDay = (dropoff.getTime() - dropoffDayStart.getTime()) / (1000 * 60 * 60);
      if (timeDiffOnDropoffDay > 2) {
        return diffDays + 1;
      }
    }
    
    return Math.max(1, diffDays);
  }

  /** YYYY-MM-DD → local midnight. Date-only strings are not parsed as UTC. */
  private static parseLocalDate(isoDate: string): Date {
    const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
    return new Date(year, (month || 1) - 1, day || 1, 0, 0, 0, 0);
  }

  /**
   * Days charged per calendar month.
   * Dropoff date is not charged. One extra day is added only when
   * calculateRentalDays does (return time more than 2 hours after pickup time).
   */
  private static calculateMonthlyDays(
    pickupDate: string,
    dropoffDate: string,
    pickupTime?: string,
    dropoffTime?: string
  ): Array<{ month: number; year: number; days: number }> {
    const rentalDays = this.calculateRentalDays(pickupDate, dropoffDate, pickupTime, dropoffTime);
    const pickup = this.parseLocalDate(pickupDate);
    const dropoff = this.parseLocalDate(dropoffDate);

    const buckets = new Map<string, { month: number; year: number; days: number }>();
    const add = (date: Date, count: number) => {
      if (count <= 0) return;
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const key = `${year}-${month}`;
      const row = buckets.get(key);
      if (row) row.days += count;
      else buckets.set(key, { month, year, days: count });
    };

    if (pickup.getTime() >= dropoff.getTime()) {
      add(pickup, rentalDays);
      return [...buckets.values()];
    }

    const cursor = new Date(pickup);
    while (cursor.getTime() < dropoff.getTime()) {
      add(cursor, 1);
      cursor.setDate(cursor.getDate() + 1);
    }

    const calendarDays = [...buckets.values()].reduce((sum, row) => sum + row.days, 0);
    if (rentalDays > calendarDays) {
      add(dropoff, rentalDays - calendarDays);
    }

    return [...buckets.values()];
  }

  /**
   * Get pricing for a vehicle for specific month and day range
   * Fallback: exact location'ta fiyat yoksa aynı tenant'ın diğer lokasyonlarından dene
   * (Veri giriş tutarsızlığı: fiyat yanlış location_id ile girilmiş olabilir)
   */
  private static async getPricingForVehicle(
    pricingRepo: Repository<LocationVehiclePricing>,
    locationId: string,
    vehicleId: string,
    month: number,
    dayRange: DayRange,
    tenantId?: string
  ): Promise<LocationVehiclePricing | null> {
    const pricing = await pricingRepo.findOne({
      where: {
        locationId,
        vehicleId,
        month,
        dayRange,
        isActive: true,
      },
    });

    if (pricing) return pricing;

    // Fallback: aynı tenant'ın başka lokasyonunda bu araç/ay/gün aralığı için fiyat var mı?
    if (tenantId) {
      const fallbackPricing = await pricingRepo
        .createQueryBuilder('lvp')
        .innerJoin('lvp.location', 'rl')
        .where('lvp.vehicleId = :vehicleId', { vehicleId })
        .andWhere('lvp.month = :month', { month })
        .andWhere('lvp.dayRange = :dayRange', { dayRange })
        .andWhere('lvp.isActive = true')
        .andWhere('rl.tenantId = :tenantId', { tenantId })
        .getOne();
      return fallbackPricing;
    }

    return null;
  }

  /**
   * Helper function to convert currency
   * Converts price from source currency to target currency via TRY
   */
  private static async convertCurrency(
    price: number,
    sourceCurrencyCode: string,
    targetCurrencyId: string
  ): Promise<number> {
    if (sourceCurrencyCode === targetCurrencyId) return price;

    const currencyRepo = AppDataSource.getRepository(Currency);
    const sourceCurrency = await CurrencyService.getByCode(sourceCurrencyCode as any);
    const targetCurrency = await currencyRepo.findOne({ where: { id: targetCurrencyId } });

    if (!sourceCurrency || !targetCurrency) {
      return price; // Return original price if currencies not found
    }

    // Convert: sourceCurrency -> TRY -> targetCurrency
    const priceInTry = sourceCurrency.isBaseCurrency 
      ? price 
      : price * Number(sourceCurrency.rateToTry);
    
    const convertedPrice = targetCurrency.isBaseCurrency
      ? priceInTry
      : priceInTry / Number(targetCurrency.rateToTry);

    return Number(convertedPrice.toFixed(2));
  }

  /**
   * Search vehicles with pricing calculation
   * Public endpoint for site users to search available vehicles
   */
  static async searchVehicles(params: {
    tenantId: string;
    languageId?: string;
    pickupLocationId: string;
    dropoffLocationId: string;
    pickupDate: string; // YYYY-MM-DD
    dropoffDate: string; // YYYY-MM-DD
    pickupTime?: string; // HH:mm
    dropoffTime?: string; // HH:mm
    currencyId?: string;
    segment?: string; // Vehicle category ID to filter vehicles by category
    /** Sıralama: order (panel sırası), total_price, daily_price, name */
    sortBy?: string;
    /** asc | desc */
    sortOrder?: string;
  }): Promise<{
    vehicles: Array<{
      id: string;
      /** Paneldeki araç sıra alanı (sortBy=order için) */
      displayOrder: number;
      category?: any;
      brand?: any;
      model?: any;
      year?: number;
      transmission: string;
      fuelType: string;
      seats: number;
      luggage: number;
      largeLuggage: number;
      smallLuggage: number;
      doors: number;
      description?: string;
      images?: Array<{ id: string; url: string; alt?: string; isPrimary: boolean; order: number }>;
      dailyPrice: number;
      totalPrice: number;
      rentalDays: number;
      deliveryFee: number;
      dropFee: number;
      currencyCode: string;
    }>;
    extras: Array<{
      id: string;
      name: string;
      price: number;
      currencyCode: string;
      isMandatory: boolean;
      salesType: string;
      description?: string;
      imageUrl?: string;
    }>;
    /** İstekteki sıralamanın çözümlenmiş hali (yanıtta tekrar gösterilir) */
    sort: { by: VehicleSearchSortBy; order: VehicleSearchSortOrder };
  }> {
    const {
      tenantId,
      pickupLocationId,
      dropoffLocationId,
      pickupDate,
      dropoffDate,
      currencyId,
    } = params;

    // Validate tenant
    const tenantRepo = AppDataSource.getRepository(Tenant);
    const tenant = await tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant || tenant.category !== TenantCategory.RENTACAR) {
      throw new Error('Invalid tenant or tenant is not a rentacar');
    }

    // Get locations from rentacar_locations table
    // Note: pickupLocationId and dropoffLocationId should be rentacar_locations.id
    // But also check if they are master location IDs (locations.id = rentacar_locations.location_id)
    const locationRepo = AppDataSource.getRepository(Location);
    
    // Önce master location ID (locationId) ile ara - site çoğunlukla master id gönderir
    // Fiyatlar bölgeye (master) göre girildiği için bu eşleşme kritik
    let pickupLocation = await locationRepo.findOne({
      where: { locationId: pickupLocationId, tenantId },
    });
    
    // Bulunamazsa rentacar_locations.id ile dene
    if (!pickupLocation) {
      pickupLocation = await locationRepo.findOne({
        where: { id: pickupLocationId, tenantId },
      });
    }
    
    // If still not found, check with soft-deleted included (locationId first)
    if (!pickupLocation) {
      pickupLocation = await locationRepo.findOne({
        where: { locationId: pickupLocationId, tenantId },
        withDeleted: true,
      });
    }
    if (!pickupLocation) {
      pickupLocation = await locationRepo.findOne({
        where: { id: pickupLocationId, tenantId },
        withDeleted: true,
      });
    }
    
    if (!pickupLocation) {
      throw new Error(`Pickup location not found for tenant ${tenantId}. Searched by id: ${pickupLocationId} and locationId: ${pickupLocationId}. Make sure the location exists in rentacar_locations table for this tenant.`);
    }
    
    // Check if location is active (warn but don't fail for search - allow inactive locations)
    if (!pickupLocation.isActive) {
      console.warn(`Pickup location is inactive (id: ${pickupLocation.id}, locationId: ${pickupLocation.locationId})`);
    }
    
    if (pickupLocation.deletedAt) {
      throw new Error(`Pickup location is deleted (id: ${pickupLocation.id})`);
    }
    
    // Önce master location ID ile ara (pickup ile aynı mantık)
    let dropoffLocation = await locationRepo.findOne({
      where: { locationId: dropoffLocationId, tenantId },
    });
    
    if (!dropoffLocation) {
      dropoffLocation = await locationRepo.findOne({
        where: { id: dropoffLocationId, tenantId },
      });
    }
    
    if (!dropoffLocation) {
      dropoffLocation = await locationRepo.findOne({
        where: { locationId: dropoffLocationId, tenantId },
        withDeleted: true,
      });
    }
    if (!dropoffLocation) {
      dropoffLocation = await locationRepo.findOne({
        where: { id: dropoffLocationId, tenantId },
        withDeleted: true,
      });
    }
    
    if (!dropoffLocation) {
      throw new Error(`Dropoff location not found for tenant ${tenantId}. Searched by id: ${dropoffLocationId} and locationId: ${dropoffLocationId}. Make sure the location exists in rentacar_locations table for this tenant.`);
    }
    
    // Check if location is active (warn but don't fail for search - allow inactive locations)
    if (!dropoffLocation.isActive) {
      console.warn(`Dropoff location is inactive (id: ${dropoffLocation.id}, locationId: ${dropoffLocation.locationId})`);
    }
    
    if (dropoffLocation.deletedAt) {
      throw new Error(`Dropoff location is deleted (id: ${dropoffLocation.id})`);
    }

    // Calculate rental days with time consideration
    const rentalDays = this.calculateRentalDays(pickupDate, dropoffDate, params.pickupTime, params.dropoffTime);
    
    if (rentalDays < 1) {
      throw new Error('Dropoff date must be after pickup date');
    }

    // Calculate days per month (for multi-month rentals)
    const monthlyDays = this.calculateMonthlyDays(pickupDate, dropoffDate, params.pickupTime, params.dropoffTime);

    /** Kiralama süresine göre fiyat tablosundaki gün aralığı (tüm aylar için aynı) */
    const tripDayRange = this.getDayRange(rentalDays);
    /** Lokasyon fiyatı ay=1..12; alış tarihinin ayı (günlük gösterim için birincil satır) */
    const pickupMonthForPricing = Math.max(
      1,
      Math.min(12, parseInt(String(pickupDate).split('-')[1] || '1', 10) || 1)
    );

    // Build where clause for vehicles
    const vehicleWhere: any = { tenantId, isActive: true };
    
    // If segment (category ID) is provided, filter by category
    if (params.segment) {
      vehicleWhere.categoryId = params.segment;
    }

    // Get all active vehicles for tenant (filtered by segment/category if provided)
    const vehicles = await this.vehicleRepo().find({
      where: vehicleWhere,
      relations: ['category', 'brand', 'model', 'images'],
      order: { order: 'ASC', brandName: 'ASC', modelName: 'ASC' },
    });
    
    if (vehicles.length === 0) {
      console.log(`No active vehicles found for tenant ${tenantId}`);
    } else {
      console.log(`Found ${vehicles.length} active vehicles for tenant ${tenantId}`);
    }

    // Load translations for categories (Translation.name = kategori adı)
    const categoryIds = vehicles
      .map(v => v.categoryId)
      .filter((id): id is string => id !== null && id !== undefined);
    
    const uniqueCategoryIds = [...new Set(categoryIds)];
    let categoryTranslationsMap = new Map<string, Translation[]>();
    if (uniqueCategoryIds.length > 0) {
      const translationRepo = AppDataSource.getRepository(Translation);
      const translations = await translationRepo.find({
        where: {
          model: 'VehicleCategory',
          modelId: In(uniqueCategoryIds),
        },
        relations: ['language'],
      });
      translations.forEach(t => {
        if (!categoryTranslationsMap.has(t.modelId)) {
          categoryTranslationsMap.set(t.modelId, []);
        }
        categoryTranslationsMap.get(t.modelId)!.push(t);
      });
    }

    // Get default currency or specified currency
    const currencyRepo = AppDataSource.getRepository(Currency);
    let targetCurrency;
    if (currencyId) {
      targetCurrency = await currencyRepo.findOne({ where: { id: currencyId, isActive: true } });
    }
    if (!targetCurrency) {
      // Get default currency (base currency or first active)
      targetCurrency = await currencyRepo.findOne({
        where: { isBaseCurrency: true, isActive: true },
      }) || await currencyRepo.findOne({ where: { isActive: true }, order: { code: 'ASC' } });
    }
    if (!targetCurrency) {
      throw new Error('No active currency found');
    }

    // Get location pricing repository
    const pricingRepo = AppDataSource.getRepository(LocationVehiclePricing);

    // Get delivery and drop fees from rentacar_locations table
    let deliveryFee = Number(pickupLocation.deliveryFee || 0);
    let dropFee = Number(dropoffLocation.dropFee || 0);
    
    // If pickup and dropoff are same, drop fee is 0
    if (pickupLocation.id === dropoffLocation.id) {
      dropFee = 0;
    }

    // Process vehicles with pricing
    const vehicleResults = [];
    for (const vehicle of vehicles) {
      let totalPriceForVehicle = 0;
      let maxMinDays = 0;
      let hasValidPricing = false;
      
      // Calculate pricing for each month in the rental period
      for (const monthData of monthlyDays) {
        // Get pricing for this vehicle, month, and day range (tripDayRange = tablodaki gün aralığı)
        const pricing = await this.getPricingForVehicle(
          pricingRepo,
          pickupLocation.id,
          vehicle.id,
          monthData.month,
          tripDayRange,
          tenantId
        );
        
        let dailyPrice = Number(vehicle.baseRate || 0);
        let discount = 0;
        let minDays = 0;
        
        if (pricing) {
          hasValidPricing = true;
          dailyPrice = Number(pricing.price);
          discount = Number(pricing.discount || 0);
          minDays = Number(pricing.minDays || 0);
          
          // Track maximum minDays requirement
          if (minDays > maxMinDays) {
            maxMinDays = minDays;
          }
          
          // Apply discount if any
          if (discount > 0) {
            dailyPrice = dailyPrice - discount;
          }
          
          console.log(`Pricing found for vehicle ${vehicle.id}, month ${monthData.month}: price=${pricing.price}, discount=${discount}, dailyPrice=${dailyPrice}, minDays=${minDays}`);
        } else {
          // If no pricing found for this month, use base rate
          if (vehicle.baseRate && Number(vehicle.baseRate) > 0) {
            dailyPrice = Number(vehicle.baseRate);
            console.log(`No pricing found for vehicle ${vehicle.id}, month ${monthData.month}, using baseRate=${dailyPrice}`);
          } else {
            console.log(`No pricing found for vehicle ${vehicle.id}, month ${monthData.month}, and no baseRate available`);
          }
        }
        
        // Calculate price for days in this month
        const priceForMonth = dailyPrice * monthData.days;
        totalPriceForVehicle += priceForMonth;
      }
      
      console.log(`Vehicle ${vehicle.id} (${vehicle.brandName} ${vehicle.modelName}): totalPriceForVehicle=${totalPriceForVehicle}, hasValidPricing=${hasValidPricing}, baseRate=${vehicle.baseRate || 0}`);
      
      // Check minimum days requirement (only if pricing was found with minDays requirement)
      if (hasValidPricing && maxMinDays > 0 && rentalDays < maxMinDays) {
        // Skip vehicle if rental days is less than minimum required
        console.log(`Vehicle ${vehicle.id} skipped: rentalDays (${rentalDays}) < minDays (${maxMinDays})`);
        continue;
      }
      
      // Araçları fiyat yoksa da dahil et (baseRate=0 veya location pricing yok)
      // Frontend "Fiyat için iletişime geçin" gösterebilir
      
      // Only skip if totalPriceForVehicle is negative
      // If 0, it might be free rental, so allow it
      if (totalPriceForVehicle < 0) {
        console.log(`Vehicle ${vehicle.id} skipped: totalPriceForVehicle is negative (${totalPriceForVehicle})`);
        continue;
      }
      
      // 0 fiyatlı araçları da dahil et - frontend "Fiyat için iletişime geçin" gösterebilir

      // Convert prices to target currency
      const vehicleCurrencyCode = vehicle.currencyCode || 'TRY';
      const convertedTotalPrice = await this.convertCurrency(
        totalPriceForVehicle,
        vehicleCurrencyCode,
        targetCurrency.id
      );
      const convertedDeliveryFee = await this.convertCurrency(
        deliveryFee,
        'TRY', // Fees are stored in TRY
        targetCurrency.id
      );
      const convertedDropFee = await this.convertCurrency(
        dropFee,
        'TRY', // Fees are stored in TRY
        targetCurrency.id
      );

      // Apply campaign discount (if applicable)
      let campaignDiscount = null;
      let vehiclePriceAfterDiscount = convertedTotalPrice;
      
      try {
        const { CampaignService } = await import('./campaign.service');
        const campaignDiscountResult = await CampaignService.getCampaignDiscount(
          {
            tenantId,
            pickupLocationId: pickupLocation.id,
            vehicleId: vehicle.id,
            vehicleCategoryId: vehicle.categoryId || null,
            rentalDays,
            pickupDate: new Date(pickupDate),
          },
          convertedTotalPrice
        );

        if (campaignDiscountResult) {
          campaignDiscount = campaignDiscountResult;
          vehiclePriceAfterDiscount = campaignDiscountResult.finalPrice;
        }
      } catch (error) {
        // If campaign service fails, continue without discount
        console.error('Error applying campaign discount:', error);
      }

      // Total price includes: vehicle rental price (after discount) + delivery fee (pickup location) + drop fee (dropoff location)
      const finalTotalPrice = vehiclePriceAfterDiscount + convertedDeliveryFee + convertedDropFee;

      /**
       * Günlük fiyat (kampanya ve ücretler hariç): önce veritabanındaki lokasyon–araç–ay–gün aralığı satırı
       * (alış ayı + trip gün aralığı). Ortalama (toplam/gün) kullanılmıyor; çok aylık veya baseRate
       * karışımı yüzünden 60 yerine 70 gibi yanlış yansımaları önler.
       */
      const pricingRowForDailyDisplay = await this.getPricingForVehicle(
        pricingRepo,
        pickupLocation.id,
        vehicle.id,
        pickupMonthForPricing,
        tripDayRange,
        tenantId
      );
      let dailyPriceOut: number;
      if (pricingRowForDailyDisplay) {
        let rawDaily =
          Number(pricingRowForDailyDisplay.price) - Number(pricingRowForDailyDisplay.discount || 0);
        if (rawDaily < 0) rawDaily = 0;
        dailyPriceOut = await this.convertCurrency(rawDaily, vehicleCurrencyCode, targetCurrency.id);
      } else {
        dailyPriceOut = rentalDays > 0 ? convertedTotalPrice / rentalDays : 0;
      }

      // Sort images by order
      const sortedImages = vehicle.images
        ? [...vehicle.images].sort((a, b) => a.order - b.order)
        : [];

      // Get category name from translation (Translation.name = kategori adı, value değil)
      let categoryName: string | undefined;
      if (vehicle.category && vehicle.categoryId) {
        const categoryTranslations = categoryTranslationsMap.get(vehicle.categoryId);
        if (categoryTranslations && categoryTranslations.length > 0) {
          // Öncelik: istenen dil > default dil > ilk bulunan
          const preferred = categoryTranslations.find(t => t.languageId === params.languageId)
            || categoryTranslations.find(t => t.language?.isDefault)
            || categoryTranslations[0];
          categoryName = preferred.name;
        }
      }

      vehicleResults.push({
        id: vehicle.id,
        displayOrder: vehicle.order ?? 0,
        category: vehicle.category ? {
          id: vehicle.category.id,
          name: categoryName || 'Category',
        } : null,
        brand: vehicle.brand ? {
          id: vehicle.brand.id,
          name: vehicle.brand.name,
        } : null,
        model: vehicle.model ? {
          id: vehicle.model.id,
          name: vehicle.model.name,
        } : null,
        year: vehicle.year,
        transmission: vehicle.transmission,
        fuelType: vehicle.fuelType,
        seats: vehicle.seats,
        luggage: vehicle.luggage,
        largeLuggage: vehicle.largeLuggage,
        smallLuggage: vehicle.smallLuggage,
        doors: vehicle.doors,
        description: vehicle.description,
        images: sortedImages.map(img => ({
          id: img.id,
          url: img.url,
          alt: img.alt,
          isPrimary: img.isPrimary,
          order: img.order,
        })),
        dailyPrice: Number(dailyPriceOut.toFixed(2)), // Tablo günlük fiyatı (kampanya/teslim ücreti hariç)
        totalPrice: Number(finalTotalPrice.toFixed(2)), // Total price including deliveryFee and dropFee
        rentalDays,
        deliveryFee: Number(convertedDeliveryFee.toFixed(2)), // Pickup location teslim ücreti
        dropFee: Number(convertedDropFee.toFixed(2)), // Dropoff location dönüş ücreti
        currencyCode: targetCurrency.code,
      });
    }

    const sortResolved = resolveVehicleSearchSort(params.sortBy, params.sortOrder);
    sortVehicleSearchResults(vehicleResults, sortResolved.by, sortResolved.order);

    // Get extras for tenant
    const extras = await ExtraService.list(tenantId);
    const activeExtras = extras.filter(e => e.isActive);

    // Load translations for extras if languageId is provided
    const extraIds = activeExtras.map(e => e.id);
    let extraTranslationsMap = new Map<string, Translation[]>();
    if (extraIds.length > 0 && params.languageId) {
      const translationRepo = AppDataSource.getRepository(Translation);
      const translations = await translationRepo.find({
        where: {
          model: 'Extra',
          modelId: In(extraIds),
          languageId: params.languageId,
        },
      });
      
      translations.forEach(t => {
        if (!extraTranslationsMap.has(t.modelId)) {
          extraTranslationsMap.set(t.modelId, []);
        }
        extraTranslationsMap.get(t.modelId)!.push(t);
      });
    }

    // Convert extras prices to target currency
    const extrasResults = [];
    for (const extra of activeExtras) {
      // Get translation for this extra
      const extraTranslations = extraTranslationsMap.get(extra.id);

      const extraCurrencyCode = extra.currencyCode || 'TRY';
      let finalPrice = Number(extra.price);
      
      // Get extra's currency info
      const extraCurrency = await CurrencyService.getByCode(extraCurrencyCode as any);
      
      // If target currency is the default currency (base currency)
      if (targetCurrency.isBaseCurrency) {
        // If extra's currency is also base currency, use price as-is from database
        if (extraCurrency && extraCurrency.isBaseCurrency) {
          finalPrice = Number(extra.price); // No conversion needed
        } else {
          // Extra's currency is different from base, convert to base currency
          finalPrice = await this.convertCurrency(
            Number(extra.price),
            extraCurrencyCode,
            targetCurrency.id
          );
        }
      } else {
        // Target currency is NOT the default currency, always convert
        finalPrice = await this.convertCurrency(
          Number(extra.price),
          extraCurrencyCode,
          targetCurrency.id
        );
      }

      // Use translation for name and description if available
      let translatedName = extra.name;
      let translatedDescription = extra.description;

      if (extraTranslations && extraTranslations.length > 0) {
        // Use first translation (should be only one per language)
        const translation = extraTranslations[0];
        if (translation.name) {
          translatedName = translation.name;
        }
        if (translation.value) {
          translatedDescription = translation.value;
        }
      }

      extrasResults.push({
        id: extra.id,
        name: translatedName,
        price: Number(finalPrice.toFixed(2)),
        currencyCode: targetCurrency.code,
        isMandatory: extra.isMandatory,
        salesType: extra.salesType,
        description: translatedDescription,
        imageUrl: extra.imageUrl,
      });
    }

    return {
      vehicles: vehicleResults,
      extras: extrasResults,
      sort: { by: sortResolved.by, order: sortResolved.order },
    };
  }

  /**
   * Get plate calendar data for a specific month
   * Returns all plates with their reservations and warning info for the given month
   */
  static async getPlateCalendar(tenantId: string, year: number, month: number): Promise<{
    plates: Array<{
      id: string;
      plateNumber: string;
      vehicleId: string;
      vehicleModel: string;
      vehicleBrand: string;
      lastReturnLocation: { id: string; name: string } | null;
      reservations: Array<{
        id: string;
        reservationId: string;
        reference: string;
        customerName: string;
        pickupDate: string;
        pickupTime: string;
        returnDate: string;
        returnTime: string;
        pickupLocation: string;
        returnLocation: string;
        status: string;
        startDate: string;
        endDate: string;
        colorIndex: number;
      }>;
      warnings: {
        inspection?: { date: string; status: 'expired' | 'upcoming' | 'ok' };
        insurance?: { date: string; status: 'expired' | 'upcoming' | 'ok' };
        maintenance?: { date: string; status: 'expired' | 'upcoming' | 'ok' };
      };
    }>;
  }> {
    const startDate = new Date(year, month - 1, 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(year, month, 0);
    endDate.setHours(23, 59, 59, 999);

    // Get all plates with vehicle info
    const plates = await this.plateRepo().find({
      where: { vehicle: { tenantId } },
      relations: ['vehicle', 'vehicle.brand', 'vehicle.model', 'lastReturnLocation'],
      order: { plateNumber: 'ASC' },
    });

    // Get all assignments for this month
    const assignments = await this.assignmentRepo()
      .createQueryBuilder('assignment')
      .innerJoin('assignment.reservation', 'reservation')
      .where('reservation.tenantId = :tenantId', { tenantId })
      .andWhere('reservation.type = :type', { type: ReservationType.RENTACAR })
      .andWhere('(assignment.startDate <= :endDate AND assignment.endDate >= :startDate)', {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      })
      .leftJoinAndSelect('assignment.reservation', 'res')
      .leftJoinAndSelect('assignment.plate', 'plate')
      .orderBy('assignment.startDate', 'ASC')
      .getMany();

    // Get maintenances for this month
    const { VehicleMaintenance } = require('../entities/vehicle-maintenance.entity');
    const maintenanceRepo = AppDataSource.getRepository(VehicleMaintenance);
    const maintenances = await maintenanceRepo
      .createQueryBuilder('maintenance')
      .where('maintenance.tenantId = :tenantId', { tenantId })
      .andWhere('maintenance.date >= :startDate AND maintenance.date <= :endDate', {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      })
      .leftJoinAndSelect('maintenance.vehicle', 'vehicle')
      .getMany();

    // Group assignments by plate
    const plateMap = new Map<string, any>();

    for (const plate of plates) {
      const vehicleModel = plate.vehicle.model?.name || plate.vehicle.modelName || '';
      const vehicleBrand = plate.vehicle.brand?.name || plate.vehicle.brandName || '';
      
      plateMap.set(plate.id, {
        id: plate.id,
        plateNumber: plate.plateNumber,
        vehicleId: plate.vehicleId,
        vehicleModel: `${vehicleBrand} ${vehicleModel}`.trim(),
        vehicleBrand,
        lastReturnLocation: plate.lastReturnLocation ? {
          id: plate.lastReturnLocation.id,
          name: plate.lastReturnLocation.location?.name || '',
        } : null,
        reservations: [],
        warnings: {},
      });

      // Check warnings
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Inspection warning
      if (plate.inspectionEnd) {
        const inspectionDate = new Date(plate.inspectionEnd);
        const daysDiff = Math.ceil((inspectionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        let status: 'expired' | 'upcoming' | 'ok' = 'ok';
        if (daysDiff < 0) status = 'expired';
        else if (daysDiff <= 30) status = 'upcoming';
        plateMap.get(plate.id)!.warnings.inspection = {
          date: plate.inspectionEnd.toISOString().split('T')[0],
          status,
        };
      }

      // Insurance warning
      const insuranceEnd = plate.trafficInsuranceEnd || plate.comprehensiveInsuranceEnd;
      if (insuranceEnd) {
        const insuranceDate = new Date(insuranceEnd);
        const daysDiff = Math.ceil((insuranceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        let status: 'expired' | 'upcoming' | 'ok' = 'ok';
        if (daysDiff < 0) status = 'expired';
        else if (daysDiff <= 30) status = 'upcoming';
        plateMap.get(plate.id)!.warnings.insurance = {
          date: insuranceEnd.toISOString().split('T')[0],
          status,
        };
      }

      // Maintenance warning (from VehicleMaintenance entity)
      const plateMaintenances = maintenances.filter(m => m.vehicleId === plate.vehicleId);
      if (plateMaintenances.length > 0) {
        const nearestMaintenance = plateMaintenances.sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        )[0];
        const maintenanceDate = new Date(nearestMaintenance.date);
        const daysDiff = Math.ceil((maintenanceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        let status: 'expired' | 'upcoming' | 'ok' = 'ok';
        if (daysDiff < 0) status = 'expired';
        else if (daysDiff <= 30) status = 'upcoming';
        plateMap.get(plate.id)!.warnings.maintenance = {
          date: nearestMaintenance.date.toISOString().split('T')[0],
          status,
        };
      }
    }

    // Assign colors to reservations (round-robin)
    const colorIndexMap = new Map<string, number>();
    let colorCounter = 0;

    // Add reservations to plates
    for (const assignment of assignments) {
      const plateId = assignment.plateId;
      if (!plateMap.has(plateId)) continue;

      const reservation = assignment.reservation;
      const metadata = reservation.metadata || {} as any;
      
      const pickupDate = metadata.pickupDate || reservation.checkIn?.toISOString().split('T')[0];
      const pickupTime = metadata.pickupTime || '09:00';
      const returnDate = metadata.dropoffDate || reservation.checkOut?.toISOString().split('T')[0];
      const returnTime = metadata.dropoffTime || '09:00';

      const reservationKey = `${reservation.id}-${assignment.id}`;
      if (!colorIndexMap.has(reservationKey)) {
        colorIndexMap.set(reservationKey, colorCounter % 10); // 10 different colors
        colorCounter++;
      }

      plateMap.get(plateId)!.reservations.push({
        id: assignment.id,
        reservationId: reservation.id,
        reference: reservation.reference,
        customerName: reservation.customerName,
        pickupDate,
        pickupTime,
        returnDate,
        returnTime,
        pickupLocation: metadata.pickupLocationName || '',
        returnLocation: metadata.dropoffLocationName || '',
        status: reservation.status,
        startDate: assignment.startDate instanceof Date 
          ? assignment.startDate.toISOString().split('T')[0]
          : new Date(assignment.startDate).toISOString().split('T')[0],
        endDate: assignment.endDate instanceof Date
          ? assignment.endDate.toISOString().split('T')[0]
          : new Date(assignment.endDate).toISOString().split('T')[0],
        colorIndex: colorIndexMap.get(reservationKey)!,
      });
    }

    return {
      plates: Array.from(plateMap.values()),
    };
  }
}
