import { AppDataSource } from '../../../config/data-source';
import {
  FlightIntegrationProvider,
  FlightReservation,
  FlightReservationSource,
  FlightReservationStatus,
  FlightPaymentStatus,
  FlightTripType,
} from '../entities/flight-reservation.entity';
import { NotFoundError, ValidationError } from '../../../utils/errors';

export type CreateFlightReservationInput = {
  tenantId: string;
  integrationProvider: FlightIntegrationProvider;
  externalBookingId?: string | null;
  sourceType?: FlightReservationSource;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  originAirportCode: string;
  destinationAirportCode: string;
  tripType: FlightTripType;
  departureDate: string;
  returnDate?: string | null;
  adultCount: number;
  childCount?: number;
  infantCount?: number;
  totalPrice: number;
  currencyCode?: string;
  paymentMethod?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  status?: FlightReservationStatus;
  paymentStatus?: FlightPaymentStatus;
};

export type UpdateFlightReservationInput = Partial<
  Omit<CreateFlightReservationInput, 'tenantId' | 'integrationProvider'>
> & {
  status?: FlightReservationStatus;
  paymentStatus?: FlightPaymentStatus;
};

function generateReference(): string {
  const prefix = 'FLT';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

function normalizeAirport(code: string): string {
  return code.trim().toUpperCase();
}

export class FlightReservationService {
  private static repo() {
    return AppDataSource.getRepository(FlightReservation);
  }

  static async list(
    tenantId: string,
    filters?: { status?: FlightReservationStatus; paymentStatus?: FlightPaymentStatus },
  ): Promise<FlightReservation[]> {
    const qb = this.repo().createQueryBuilder('r').where('r.tenantId = :tenantId', { tenantId });
    if (filters?.status) qb.andWhere('r.status = :status', { status: filters.status });
    if (filters?.paymentStatus)
      qb.andWhere('r.paymentStatus = :paymentStatus', { paymentStatus: filters.paymentStatus });
    return qb.orderBy('r.departureDate', 'DESC').addOrderBy('r.createdAt', 'DESC').getMany();
  }

  static async getById(id: string, tenantId: string): Promise<FlightReservation> {
    const row = await this.repo().findOne({ where: { id, tenantId } });
    if (!row) throw new NotFoundError('FlightReservation', id);
    return row;
  }

  static async create(input: CreateFlightReservationInput): Promise<FlightReservation> {
    const origin = normalizeAirport(input.originAirportCode);
    const dest = normalizeAirport(input.destinationAirportCode);
    if (origin === dest) throw new ValidationError('origin and destination must differ');

    const tripType = input.tripType;
    const dep = new Date(input.departureDate);
    if (Number.isNaN(dep.getTime())) throw new ValidationError('invalid departureDate');

    let returnDate: Date | null = null;
    if (tripType === FlightTripType.ROUND_TRIP) {
      if (!input.returnDate) throw new ValidationError('returnDate is required for round trip');
      returnDate = new Date(input.returnDate);
      if (Number.isNaN(returnDate.getTime())) throw new ValidationError('invalid returnDate');
      if (returnDate <= dep) throw new ValidationError('returnDate must be after departure');
    }

    const repo = this.repo();
    let reference: string;
    let attempts = 0;
    do {
      reference = generateReference();
      attempts++;
    } while (attempts < 5 && (await repo.findOne({ where: { reference } })));

    const adultCount = Math.max(1, input.adultCount);
    const childCount = Math.max(0, input.childCount ?? 0);
    const infantCount = Math.max(0, input.infantCount ?? 0);

    const row = repo.create({
      tenantId: input.tenantId,
      reference,
      integrationProvider: input.integrationProvider,
      externalBookingId: input.externalBookingId ?? null,
      status: input.status ?? FlightReservationStatus.PENDING,
      paymentStatus: input.paymentStatus ?? FlightPaymentStatus.UNPAID,
      sourceType: input.sourceType ?? FlightReservationSource.PANEL,
      customerName: input.customerName.trim(),
      customerEmail: input.customerEmail?.trim() || null,
      customerPhone: input.customerPhone?.trim() || null,
      originAirportCode: origin,
      destinationAirportCode: dest,
      tripType,
      departureDate: dep,
      returnDate,
      adultCount,
      childCount,
      infantCount,
      totalPrice: input.totalPrice,
      currencyCode: (input.currencyCode || 'TRY').toUpperCase().slice(0, 3),
      paymentMethod: input.paymentMethod ?? null,
      notes: input.notes ?? null,
      metadata: input.metadata ?? null,
    });

    return repo.save(row);
  }

  static async update(id: string, tenantId: string, input: UpdateFlightReservationInput): Promise<FlightReservation> {
    const row = await this.getById(id, tenantId);
    if (input.customerName !== undefined) row.customerName = input.customerName.trim();
    if (input.customerEmail !== undefined) row.customerEmail = input.customerEmail?.trim() || null;
    if (input.customerPhone !== undefined) row.customerPhone = input.customerPhone?.trim() || null;
    if (input.originAirportCode !== undefined) row.originAirportCode = normalizeAirport(input.originAirportCode);
    if (input.destinationAirportCode !== undefined)
      row.destinationAirportCode = normalizeAirport(input.destinationAirportCode);
    if (input.externalBookingId !== undefined) row.externalBookingId = input.externalBookingId;
    if (input.tripType !== undefined) row.tripType = input.tripType;
    if (input.departureDate !== undefined) row.departureDate = new Date(input.departureDate);
    if (input.returnDate !== undefined) row.returnDate = input.returnDate ? new Date(input.returnDate) : null;
    if (input.adultCount !== undefined) row.adultCount = Math.max(1, input.adultCount);
    if (input.childCount !== undefined) row.childCount = Math.max(0, input.childCount);
    if (input.infantCount !== undefined) row.infantCount = Math.max(0, input.infantCount);
    if (input.totalPrice !== undefined) row.totalPrice = input.totalPrice;
    if (input.currencyCode !== undefined) row.currencyCode = input.currencyCode.toUpperCase().slice(0, 3);
    if (input.paymentMethod !== undefined) row.paymentMethod = input.paymentMethod;
    if (input.notes !== undefined) row.notes = input.notes;
    if (input.metadata !== undefined) row.metadata = input.metadata;
    if (input.status !== undefined) row.status = input.status;
    if (input.paymentStatus !== undefined) row.paymentStatus = input.paymentStatus;

    if (row.originAirportCode === row.destinationAirportCode) {
      throw new ValidationError('origin and destination must differ');
    }

    return this.repo().save(row);
  }

  static async cancel(id: string, tenantId: string): Promise<FlightReservation> {
    return this.update(id, tenantId, { status: FlightReservationStatus.CANCELLED });
  }

  static async remove(id: string, tenantId: string): Promise<void> {
    const row = await this.getById(id, tenantId);
    await this.repo().remove(row);
  }
}
