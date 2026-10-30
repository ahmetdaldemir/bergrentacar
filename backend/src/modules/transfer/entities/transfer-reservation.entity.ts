import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { TransferVehicle } from './transfer-vehicle.entity';
import { TransferRoute } from './transfer-route.entity';
import { TransferDriver } from './transfer-driver.entity';

export enum TransferReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity({ name: 'transfer_reservations' })
export class TransferReservation extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 40, unique: true })
  reference!: string; // Rezervasyon kodu (örn: TRF-2024-001)

  @ManyToOne(() => TransferRoute, { nullable: true })
  @JoinColumn({ name: 'route_id' })
  route?: TransferRoute | null;

  @Column({ name: 'route_id', nullable: true })
  routeId?: string | null;

  @ManyToOne(() => TransferVehicle, { nullable: false })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: TransferVehicle;

  @Column({ name: 'vehicle_id' })
  vehicleId!: string;

  @ManyToOne(() => TransferDriver, { nullable: true })
  @JoinColumn({ name: 'driver_id' })
  driver?: TransferDriver | null;

  @Column({ name: 'driver_id', nullable: true })
  driverId?: string | null;

  @Column({ type: 'enum', enum: TransferReservationStatus, default: TransferReservationStatus.PENDING })
  status!: TransferReservationStatus;

  // Yolcu bilgileri
  @Column({ name: 'passenger_name', type: 'varchar', length: 120 })
  passengerName!: string;

  @Column({ name: 'passenger_email', type: 'varchar', length: 160 })
  passengerEmail!: string;

  @Column({ name: 'passenger_phone', type: 'varchar', length: 32 })
  passengerPhone!: string;

  @Column({ name: 'passenger_count', type: 'int' })
  passengerCount!: number;

  @Column({ name: 'luggage_count', type: 'int', default: 0 })
  luggageCount!: number;

  // Tarih & Saat
  @Column({ name: 'transfer_date', type: 'date' })
  transferDate!: Date;

  @Column({ name: 'transfer_time', type: 'time' })
  transferTime!: string; // HH:mm format

  // Google Maps pickup location
  @Column({ name: 'pickup_place_id', type: 'varchar', length: 255, nullable: true })
  pickupPlaceId?: string;

  @Column({ name: 'pickup_place_name', type: 'varchar', length: 200, nullable: true })
  pickupPlaceName?: string;

  @Column({ name: 'pickup_address', type: 'varchar', length: 300, nullable: true })
  pickupAddress?: string;

  @Column({ name: 'pickup_lat', type: 'varchar', length: 50, nullable: true })
  pickupLat?: string;

  @Column({ name: 'pickup_lng', type: 'varchar', length: 50, nullable: true })
  pickupLng?: string;

  // Google Maps dropoff location
  @Column({ name: 'dropoff_place_id', type: 'varchar', length: 255, nullable: true })
  dropoffPlaceId?: string;

  @Column({ name: 'dropoff_place_name', type: 'varchar', length: 200, nullable: true })
  dropoffPlaceName?: string;

  @Column({ name: 'dropoff_address', type: 'varchar', length: 300, nullable: true })
  dropoffAddress?: string;

  @Column({ name: 'dropoff_lat', type: 'varchar', length: 50, nullable: true })
  dropoffLat?: string;

  @Column({ name: 'dropoff_lng', type: 'varchar', length: 50, nullable: true })
  dropoffLng?: string;

  // Calculated distance from Google Maps
  @Column({ name: 'distance_km', type: 'decimal', precision: 10, scale: 2, nullable: true })
  distanceKm?: number;

  // Uçuş bilgileri (opsiyonel)
  @Column({ name: 'flight_number', type: 'varchar', length: 20, nullable: true })
  flightNumber?: string;

  @Column({ name: 'flight_arrival_time', type: 'timestamp', nullable: true })
  flightArrivalTime?: Date;

  @Column({ name: 'flight_departure_time', type: 'timestamp', nullable: true })
  flightDepartureTime?: Date;

  // Fiyatlandırma
  @Column({ name: 'base_price', type: 'decimal', precision: 10, scale: 2 })
  basePrice!: number;

  @Column({ name: 'extra_service_price', type: 'decimal', precision: 10, scale: 2, default: 0 })
  extraServicePrice!: number;

  @Column({ name: 'total_price', type: 'decimal', precision: 10, scale: 2 })
  totalPrice!: number;

  @Column({ name: 'currency_code', type: 'varchar', length: 3, default: 'EUR' })
  currencyCode!: string;

  @Column({ name: 'is_round_trip', default: false })
  isRoundTrip!: boolean;

  @Column({ name: 'is_night_rate', default: false })
  isNightRate!: boolean;

  // ── Dönüş bacak (gidiş-dönüş rezervasyonlarda) ─────────────────────────────
  @ManyToOne(() => TransferVehicle, { nullable: true })
  @JoinColumn({ name: 'return_vehicle_id' })
  returnVehicle?: TransferVehicle | null;

  @Column({ name: 'return_vehicle_id', nullable: true })
  returnVehicleId?: string | null;

  @Column({ name: 'return_transfer_date', type: 'date', nullable: true })
  returnTransferDate?: Date | null;

  @Column({ name: 'return_transfer_time', type: 'varchar', length: 5, nullable: true })
  returnTransferTime?: string | null; // HH:mm

  @Column({ name: 'return_pickup_place_name', type: 'varchar', length: 200, nullable: true })
  returnPickupPlaceName?: string | null;

  @Column({ name: 'return_pickup_address', type: 'varchar', length: 300, nullable: true })
  returnPickupAddress?: string | null;

  @Column({ name: 'return_pickup_lat', type: 'varchar', length: 50, nullable: true })
  returnPickupLat?: string | null;

  @Column({ name: 'return_pickup_lng', type: 'varchar', length: 50, nullable: true })
  returnPickupLng?: string | null;

  @Column({ name: 'return_dropoff_place_name', type: 'varchar', length: 200, nullable: true })
  returnDropoffPlaceName?: string | null;

  @Column({ name: 'return_dropoff_address', type: 'varchar', length: 300, nullable: true })
  returnDropoffAddress?: string | null;

  @Column({ name: 'return_dropoff_lat', type: 'varchar', length: 50, nullable: true })
  returnDropoffLat?: string | null;

  @Column({ name: 'return_dropoff_lng', type: 'varchar', length: 50, nullable: true })
  returnDropoffLng?: string | null;

  @Column({ name: 'return_distance_km', type: 'decimal', precision: 10, scale: 2, nullable: true })
  returnDistanceKm?: number | null;

  @Column({ name: 'return_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  returnPrice?: number | null;

  @Column({ name: 'return_is_night_rate', default: false })
  returnIsNightRate!: boolean;

  // Ek hizmetler
  @Column({ name: 'extra_services', type: 'jsonb', nullable: true })
  extraServices?: Record<string, any>; // { "baby_seat": true, "waiting_time": 30 }

  // Ödeme durumu
  @Column({ name: 'payment_status', type: 'varchar', length: 20, default: 'pending' })
  paymentStatus!: string; // pending, paid, refunded, failed

  @Column({ name: 'payment_method', type: 'varchar', length: 50, nullable: true })
  paymentMethod?: string; // cash, credit_card, bank_transfer, online

  @Column({ name: 'payment_type', type: 'varchar', length: 50, nullable: true })
  paymentType?: string; // full, deposit, pay_at_pickup

  @Column({ name: 'deposit_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  depositAmount?: number;

  /** Tahsilat: ofis / şoför / henüz tanımsız */
  @Column({ name: 'payment_collection_by', type: 'varchar', length: 20, default: 'pending' })
  paymentCollectionBy!: string;

  @Column({ name: 'driver_cash_confirmed_at', type: 'timestamp with time zone', nullable: true })
  driverCashConfirmedAt?: Date | null;

  @Column({ name: 'driver_cash_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  driverCashAmount?: number | null;

  @Column({ name: 'driver_cash_currency', type: 'varchar', length: 3, nullable: true })
  driverCashCurrency?: string | null;

  /** Şoför tahsilatları (nakit/kart/Stripe) rezervasyon para biriminde birikimli toplam */
  @Column({
    name: 'driver_cash_collected_total',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  driverCashCollectedTotal!: number;

  // Notlar
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'customer_notes', type: 'text', nullable: true })
  customerNotes?: string;
}

