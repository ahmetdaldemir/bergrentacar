import { Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { Vehicle } from '../entities/vehicle.entity';
import { Reservation, ReservationType, ReservationStatus } from '../../shared/entities/reservation.entity';
import { VehicleDamage } from '../entities/vehicle-damage.entity';
import { VehicleMaintenance } from '../entities/vehicle-maintenance.entity';
import { VehiclePenalty } from '../entities/vehicle-penalty.entity';
import { VehicleReservationAssignment } from '../entities/vehicle-reservation-assignment.entity';
import { VehiclePlate } from '../entities/vehicle-plate.entity';

export enum TimelineEventType {
  RENTAL_START = 'rental_start',
  RENTAL_END = 'rental_end',
  CHECKOUT = 'checkout',
  CHECKIN = 'checkin',
  DAMAGE = 'damage',
  MAINTENANCE = 'maintenance',
  PENALTY = 'penalty',
  REVENUE = 'revenue',
}

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  title: string;
  description?: string;
  date: Date;
  media?: Array<{
    id: string;
    type: 'image' | 'document' | 'video';
    url: string;
    filename?: string;
    description?: string;
  }>;
  // Type-specific data
  metadata?: Record<string, any>;
}

export class VehicleTimelineService {
  private static vehicleRepo(): Repository<Vehicle> {
    return AppDataSource.getRepository(Vehicle);
  }

  private static reservationRepo(): Repository<Reservation> {
    return AppDataSource.getRepository(Reservation);
  }

  private static damageRepo(): Repository<VehicleDamage> {
    return AppDataSource.getRepository(VehicleDamage);
  }

  private static maintenanceRepo(): Repository<VehicleMaintenance> {
    return AppDataSource.getRepository(VehicleMaintenance);
  }

  private static penaltyRepo(): Repository<VehiclePenalty> {
    return AppDataSource.getRepository(VehiclePenalty);
  }

  private static assignmentRepo(): Repository<VehicleReservationAssignment> {
    return AppDataSource.getRepository(VehicleReservationAssignment);
  }

  /**
   * Get unified timeline for a vehicle
   * Aggregates all events from reservations, damages, maintenance, and penalties
   */
  static async getTimeline(vehicleId: string, tenantId: string): Promise<TimelineEvent[]> {
    // Verify vehicle exists and belongs to tenant
    const vehicle = await this.vehicleRepo().findOne({
      where: { id: vehicleId, tenantId },
    });

    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    const events: TimelineEvent[] = [];

    // 1. Get reservations (rental periods, check-in/check-out, revenue)
    const reservations = await this.reservationRepo()
      .createQueryBuilder('reservation')
      .where('reservation.tenant_id = :tenantId', { tenantId })
      .andWhere('reservation.type = :type', { type: ReservationType.RENTACAR })
      .andWhere("reservation.metadata->>'vehicleId' = :vehicleId", { vehicleId })
      .orderBy('reservation.check_in', 'ASC')
      .getMany();

    for (const reservation of reservations) {
      const metadata = reservation.metadata as any;

      // Rental start (check-in)
      if (reservation.checkIn) {
        events.push({
          id: `rental-start-${reservation.id}`,
          type: TimelineEventType.RENTAL_START,
          title: `Kiralama Başladı - ${reservation.customerName}`,
          description: `Rezervasyon: ${reservation.reference}\nMüşteri: ${reservation.customerName}\nAlış Lokasyonu: ${metadata?.pickupLocationName || 'Bilinmiyor'}`,
          date: reservation.checkIn,
          metadata: {
            reservationId: reservation.id,
            reference: reservation.reference,
            customerName: reservation.customerName,
            customerEmail: reservation.customerEmail,
            pickupLocation: metadata?.pickupLocationName,
          },
        });
      }

      // Checkout event
      if (reservation.checkIn && !reservation.checkOut) {
        events.push({
          id: `checkout-${reservation.id}`,
          type: TimelineEventType.CHECKOUT,
          title: `Araç Teslim Edildi - ${reservation.customerName}`,
          description: `Araç müşteriye teslim edildi.\nRezervasyon: ${reservation.reference}`,
          date: reservation.checkIn,
          metadata: {
            reservationId: reservation.id,
            reference: reservation.reference,
            customerName: reservation.customerName,
          },
        });
      }

      // Rental end (check-out)
      if (reservation.checkOut) {
        events.push({
          id: `rental-end-${reservation.id}`,
          type: TimelineEventType.RENTAL_END,
          title: `Kiralama Bitti - ${reservation.customerName}`,
          description: `Rezervasyon: ${reservation.reference}\nMüşteri: ${reservation.customerName}\nDönüş Lokasyonu: ${metadata?.dropoffLocationName || 'Bilinmiyor'}`,
          date: reservation.checkOut,
          metadata: {
            reservationId: reservation.id,
            reference: reservation.reference,
            customerName: reservation.customerName,
            dropoffLocation: metadata?.dropoffLocationName,
          },
        });
      }

      // Checkin event
      if (reservation.checkOut) {
        events.push({
          id: `checkin-${reservation.id}`,
          type: TimelineEventType.CHECKIN,
          title: `Araç Geri Alındı - ${reservation.customerName}`,
          description: `Araç müşteriden geri alındı.\nRezervasyon: ${reservation.reference}`,
          date: reservation.checkOut,
          metadata: {
            reservationId: reservation.id,
            reference: reservation.reference,
            customerName: reservation.customerName,
          },
        });
      }

      // Revenue event (from completed reservations)
      if (reservation.status === ReservationStatus.COMPLETED && reservation.checkOut && metadata?.totalPrice) {
        events.push({
          id: `revenue-${reservation.id}`,
          type: TimelineEventType.REVENUE,
          title: `Gelir - ${metadata.totalPrice} ${metadata.currencyCode || 'EUR'}`,
          description: `Rezervasyon: ${reservation.reference}\nMüşteri: ${reservation.customerName}\nToplam: ${metadata.totalPrice} ${metadata.currencyCode || 'EUR'}`,
          date: reservation.checkOut,
          metadata: {
            reservationId: reservation.id,
            reference: reservation.reference,
            amount: metadata.totalPrice,
            currencyCode: metadata.currencyCode || 'EUR',
            customerName: reservation.customerName,
          },
        });
      }
    }

    // 2. Get damages
    const damages = await this.damageRepo().find({
      where: { vehicleId, tenantId },
      relations: ['media'],
      order: { date: 'ASC' },
    });

    for (const damage of damages) {
      events.push({
        id: `damage-${damage.id}`,
        type: TimelineEventType.DAMAGE,
        title: damage.title,
        description: damage.description || undefined,
        date: damage.date,
        media: damage.media?.map(m => ({
          id: m.id,
          type: m.type as 'image' | 'document' | 'video',
          url: m.url,
          filename: m.filename,
          description: m.description,
        })),
        metadata: {
          damageId: damage.id,
          severity: damage.severity,
          status: damage.status,
          repairCost: damage.repairCost,
          currencyCode: damage.currencyCode,
          reportedBy: damage.reportedBy,
          reservationId: damage.reservationId,
        },
      });
    }

    // 3. Get maintenance records
    const maintenances = await this.maintenanceRepo().find({
      where: { vehicleId, tenantId },
      relations: ['media'],
      order: { date: 'ASC' },
    });

    for (const maintenance of maintenances) {
      events.push({
        id: `maintenance-${maintenance.id}`,
        type: TimelineEventType.MAINTENANCE,
        title: maintenance.title,
        description: maintenance.description || undefined,
        date: maintenance.date,
        media: maintenance.media?.map(m => ({
          id: m.id,
          type: m.type as 'image' | 'document' | 'video',
          url: m.url,
          filename: m.filename,
          description: m.description,
        })),
        metadata: {
          maintenanceId: maintenance.id,
          type: maintenance.type,
          status: maintenance.status,
          cost: maintenance.cost,
          currencyCode: maintenance.currencyCode,
          serviceProvider: maintenance.serviceProvider,
          odometerReading: maintenance.odometerReading,
          performedBy: maintenance.performedBy,
        },
      });
    }

    // 4. Get penalties
    const penalties = await this.penaltyRepo().find({
      where: { vehicleId, tenantId },
      relations: ['media'],
      order: { date: 'ASC' },
    });

    for (const penalty of penalties) {
      events.push({
        id: `penalty-${penalty.id}`,
        type: TimelineEventType.PENALTY,
        title: penalty.title,
        description: penalty.description || undefined,
        date: penalty.date,
        media: penalty.media?.map(m => ({
          id: m.id,
          type: m.type as 'image' | 'document' | 'video',
          url: m.url,
          filename: m.filename,
          description: m.description,
        })),
        metadata: {
          penaltyId: penalty.id,
          type: penalty.type,
          status: penalty.status,
          amount: penalty.amount,
          currencyCode: penalty.currencyCode,
          fineNumber: penalty.fineNumber,
          location: penalty.location,
          reservationId: penalty.reservationId,
        },
      });
    }

    // Sort all events chronologically
    events.sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime();
      const dateB = b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime();
      return dateA - dateB;
    });

    return events;
  }
}

