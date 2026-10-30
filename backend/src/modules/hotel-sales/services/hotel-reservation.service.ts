import { AppDataSource } from '../../../config/data-source';
import { HotelReservation, HotelReservationStatus, HotelPaymentStatus } from '../entities/hotel-reservation.entity';
import { HotelSourceType } from '../entities/tenant-hotel.entity';
import { HotelContractService } from './hotel-contract.service';
import { TenantHotelService } from './tenant-hotel.service';
import { NotFoundError, ValidationError } from '../../../utils/errors';

export type CreateHotelReservationInput = {
  tenantId: string;
  hotelId: string;
  roomTypeId: string;
  contractId?: string;
  channelManagerBookingId?: string;
  sourceType?: HotelSourceType;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  checkIn: string;
  checkOut: string;
  numberOfRooms: number;
  numberOfGuests: number;
  totalPrice: number;
  currencyCode?: string;
  paymentMethod?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
};

export type UpdateHotelReservationInput = Partial<Omit<CreateHotelReservationInput, 'tenantId' | 'hotelId' | 'roomTypeId'>> & {
  status?: HotelReservationStatus;
  paymentStatus?: HotelPaymentStatus;
};

function generateReference(): string {
  const prefix = 'HTL';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export class HotelReservationService {
  private static repo() {
    return AppDataSource.getRepository(HotelReservation);
  }

  static async list(tenantId: string, filters?: { hotelId?: string; status?: HotelReservationStatus; paymentStatus?: HotelPaymentStatus }): Promise<HotelReservation[]> {
    const qb = this.repo()
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.hotel', 'hotel')
      .leftJoinAndSelect('r.roomType', 'roomType')
      .leftJoinAndSelect('r.contract', 'contract')
      .where('r.tenant_id = :tenantId', { tenantId });

    if (filters?.hotelId) qb.andWhere('r.hotel_id = :hotelId', { hotelId: filters.hotelId });
    if (filters?.status) qb.andWhere('r.status = :status', { status: filters.status });
    if (filters?.paymentStatus) qb.andWhere('r.payment_status = :paymentStatus', { paymentStatus: filters.paymentStatus });

    return qb.orderBy('r.check_in', 'DESC').getMany();
  }

  static async getById(id: string, tenantId: string): Promise<HotelReservation> {
    const reservation = await this.repo().findOne({
      where: { id, tenantId },
      relations: ['hotel', 'roomType', 'contract'],
    });
    if (!reservation) throw new NotFoundError('HotelReservation', id);
    return reservation;
  }

  static async create(input: CreateHotelReservationInput): Promise<HotelReservation> {
    await TenantHotelService.getById(input.hotelId, input.tenantId);

    const checkIn = new Date(input.checkIn);
    const checkOut = new Date(input.checkOut);
    if (checkOut <= checkIn) throw new ValidationError('checkOut must be after checkIn');

    const sourceType = input.sourceType ?? HotelSourceType.MANUAL;

    if (sourceType === HotelSourceType.MANUAL && input.contractId) {
      const availability = await HotelContractService.getAvailability(input.contractId, input.tenantId, checkIn, checkOut);
      if (availability.availableRooms < input.numberOfRooms) {
        throw new ValidationError(
          `Not enough rooms available. Requested: ${input.numberOfRooms}, Available: ${availability.availableRooms}`,
        );
      }
    }

    const repo = this.repo();
    let reference: string;
    let attempts = 0;
    do {
      reference = generateReference();
      attempts++;
    } while (attempts < 5 && await repo.findOne({ where: { reference } }));

    const reservation = repo.create({
      tenantId: input.tenantId,
      reference,
      hotelId: input.hotelId,
      roomTypeId: input.roomTypeId,
      contractId: input.contractId ?? null,
      channelManagerBookingId: input.channelManagerBookingId ?? null,
      sourceType,
      customerName: input.customerName,
      customerEmail: input.customerEmail ?? null,
      customerPhone: input.customerPhone ?? null,
      checkIn,
      checkOut,
      numberOfRooms: input.numberOfRooms,
      numberOfGuests: input.numberOfGuests,
      totalPrice: input.totalPrice,
      currencyCode: input.currencyCode ?? 'EUR',
      status: HotelReservationStatus.PENDING,
      paymentStatus: HotelPaymentStatus.UNPAID,
      paymentMethod: input.paymentMethod ?? null,
      notes: input.notes ?? null,
      metadata: input.metadata ?? null,
    });

    const saved = await repo.save(reservation);

    return saved;
  }

  static async update(id: string, tenantId: string, input: UpdateHotelReservationInput): Promise<HotelReservation> {
    const reservation = await this.getById(id, tenantId);

    if (input.checkIn) (reservation as any).checkIn = new Date(input.checkIn);
    if (input.checkOut) (reservation as any).checkOut = new Date(input.checkOut);
    const { checkIn: _ci, checkOut: _co, ...rest } = input;
    Object.assign(reservation, rest);

    if (reservation.checkOut <= reservation.checkIn) {
      throw new ValidationError('checkOut must be after checkIn');
    }

    return this.repo().save(reservation);
  }

  static async cancel(id: string, tenantId: string): Promise<HotelReservation> {
    const reservation = await this.getById(id, tenantId);
    if (reservation.status === HotelReservationStatus.CANCELLED) {
      throw new ValidationError('Reservation is already cancelled');
    }
    reservation.status = HotelReservationStatus.CANCELLED;
    return this.repo().save(reservation);
  }

  static async remove(id: string, tenantId: string): Promise<void> {
    const reservation = await this.getById(id, tenantId);
    await this.repo().remove(reservation);
  }
}
