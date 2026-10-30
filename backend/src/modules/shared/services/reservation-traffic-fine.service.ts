import { Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { NotFoundError, UnauthorizedError, ValidationError } from '../../../utils/errors';
import { ReservationTrafficFine } from '../entities/reservation-traffic-fine.entity';
import { ReservationService } from './reservation.service';

export class ReservationTrafficFineService {
  private static repo(): Repository<ReservationTrafficFine> {
    return AppDataSource.getRepository(ReservationTrafficFine);
  }

  static async listForReservation(tenantId: string, reservationId: string): Promise<ReservationTrafficFine[]> {
    const r = await ReservationService.getByIdForTenant(reservationId, tenantId);
    if (!r) throw new NotFoundError('Reservation', reservationId);
    return this.repo().find({
      where: { tenantId, reservationId },
      order: { fineDate: 'DESC', createdAt: 'DESC' },
    });
  }

  static async create(
    tenantId: string,
    reservationId: string,
    input: {
      fineDate: string;
      amount: number;
      currencyCode?: string;
      paid?: boolean;
      description?: string | null;
    },
  ): Promise<ReservationTrafficFine> {
    const r = await ReservationService.getByIdForTenant(reservationId, tenantId);
    if (!r) throw new NotFoundError('Reservation', reservationId);
    if (!Number.isFinite(input.amount) || input.amount < 0) {
      throw new ValidationError('Geçerli bir tutar girin');
    }
    const fineDate = input.fineDate?.trim();
    if (!fineDate) throw new ValidationError('Ceza tarihi gerekli');
    const paid = Boolean(input.paid);
    const row = this.repo().create({
      tenantId,
      reservationId,
      fineDate: fineDate.slice(0, 10),
      amount: input.amount.toFixed(2),
      currencyCode: (input.currencyCode || 'TRY').slice(0, 3).toUpperCase(),
      paid,
      paidAt: paid ? new Date() : null,
      description: input.description?.trim() || null,
    });
    return this.repo().save(row);
  }

  static async update(
    tenantId: string,
    reservationId: string,
    fineId: string,
    input: Partial<{
      fineDate: string;
      amount: number;
      currencyCode: string;
      paid: boolean;
      description: string | null;
    }>,
  ): Promise<ReservationTrafficFine> {
    const existing = await this.repo().findOne({ where: { id: fineId, tenantId, reservationId } });
    if (!existing) throw new NotFoundError('TrafficFine', fineId);
    if (input.amount !== undefined) {
      if (!Number.isFinite(input.amount) || input.amount < 0) throw new ValidationError('Geçerli bir tutar girin');
      existing.amount = input.amount.toFixed(2);
    }
    if (input.fineDate !== undefined) existing.fineDate = input.fineDate.trim().slice(0, 10);
    if (input.currencyCode !== undefined) existing.currencyCode = input.currencyCode.slice(0, 3).toUpperCase();
    if (input.description !== undefined) existing.description = input.description?.trim() || null;
    if (input.paid !== undefined) {
      const was = existing.paid;
      existing.paid = Boolean(input.paid);
      if (existing.paid && !was) existing.paidAt = new Date();
      if (!existing.paid) existing.paidAt = null;
    }
    return this.repo().save(existing);
  }

  static async delete(tenantId: string, reservationId: string, fineId: string): Promise<void> {
    const existing = await this.repo().findOne({ where: { id: fineId, tenantId, reservationId } });
    if (!existing) throw new NotFoundError('TrafficFine', fineId);
    await this.repo().remove(existing);
  }
}
