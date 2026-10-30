import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

export enum FlightTripType {
  ONE_WAY = 'one_way',
  ROUND_TRIP = 'round_trip',
}

export enum FlightReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

export enum FlightPaymentStatus {
  UNPAID = 'unpaid',
  PARTIAL = 'partial',
  PAID = 'paid',
}

export enum FlightReservationSource {
  WEB = 'web',
  PANEL = 'panel',
  API = 'api',
}

/** Hangi entegrasyon sağlayıcısı üzerinden işlendi / işlenecek */
export enum FlightIntegrationProvider {
  GTC = 'gtc',
  MANUAL = 'manual',
}

@Entity({ name: 'flight_reservations' })
export class FlightReservation extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 32, unique: true })
  reference!: string;

  @Column({ name: 'integration_provider', type: 'enum', enum: FlightIntegrationProvider })
  integrationProvider!: FlightIntegrationProvider;

  /** Sağlayıcı (örn. GTC) tarafındaki rezervasyon / PNR */
  @Column({ name: 'external_booking_id', type: 'varchar', length: 120, nullable: true })
  externalBookingId?: string | null;

  @Column({ type: 'enum', enum: FlightReservationStatus, default: FlightReservationStatus.PENDING })
  status!: FlightReservationStatus;

  @Column({ name: 'payment_status', type: 'enum', enum: FlightPaymentStatus, default: FlightPaymentStatus.UNPAID })
  paymentStatus!: FlightPaymentStatus;

  @Column({ name: 'source_type', type: 'enum', enum: FlightReservationSource, default: FlightReservationSource.PANEL })
  sourceType!: FlightReservationSource;

  @Column({ name: 'customer_name', type: 'varchar', length: 200 })
  customerName!: string;

  @Column({ name: 'customer_email', type: 'varchar', length: 200, nullable: true })
  customerEmail?: string | null;

  @Column({ name: 'customer_phone', type: 'varchar', length: 50, nullable: true })
  customerPhone?: string | null;

  @Column({ name: 'origin_airport_code', type: 'varchar', length: 8 })
  originAirportCode!: string;

  @Column({ name: 'destination_airport_code', type: 'varchar', length: 8 })
  destinationAirportCode!: string;

  @Column({ name: 'trip_type', type: 'enum', enum: FlightTripType })
  tripType!: FlightTripType;

  @Column({ name: 'departure_date', type: 'date' })
  departureDate!: Date;

  @Column({ name: 'return_date', type: 'date', nullable: true })
  returnDate?: Date | null;

  @Column({ name: 'adult_count', type: 'int', default: 1 })
  adultCount!: number;

  @Column({ name: 'child_count', type: 'int', default: 0 })
  childCount!: number;

  @Column({ name: 'infant_count', type: 'int', default: 0 })
  infantCount!: number;

  @Column({ name: 'total_price', type: 'decimal', precision: 12, scale: 2 })
  totalPrice!: number;

  @Column({ name: 'currency_code', type: 'varchar', length: 3, default: 'TRY' })
  currencyCode!: string;

  @Column({ name: 'payment_method', type: 'varchar', length: 50, nullable: true })
  paymentMethod?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> | null;
}
