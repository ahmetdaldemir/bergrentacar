import { Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { ReservationLog, ReservationLogStatus } from '../entities/reservation-log.entity';
import { Reservation } from '../entities/reservation.entity';
import { RentacarReservationService } from '../../rentacar/services/rentacar-reservation.service';

export type CreateReservationLogInput = {
  tenantId: string;
  requestData: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
};

export class ReservationLogService {
  private static repository(): Repository<ReservationLog> {
    return AppDataSource.getRepository(ReservationLog);
  }

  /**
   * Create a new reservation log
   */
  static async create(input: CreateReservationLogInput): Promise<ReservationLog> {
    const repo = this.repository();
    
    const log = repo.create({
      tenantId: input.tenantId,
      requestData: input.requestData,
      status: ReservationLogStatus.PENDING,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    return repo.save(log);
  }

  /**
   * List all reservation logs for a tenant
   */
  static async list(tenantId: string, status?: ReservationLogStatus): Promise<ReservationLog[]> {
    const repo = this.repository();
    const where: any = { tenantId };
    
    if (status) {
      where.status = status;
    }

    return repo.find({
      where,
      relations: ['reservation'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get reservation log by ID
   */
  static async getById(id: string, tenantId: string): Promise<ReservationLog | null> {
    const repo = this.repository();
    return repo.findOne({
      where: { id, tenantId },
      relations: ['reservation'],
    });
  }

  /**
   * Update log status to success and link reservation
   */
  static async markSuccess(logId: string, tenantId: string, reservationId: string): Promise<ReservationLog> {
    const repo = this.repository();
    const log = await repo.findOne({ where: { id: logId, tenantId } });

    if (!log) {
      throw new Error('Reservation log not found');
    }

    log.status = ReservationLogStatus.SUCCESS;
    log.reservationId = reservationId;

    return repo.save(log);
  }

  /**
   * Update log status to failed with error message
   */
  static async markFailed(logId: string, tenantId: string, error: string): Promise<ReservationLog> {
    const repo = this.repository();
    const log = await repo.findOne({ where: { id: logId, tenantId } });

    if (!log) {
      throw new Error('Reservation log not found');
    }

    log.status = ReservationLogStatus.FAILED;
    log.error = error;

    return repo.save(log);
  }

  /**
   * Convert log to reservation (retry failed reservation)
   */
  static async convertToReservation(logId: string, tenantId: string): Promise<Reservation> {
    const repo = this.repository();
    const log = await repo.findOne({ where: { id: logId, tenantId } });

    if (!log) {
      throw new Error('Reservation log not found');
    }

    // If reservation already exists, return it
    if (log.reservationId) {
      const reservationRepo = AppDataSource.getRepository(Reservation);
      const reservation = await reservationRepo.findOne({ where: { id: log.reservationId } });
      if (reservation) {
        return reservation;
      }
    }

    // Try to create reservation from log data
    try {
      const reservation = await RentacarReservationService.create(log.requestData as any);

      // Update log status
      log.status = ReservationLogStatus.CONVERTED;
      log.reservationId = reservation.id;
      await repo.save(log);

      return reservation;
    } catch (error) {
      // Update log with error
      log.status = ReservationLogStatus.FAILED;
      log.error = (error as Error).message;
      await repo.save(log);
      
      throw error;
    }
  }
}

