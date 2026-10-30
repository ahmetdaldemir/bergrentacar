import { Repository, DataSource } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { Reservation, ReservationType } from '../../shared/entities/reservation.entity';
import { VehicleReservationAssignment } from '../entities/vehicle-reservation-assignment.entity';
import { VehiclePlate } from '../entities/vehicle-plate.entity';
import { Vehicle } from '../entities/vehicle.entity';
import { Location } from '../entities/location.entity';
import { RentalPickup, PickupStatus } from '../entities/rental-pickup.entity';
import { RentalReturn, ReturnStatus } from '../entities/rental-return.entity';
import { RentalInspectionMedia, InspectionType } from '../entities/rental-inspection-media.entity';
import { RentalWarning, WarningType } from '../entities/rental-warning.entity';
import { notifyTenantPanelRefresh } from '../../../services/tenant-panel-socket.service';

// Business rule constants
const KM_WARNING_THRESHOLD = 300; // km

export interface OperationItem {
  reservationId: string;
  reference: string;
  customerName: string;
  vehiclePlate?: string;
  vehicleModel?: string;
  pickupLocation?: string;
  pickupDateTime?: string;
  returnDateTime?: string;
  status: 'pending' | 'completed';
  pickupRecordId?: string;
  returnRecordId?: string;
}

export interface CompletePickupInput {
  odometerKm: number;
  fuelLevel: string;
  photos: Array<{ slotIndex: number; mediaUrl: string }>;
}

export interface CompleteReturnInput {
  odometerKm: number;
  fuelLevel: string;
  photos: Array<{ slotIndex: number; mediaUrl: string }>;
  acknowledgedWarnings?: string[]; // Array of warning IDs
}

export interface DamageCompareResult {
  rentalId: string;
  pickupPhotos: Array<{ slotIndex: number; url: string; mediaId?: string; createdAt: string }>;
  returnPhotos: Array<{ slotIndex: number; url: string; mediaId?: string; createdAt: string }>;
}

export class OperationsService {
  private static reservationRepo(): Repository<Reservation> {
    return AppDataSource.getRepository(Reservation);
  }

  private static assignmentRepo(): Repository<VehicleReservationAssignment> {
    return AppDataSource.getRepository(VehicleReservationAssignment);
  }

  private static pickupRepo(): Repository<RentalPickup> {
    return AppDataSource.getRepository(RentalPickup);
  }

  private static returnRepo(): Repository<RentalReturn> {
    return AppDataSource.getRepository(RentalReturn);
  }

  private static mediaRepo(): Repository<RentalInspectionMedia> {
    return AppDataSource.getRepository(RentalInspectionMedia);
  }

  private static warningRepo(): Repository<RentalWarning> {
    return AppDataSource.getRepository(RentalWarning);
  }

  private static vehicleRepo(): Repository<Vehicle> {
    return AppDataSource.getRepository(Vehicle);
  }

  private static locationRepo(): Repository<Location> {
    return AppDataSource.getRepository(Location);
  }

  private static plateRepo(): Repository<VehiclePlate> {
    return AppDataSource.getRepository(VehiclePlate);
  }

  /**
   * Get operations (pickups and returns) for a specific date
   */
  static async getOperationsByDate(tenantId: string, date: string): Promise<{
    pickups: OperationItem[];
    returns: OperationItem[];
  }> {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    // Get all rentacar reservations for this tenant
    const reservations = await this.reservationRepo().find({
      where: {
        tenantId,
        type: ReservationType.RENTACAR,
      },
      relations: ['customerLanguage'],
    });

    const pickups: OperationItem[] = [];
    const returns: OperationItem[] = [];

    for (const reservation of reservations) {
      const metadata = reservation.metadata || {};
      const pickupDate = metadata.pickupDate as string | undefined;
      const dropoffDate = metadata.dropoffDate as string | undefined;
      const pickupTime = metadata.pickupTime as string | undefined;
      const dropoffTime = metadata.dropoffTime as string | undefined;

      if (!pickupDate || !dropoffDate) continue;

      // Parse dates
      const pickupDateTime = pickupTime
        ? new Date(`${pickupDate}T${pickupTime}`)
        : new Date(pickupDate);
      const returnDateTime = dropoffTime
        ? new Date(`${dropoffDate}T${dropoffTime}`)
        : new Date(dropoffDate);

      // Check if pickup is scheduled for target date
      if (
        pickupDateTime >= targetDate &&
        pickupDateTime < nextDate
      ) {
        // Get vehicle info
        const assignment = await this.assignmentRepo().findOne({
          where: { reservationId: reservation.id },
          relations: ['plate', 'plate.vehicle'],
        });

        const vehiclePlate = assignment?.plate?.plateNumber;
        const vehicle = assignment?.plate?.vehicle;
        const vehicleModel = vehicle
          ? `${vehicle.brand?.name || ''} ${vehicle.model?.name || ''}`.trim()
          : undefined;

        // Get location info
        const pickupLocationId = metadata.pickupLocationId as string | undefined;
        let pickupLocationName: string | undefined;
        if (pickupLocationId) {
          const location = await this.locationRepo().findOne({
            where: { id: pickupLocationId, tenantId },
            relations: ['location'],
          });
          pickupLocationName = location?.location?.name;
        }

        // Check if pickup is completed
        const pickupRecord = await this.pickupRepo().findOne({
          where: { reservationId: reservation.id, tenantId },
        });

        pickups.push({
          reservationId: reservation.id,
          reference: reservation.reference,
          customerName: reservation.customerName,
          vehiclePlate,
          vehicleModel,
          pickupLocation: pickupLocationName,
          pickupDateTime: pickupDateTime.toISOString(),
          status: pickupRecord?.status === PickupStatus.COMPLETED ? 'completed' : 'pending',
          pickupRecordId: pickupRecord?.id,
        });
      }

      // Check if return is scheduled for target date
      if (
        returnDateTime >= targetDate &&
        returnDateTime < nextDate
      ) {
        // Get vehicle info
        const assignment = await this.assignmentRepo().findOne({
          where: { reservationId: reservation.id },
          relations: ['plate', 'plate.vehicle'],
        });

        const vehiclePlate = assignment?.plate?.plateNumber;
        const vehicle = assignment?.plate?.vehicle;
        const vehicleModel = vehicle
          ? `${vehicle.brand?.name || ''} ${vehicle.model?.name || ''}`.trim()
          : undefined;

        // Get location info
        const dropoffLocationId = metadata.dropoffLocationId as string | undefined;
        let dropoffLocationName: string | undefined;
        if (dropoffLocationId) {
          const location = await this.locationRepo().findOne({
            where: { id: dropoffLocationId, tenantId },
            relations: ['location'],
          });
          dropoffLocationName = location?.location?.name;
        }

        // Check if return is completed
        const returnRecord = await this.returnRepo().findOne({
          where: { reservationId: reservation.id, tenantId },
        });

        returns.push({
          reservationId: reservation.id,
          reference: reservation.reference,
          customerName: reservation.customerName,
          vehiclePlate,
          vehicleModel,
          pickupLocation: dropoffLocationName, // Return location
          returnDateTime: returnDateTime.toISOString(),
          status: returnRecord?.status === ReturnStatus.COMPLETED ? 'completed' : 'pending',
          returnRecordId: returnRecord?.id,
        });
      }
    }

    return { pickups, returns };
  }

  /**
   * Mobil rezervasyon detayı için: çıkış/dönüş operasyon kayıtları (rental_pickups / rental_returns).
   * `reservation.checkIn` / `checkOut` alanları rent a car’da planlanan tarihler olduğu için tek başına kullanılmaz.
   */
  static async getRentacarOperationSummary(
    tenantId: string,
    reservationId: string
  ): Promise<{
    pickupCompleted: boolean;
    returnCompleted: boolean;
    pickupOdometerKm: number | null;
  }> {
    const reservation = await this.reservationRepo().findOne({
      where: { id: reservationId, tenantId, type: ReservationType.RENTACAR },
    });

    if (!reservation) {
      throw new Error('Reservation not found or tenant mismatch');
    }

    const pickup = await this.pickupRepo().findOne({
      where: { reservationId, tenantId },
    });
    const ret = await this.returnRepo().findOne({
      where: { reservationId, tenantId },
    });

    return {
      pickupCompleted: pickup?.status === PickupStatus.COMPLETED,
      returnCompleted: ret?.status === ReturnStatus.COMPLETED,
      pickupOdometerKm:
        pickup?.odometerKm != null && pickup?.odometerKm !== undefined
          ? Number(pickup.odometerKm)
          : null,
    };
  }

  /**
   * Get pickup record (draft or completed)
   */
  static async getPickup(tenantId: string, reservationId: string): Promise<{
    pickup: RentalPickup | null;
    photos: RentalInspectionMedia[];
  }> {
    // Validate tenant isolation
    const reservation = await this.reservationRepo().findOne({
      where: { id: reservationId, tenantId, type: ReservationType.RENTACAR },
    });

    if (!reservation) {
      throw new Error('Reservation not found or tenant mismatch');
    }

    const pickup = await this.pickupRepo().findOne({
      where: { reservationId, tenantId },
    });

    const photos = await this.mediaRepo().find({
      where: {
        reservationId,
        tenantId,
        inspectionType: InspectionType.PICKUP,
      },
      order: { slotIndex: 'ASC' },
    });

    return { pickup, photos };
  }

  /**
   * Save pickup draft
   */
  static async savePickupDraft(
    tenantId: string,
    reservationId: string,
    userId: string,
    input: Partial<CompletePickupInput>
  ): Promise<RentalPickup> {
    // Validate tenant isolation
    const reservation = await this.reservationRepo().findOne({
      where: { id: reservationId, tenantId, type: ReservationType.RENTACAR },
    });

    if (!reservation) {
      throw new Error('Reservation not found or tenant mismatch');
    }

    let pickup = await this.pickupRepo().findOne({
      where: { reservationId, tenantId },
    });

    if (!pickup) {
      pickup = this.pickupRepo().create({
        tenantId,
        reservationId,
        status: PickupStatus.DRAFT,
        createdBy: userId,
      });
    }

    if (input.odometerKm !== undefined) {
      pickup.odometerKm = input.odometerKm;
    }
    if (input.fuelLevel !== undefined) {
      pickup.fuelLevel = input.fuelLevel;
    }

    pickup = await this.pickupRepo().save(pickup);

    // Save photos if provided
    if (input.photos && input.photos.length > 0) {
      for (const photo of input.photos) {
        if (photo.slotIndex < 1 || photo.slotIndex > 8) {
          throw new Error(`Slot index must be between 1 and 8, got ${photo.slotIndex}`);
        }

        // Upsert media by slot
        let media = await this.mediaRepo().findOne({
          where: {
            tenantId,
            reservationId,
            inspectionType: InspectionType.PICKUP,
            slotIndex: photo.slotIndex,
          },
        });

        if (media) {
          media.mediaUrl = photo.mediaUrl;
        } else {
          media = this.mediaRepo().create({
            tenantId,
            reservationId,
            inspectionType: InspectionType.PICKUP,
            slotIndex: photo.slotIndex,
            mediaUrl: photo.mediaUrl,
          });
        }

        await this.mediaRepo().save(media);
      }
    }

    return pickup;
  }

  /**
   * Complete pickup
   */
  static async completePickup(
    tenantId: string,
    reservationId: string,
    userId: string,
    input: CompletePickupInput
  ): Promise<RentalPickup> {
    // Validate
    if (!input.odometerKm || input.odometerKm < 0) {
      throw new Error('Odometer km is required and must be >= 0');
    }
    if (!input.fuelLevel) {
      throw new Error('Fuel level is required');
    }
    if (!input.photos || input.photos.length !== 8) {
      throw new Error('Exactly 8 photos are required');
    }

    // Validate slot indices
    const slotIndices = input.photos.map(p => p.slotIndex).sort();
    const expectedSlots = [1, 2, 3, 4, 5, 6, 7, 8];
    if (JSON.stringify(slotIndices) !== JSON.stringify(expectedSlots)) {
      throw new Error('Photos must have slot indices 1-8 exactly once');
    }

    // Validate tenant isolation
    const reservation = await this.reservationRepo().findOne({
      where: { id: reservationId, tenantId, type: ReservationType.RENTACAR },
    });

    if (!reservation) {
      throw new Error('Reservation not found or tenant mismatch');
    }

    // Use transaction for atomicity
    const pickupResult = await AppDataSource.transaction(async (manager) => {
      const pickupRepo = manager.getRepository(RentalPickup);
      const mediaRepo = manager.getRepository(RentalInspectionMedia);

      // Get or create pickup
      let pickup = await pickupRepo.findOne({
        where: { reservationId, tenantId },
      });

      if (!pickup) {
        pickup = pickupRepo.create({
          tenantId,
          reservationId,
          status: PickupStatus.DRAFT,
          createdBy: userId,
        });
      }

      // Update pickup
      pickup.odometerKm = input.odometerKm;
      pickup.fuelLevel = input.fuelLevel;
      pickup.status = PickupStatus.COMPLETED;
      pickup.completedAt = new Date();

      pickup = await pickupRepo.save(pickup);

      // Delete existing photos and save new ones
      await mediaRepo.delete({
        tenantId,
        reservationId,
        inspectionType: InspectionType.PICKUP,
      });

      for (const photo of input.photos) {
        const media = mediaRepo.create({
          tenantId,
          reservationId,
          inspectionType: InspectionType.PICKUP,
          slotIndex: photo.slotIndex,
          mediaUrl: photo.mediaUrl,
        });
        await mediaRepo.save(media);
      }

      // Send pickup email to customer (async, don't block)
      const { sendPickupEmail } = await import('../../../services/pickup-email.service');
      const savedPhotos = await mediaRepo.find({
        where: {
          tenantId,
          reservationId,
          inspectionType: InspectionType.PICKUP,
        },
        order: { slotIndex: 'ASC' },
      });
      
      sendPickupEmail(reservation, pickup, savedPhotos).catch((error) => {
        console.error(`Error sending pickup email for reservation ${reservationId}:`, error);
      });

      const resRepo = manager.getRepository(Reservation);
      const resRow = await resRepo.findOne({ where: { id: reservationId, tenantId } });
      if (resRow) {
        const meta = {
          ...(resRow.metadata || {}) as Record<string, unknown>,
          operationPickupCompletedAt: new Date().toISOString(),
        };
        resRow.metadata = meta;
        await resRepo.save(resRow);
      }

      return pickup;
    });
    notifyTenantPanelRefresh(tenantId, { reason: 'operations' });
    return pickupResult;
  }

  /**
   * Get return record (draft or completed)
   */
  static async getReturn(tenantId: string, reservationId: string): Promise<{
    return: RentalReturn | null;
    photos: RentalInspectionMedia[];
    warnings: RentalWarning[];
  }> {
    // Validate tenant isolation
    const reservation = await this.reservationRepo().findOne({
      where: { id: reservationId, tenantId, type: ReservationType.RENTACAR },
    });

    if (!reservation) {
      throw new Error('Reservation not found or tenant mismatch');
    }

    const returnRecord = await this.returnRepo().findOne({
      where: { reservationId, tenantId },
    });

    const photos = await this.mediaRepo().find({
      where: {
        reservationId,
        tenantId,
        inspectionType: InspectionType.RETURN,
      },
      order: { slotIndex: 'ASC' },
    });

    const warnings = await this.warningRepo().find({
      where: { reservationId, tenantId },
      order: { createdAt: 'DESC' },
    });

    return { return: returnRecord, photos, warnings };
  }

  /**
   * Save return draft
   */
  static async saveReturnDraft(
    tenantId: string,
    reservationId: string,
    userId: string,
    input: Partial<CompleteReturnInput>
  ): Promise<RentalReturn> {
    // Validate tenant isolation
    const reservation = await this.reservationRepo().findOne({
      where: { id: reservationId, tenantId, type: ReservationType.RENTACAR },
    });

    if (!reservation) {
      throw new Error('Reservation not found or tenant mismatch');
    }

    let returnRecord = await this.returnRepo().findOne({
      where: { reservationId, tenantId },
    });

    if (!returnRecord) {
      returnRecord = this.returnRepo().create({
        tenantId,
        reservationId,
        status: ReturnStatus.DRAFT,
        createdBy: userId,
      });
    }

    if (input.odometerKm !== undefined) {
      returnRecord.odometerKm = input.odometerKm;
    }
    if (input.fuelLevel !== undefined) {
      returnRecord.fuelLevel = input.fuelLevel;
    }

    returnRecord = await this.returnRepo().save(returnRecord);

    // Save photos if provided
    if (input.photos && input.photos.length > 0) {
      for (const photo of input.photos) {
        if (photo.slotIndex < 1 || photo.slotIndex > 8) {
          throw new Error(`Slot index must be between 1 and 8, got ${photo.slotIndex}`);
        }

        // Upsert media by slot
        let media = await this.mediaRepo().findOne({
          where: {
            tenantId,
            reservationId,
            inspectionType: InspectionType.RETURN,
            slotIndex: photo.slotIndex,
          },
        });

        if (media) {
          media.mediaUrl = photo.mediaUrl;
        } else {
          media = this.mediaRepo().create({
            tenantId,
            reservationId,
            inspectionType: InspectionType.RETURN,
            slotIndex: photo.slotIndex,
            mediaUrl: photo.mediaUrl,
          });
        }

        await this.mediaRepo().save(media);
      }
    }

    return returnRecord;
  }

  /**
   * Complete return with warnings check
   */
  static async completeReturn(
    tenantId: string,
    reservationId: string,
    userId: string,
    input: CompleteReturnInput
  ): Promise<{ return: RentalReturn; warnings: RentalWarning[] }> {
    // Validate
    if (!input.odometerKm || input.odometerKm < 0) {
      throw new Error('Odometer km is required and must be >= 0');
    }
    if (!input.fuelLevel) {
      throw new Error('Fuel level is required');
    }
    if (!input.photos || input.photos.length !== 8) {
      throw new Error('Exactly 8 photos are required');
    }

    // Validate slot indices
    const slotIndices = input.photos.map(p => p.slotIndex).sort();
    const expectedSlots = [1, 2, 3, 4, 5, 6, 7, 8];
    if (JSON.stringify(slotIndices) !== JSON.stringify(expectedSlots)) {
      throw new Error('Photos must have slot indices 1-8 exactly once');
    }

    // Validate tenant isolation
    const reservation = await this.reservationRepo().findOne({
      where: { id: reservationId, tenantId, type: ReservationType.RENTACAR },
    });

    if (!reservation) {
      throw new Error('Reservation not found or tenant mismatch');
    }

    // Get pickup record for comparison
    const pickup = await this.pickupRepo().findOne({
      where: { reservationId, tenantId, status: PickupStatus.COMPLETED },
    });

    if (!pickup) {
      throw new Error('Pickup must be completed before return');
    }

    // Calculate warnings
    const warnings: RentalWarning[] = [];
    const acknowledgedWarningIds = input.acknowledgedWarnings || [];

    // KM warning
    if (pickup.odometerKm !== null && pickup.odometerKm !== undefined) {
      const kmDiff = input.odometerKm - Number(pickup.odometerKm);
      if (kmDiff > KM_WARNING_THRESHOLD) {
        const existingWarning = await this.warningRepo().findOne({
          where: {
            reservationId,
            tenantId,
            type: WarningType.KM_OVER_LIMIT,
          },
        });

        if (existingWarning) {
          if (!acknowledgedWarningIds.includes(existingWarning.id)) {
            warnings.push(existingWarning);
          }
        } else {
          // Create new warning
          const warning = this.warningRepo().create({
            tenantId,
            reservationId,
            type: WarningType.KM_OVER_LIMIT,
            message: `Kilometre farkı ${kmDiff.toFixed(0)} km (Limit: ${KM_WARNING_THRESHOLD} km)`,
            payloadJson: {
              kmDiff,
              pickupKm: pickup.odometerKm,
              returnKm: input.odometerKm,
            },
          });
          warnings.push(warning);
        }
      }
    }

    // Fuel mismatch warning
    if (pickup.fuelLevel && input.fuelLevel !== pickup.fuelLevel) {
      const existingWarning = await this.warningRepo().findOne({
        where: {
          reservationId,
          tenantId,
          type: WarningType.FUEL_MISMATCH,
        },
      });

      if (existingWarning) {
        if (!acknowledgedWarningIds.includes(existingWarning.id)) {
          warnings.push(existingWarning);
        }
      } else {
        // Create new warning
        const warning = this.warningRepo().create({
          tenantId,
          reservationId,
          type: WarningType.FUEL_MISMATCH,
          message: `Yakıt seviyesi uyuşmuyor. Çıkış: ${pickup.fuelLevel}, Dönüş: ${input.fuelLevel}`,
          payloadJson: {
            pickupFuel: pickup.fuelLevel,
            returnFuel: input.fuelLevel,
          },
        });
        warnings.push(warning);
      }
    }

    // If there are unacknowledged warnings, throw error
    if (warnings.length > 0) {
      const error: any = new Error('Warnings must be acknowledged before completing return');
      error.statusCode = 422;
      error.warnings = warnings.map(w => ({
        id: w.id,
        type: w.type,
        message: w.message,
        payload: w.payloadJson,
      }));
      throw error;
    }

    // Use transaction for atomicity
    const returnResult = await AppDataSource.transaction(async (manager) => {
      const returnRepo = manager.getRepository(RentalReturn);
      const mediaRepo = manager.getRepository(RentalInspectionMedia);
      const warningRepo = manager.getRepository(RentalWarning);

      // Get or create return
      let returnRecord = await returnRepo.findOne({
        where: { reservationId, tenantId },
      });

      if (!returnRecord) {
        returnRecord = returnRepo.create({
          tenantId,
          reservationId,
          status: ReturnStatus.DRAFT,
          createdBy: userId,
        });
      }

      // Update return
      returnRecord.odometerKm = input.odometerKm;
      returnRecord.fuelLevel = input.fuelLevel;
      returnRecord.status = ReturnStatus.COMPLETED;
      returnRecord.completedAt = new Date();

      returnRecord = await returnRepo.save(returnRecord);

      // Delete existing photos and save new ones
      await mediaRepo.delete({
        tenantId,
        reservationId,
        inspectionType: InspectionType.RETURN,
      });

      for (const photo of input.photos) {
        const media = mediaRepo.create({
          tenantId,
          reservationId,
          inspectionType: InspectionType.RETURN,
          slotIndex: photo.slotIndex,
          mediaUrl: photo.mediaUrl,
        });
        await mediaRepo.save(media);
      }

      // Save/update warnings with acknowledgment
      if (input.acknowledgedWarnings && input.acknowledgedWarnings.length > 0) {
        for (const warningId of input.acknowledgedWarnings) {
          const warning = await warningRepo.findOne({
            where: { id: warningId, tenantId, reservationId },
          });
          if (warning) {
            warning.acknowledgedBy = userId;
            warning.acknowledgedAt = new Date();
            await warningRepo.save(warning);
          }
        }
      }

      // Get all warnings for response
      const allWarnings = await warningRepo.find({
        where: { reservationId, tenantId },
        order: { createdAt: 'DESC' },
      });

      const resRepo = manager.getRepository(Reservation);
      const resRow = await resRepo.findOne({ where: { id: reservationId, tenantId } });
      if (resRow) {
        const meta = {
          ...(resRow.metadata || {}) as Record<string, unknown>,
          operationReturnCompletedAt: new Date().toISOString(),
        };
        resRow.metadata = meta;
        await resRepo.save(resRow);
      }

      return { return: returnRecord, warnings: allWarnings };
    });
    notifyTenantPanelRefresh(tenantId, { reason: 'operations' });
    return returnResult;
  }

  /**
   * Get damage compare data (for automated damage detection)
   */
  static async getDamageCompare(
    tenantId: string,
    reservationId: string
  ): Promise<DamageCompareResult> {
    // Validate tenant isolation
    const reservation = await this.reservationRepo().findOne({
      where: { id: reservationId, tenantId, type: ReservationType.RENTACAR },
    });

    if (!reservation) {
      throw new Error('Reservation not found or tenant mismatch');
    }

    const pickupPhotos = await this.mediaRepo().find({
      where: {
        reservationId,
        tenantId,
        inspectionType: InspectionType.PICKUP,
      },
      order: { slotIndex: 'ASC' },
    });

    const returnPhotos = await this.mediaRepo().find({
      where: {
        reservationId,
        tenantId,
        inspectionType: InspectionType.RETURN,
      },
      order: { slotIndex: 'ASC' },
    });

    return {
      rentalId: reservationId,
      pickupPhotos: pickupPhotos.map(p => ({
        slotIndex: p.slotIndex,
        url: p.mediaUrl,
        mediaId: p.id,
        createdAt: p.createdAt.toISOString(),
      })),
      returnPhotos: returnPhotos.map(p => ({
        slotIndex: p.slotIndex,
        url: p.mediaUrl,
        mediaId: p.id,
        createdAt: p.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Mobil yükleme: public `/uploads/...` URL ile inspection media (upsert).
   */
  static async upsertInspectionMediaFromUrl(
    tenantId: string,
    reservationId: string,
    inspectionType: InspectionType,
    slotIndex: number,
    mediaUrl: string
  ): Promise<RentalInspectionMedia> {
    const reservation = await this.reservationRepo().findOne({
      where: { id: reservationId, tenantId, type: ReservationType.RENTACAR },
    });
    if (!reservation) {
      throw new Error('Reservation not found or tenant mismatch');
    }
    if (slotIndex < 1 || slotIndex > 8) {
      throw new Error('Slot index must be 1-8');
    }

    let media = await this.mediaRepo().findOne({
      where: { tenantId, reservationId, inspectionType, slotIndex },
    });
    if (media) {
      media.mediaUrl = mediaUrl;
    } else {
      media = this.mediaRepo().create({
        tenantId,
        reservationId,
        inspectionType,
        slotIndex,
        mediaUrl,
      });
    }
    return await this.mediaRepo().save(media);
  }
}

