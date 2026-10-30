import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { TenantHotel, HotelSourceType } from './tenant-hotel.entity';
import { HotelRoomType } from './hotel-room-type.entity';
import { HotelContract } from './hotel-contract.entity';

export enum HotelReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export enum HotelPaymentStatus {
  UNPAID = 'unpaid',
  PARTIAL = 'partial',
  PAID = 'paid',
}

@Entity({ name: 'hotel_reservations' })
export class HotelReservation extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @Column({ unique: true, length: 30 })
  reference!: string;

  @ManyToOne(() => TenantHotel, { nullable: false })
  @JoinColumn({ name: 'hotel_id' })
  hotel!: TenantHotel;

  @Column({ name: 'hotel_id' })
  hotelId!: string;

  @ManyToOne(() => HotelRoomType, { nullable: false })
  @JoinColumn({ name: 'room_type_id' })
  roomType!: HotelRoomType;

  @Column({ name: 'room_type_id' })
  roomTypeId!: string;

  @ManyToOne(() => HotelContract, { nullable: true })
  @JoinColumn({ name: 'contract_id' })
  contract?: HotelContract | null;

  @Column({ name: 'contract_id', type: 'varchar', nullable: true })
  contractId?: string | null;

  @Column({ name: 'channel_manager_booking_id', type: 'varchar', nullable: true, length: 100 })
  channelManagerBookingId?: string | null;

  @Column({ name: 'source_type', type: 'enum', enum: HotelSourceType, default: HotelSourceType.MANUAL })
  sourceType!: HotelSourceType;

  @Column({ name: 'customer_name', length: 200 })
  customerName!: string;

  @Column({ name: 'customer_email', type: 'varchar', length: 200, nullable: true })
  customerEmail?: string | null;

  @Column({ name: 'customer_phone', type: 'varchar', length: 50, nullable: true })
  customerPhone?: string | null;

  @Column({ name: 'check_in', type: 'date' })
  checkIn!: Date;

  @Column({ name: 'check_out', type: 'date' })
  checkOut!: Date;

  @Column({ name: 'number_of_rooms', type: 'int', default: 1 })
  numberOfRooms!: number;

  @Column({ name: 'number_of_guests', type: 'int', default: 1 })
  numberOfGuests!: number;

  @Column({ name: 'total_price', type: 'decimal', precision: 10, scale: 2 })
  totalPrice!: number;

  @Column({ name: 'currency_code', length: 3, default: 'EUR' })
  currencyCode!: string;

  @Column({ name: 'status', type: 'enum', enum: HotelReservationStatus, default: HotelReservationStatus.PENDING })
  status!: HotelReservationStatus;

  @Column({ name: 'payment_status', type: 'enum', enum: HotelPaymentStatus, default: HotelPaymentStatus.UNPAID })
  paymentStatus!: HotelPaymentStatus;

  @Column({ name: 'payment_method', type: 'varchar', length: 50, nullable: true })
  paymentMethod?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> | null;
}
