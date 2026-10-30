import { Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { Reservation, ReservationStatus, ReservationType } from '../../shared/entities/reservation.entity';
import { VehicleReservationAssignment } from '../entities/vehicle-reservation-assignment.entity';
import { VehiclePlate } from '../entities/vehicle-plate.entity';
import { Vehicle } from '../entities/vehicle.entity';

export interface TripDto {
  id: string;
  reference: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  status: ReservationStatus;
  checkIn?: Date | null;
  checkOut?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Vehicle info
  vehicle?: {
    id: string;
    name: string;
    brandName?: string;
    modelName?: string;
    year?: number;
  };
  plate?: {
    id: string;
    plateNumber: string;
  };
  assignment?: {
    startDate: Date;
    endDate: Date;
  };
  // Calculated fields
  earned?: number; // Total price from metadata
  isActive: boolean; // checkIn exists but checkOut is null
  isCompleted: boolean; // checkOut exists
}

export interface TripsStatsDto {
  today: {
    total: number;
    active: number;
    completed: number;
    cancelled: number;
  };
  active: number; // All active trips (checkIn exists, checkOut null)
  completed: number; // All completed trips
  cancelled: number; // All cancelled trips
}

export class TripsService {
  private static reservationRepo(): Repository<Reservation> {
    return AppDataSource.getRepository(Reservation);
  }

  private static assignmentRepo(): Repository<VehicleReservationAssignment> {
    return AppDataSource.getRepository(VehicleReservationAssignment);
  }

  /**
   * Get active trips (checkIn exists but checkOut is null)
   * Sorted by newest first
   */
  static async getActiveTrips(tenantId: string): Promise<TripDto[]> {
    const reservations = await this.reservationRepo().find({
      where: {
        tenantId,
        type: ReservationType.RENTACAR,
        status: ReservationStatus.CONFIRMED,
      },
      relations: ['customerLanguage'],
      order: { createdAt: 'DESC' },
    });

    // Filter: checkIn exists but checkOut is null
    const activeReservations = reservations.filter(
      (r) => r.checkIn !== null && r.checkOut === null
    );

    return this.mapToTripDtos(activeReservations, tenantId);
  }

  /**
   * Get trips by status
   */
  static async getTripsByStatus(
    tenantId: string,
    status?: ReservationStatus
  ): Promise<TripDto[]> {
    const where: any = {
      tenantId,
      type: ReservationType.RENTACAR,
    };

    if (status) {
      where.status = status;
    }

    const reservations = await this.reservationRepo().find({
      where,
      relations: ['customerLanguage'],
      order: { createdAt: 'DESC' },
    });

    return this.mapToTripDtos(reservations, tenantId);
  }

  /**
   * Get today's trips
   */
  static async getTodayTrips(tenantId: string): Promise<TripDto[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const reservations = await this.reservationRepo()
      .createQueryBuilder('reservation')
      .where('reservation.tenant_id = :tenantId', { tenantId })
      .andWhere('reservation.type = :type', { type: ReservationType.RENTACAR })
      .andWhere('reservation.created_at >= :today', { today })
      .andWhere('reservation.created_at < :tomorrow', { tomorrow })
      .orderBy('reservation.created_at', 'DESC')
      .getMany();

    return this.mapToTripDtos(reservations, tenantId);
  }

  /**
   * Get trips statistics
   */
  static async getTripsStats(tenantId: string): Promise<TripsStatsDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's trips
    const todayReservations = await this.reservationRepo()
      .createQueryBuilder('reservation')
      .where('reservation.tenant_id = :tenantId', { tenantId })
      .andWhere('reservation.type = :type', { type: ReservationType.RENTACAR })
      .andWhere('reservation.created_at >= :today', { today })
      .andWhere('reservation.created_at < :tomorrow', { tomorrow })
      .getMany();

    // All active trips (checkIn exists, checkOut null)
    const activeReservations = await this.reservationRepo().find({
      where: {
        tenantId,
        type: ReservationType.RENTACAR,
        status: ReservationStatus.CONFIRMED,
      },
    });
    const activeTrips = activeReservations.filter(
      (r) => r.checkIn !== null && r.checkOut === null
    );

    // All completed trips
    const completedReservations = await this.reservationRepo().find({
      where: {
        tenantId,
        type: ReservationType.RENTACAR,
        status: ReservationStatus.COMPLETED,
      },
    });

    // All cancelled trips
    const cancelledReservations = await this.reservationRepo().find({
      where: {
        tenantId,
        type: ReservationType.RENTACAR,
        status: ReservationStatus.CANCELLED,
      },
    });

    // Count today's trips by status
    const todayActive = todayReservations.filter(
      (r) => r.checkIn !== null && r.checkOut === null
    ).length;
    const todayCompleted = todayReservations.filter(
      (r) => r.status === ReservationStatus.COMPLETED
    ).length;
    const todayCancelled = todayReservations.filter(
      (r) => r.status === ReservationStatus.CANCELLED
    ).length;

    return {
      today: {
        total: todayReservations.length,
        active: todayActive,
        completed: todayCompleted,
        cancelled: todayCancelled,
      },
      active: activeTrips.length,
      completed: completedReservations.length,
      cancelled: cancelledReservations.length,
    };
  }

  /**
   * Map reservations to TripDto
   */
  private static async mapToTripDtos(
    reservations: Reservation[],
    tenantId: string
  ): Promise<TripDto[]> {
    const assignmentRepo = this.assignmentRepo();
    const plateRepo = AppDataSource.getRepository(VehiclePlate);
    const vehicleRepo = AppDataSource.getRepository(Vehicle);

    const trips: TripDto[] = [];

    for (const reservation of reservations) {
      // Get assignment
      const assignment = await assignmentRepo.findOne({
        where: { reservationId: reservation.id },
        relations: ['plate', 'plate.vehicle', 'plate.vehicle.brand', 'plate.vehicle.model'],
      });

      let vehicle: any = null;
      let plate: any = null;

      if (assignment?.plate) {
        plate = {
          id: assignment.plate.id,
          plateNumber: assignment.plate.plateNumber,
        };

        if (assignment.plate.vehicle) {
          const vehicleEntity = assignment.plate.vehicle;
          vehicle = {
            id: vehicleEntity.id,
            brandName: vehicleEntity.brand?.name || vehicleEntity.brandName,
            modelName: vehicleEntity.model?.name || vehicleEntity.modelName,
            year: vehicleEntity.year,
          };
        }
      }

      // Get earned amount from metadata
      const metadata = reservation.metadata as any;
      const earned = metadata?.totalPrice || metadata?.price || 0;

      const trip: TripDto = {
        id: reservation.id,
        reference: reservation.reference,
        customerName: reservation.customerName,
        customerEmail: reservation.customerEmail,
        customerPhone: reservation.customerPhone || undefined,
        status: reservation.status,
        checkIn: reservation.checkIn,
        checkOut: reservation.checkOut,
        createdAt: reservation.createdAt,
        updatedAt: reservation.updatedAt,
        vehicle,
        plate,
        assignment: assignment
          ? {
              startDate: assignment.startDate,
              endDate: assignment.endDate,
            }
          : undefined,
        earned,
        isActive: reservation.checkIn !== null && reservation.checkOut === null,
        isCompleted: reservation.checkOut !== null,
      };

      trips.push(trip);
    }

    return trips;
  }
}

