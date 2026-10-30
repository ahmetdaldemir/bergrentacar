import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

export enum TransferRequestStatus {
  NEW = 'new',
  REVIEWED = 'reviewed',
  CONVERTED = 'converted',
  CANCELLED = 'cancelled',
}

export enum TransferRequestSource {
  WEB = 'web',
  MOBILE = 'mobile',
  API = 'api',
}

@Entity({ name: 'transfer_requests' })
export class TransferRequest extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @Column({ name: 'language_id', type: 'varchar', length: 16, nullable: true })
  languageId?: string | null;

  // Müşteri bilgileri
  @Column({ name: 'customer_name', type: 'varchar', length: 120 })
  customerName!: string;

  @Column({ name: 'customer_email', type: 'varchar', length: 160 })
  customerEmail!: string;

  @Column({ name: 'customer_phone', type: 'varchar', length: 32 })
  customerPhone!: string;

  @Column({ type: 'text', nullable: true })
  message?: string | null;

  // Alış noktası
  @Column({ name: 'pickup_location', type: 'varchar', length: 300 })
  pickupLocation!: string;

  @Column({ name: 'pickup_lat', type: 'decimal', precision: 10, scale: 6, nullable: true })
  pickupLat?: number | null;

  @Column({ name: 'pickup_lng', type: 'decimal', precision: 10, scale: 6, nullable: true })
  pickupLng?: number | null;

  // Bırakış noktası
  @Column({ name: 'dropoff_location', type: 'varchar', length: 300 })
  dropoffLocation!: string;

  @Column({ name: 'dropoff_lat', type: 'decimal', precision: 10, scale: 6, nullable: true })
  dropoffLat?: number | null;

  @Column({ name: 'dropoff_lng', type: 'decimal', precision: 10, scale: 6, nullable: true })
  dropoffLng?: number | null;

  @Column({ name: 'passenger_count', type: 'int', default: 1 })
  passengerCount!: number;

  @Column({ name: 'transfer_date', type: 'varchar', length: 32, nullable: true })
  transferDate?: string | null;

  // Rota bilgisi (Google Maps'ten gelen)
  @Column({ name: 'distance_m', type: 'int', nullable: true })
  distanceM?: number | null;

  @Column({ name: 'distance_text', type: 'varchar', length: 50, nullable: true })
  distanceText?: string | null;

  @Column({ name: 'duration_s', type: 'int', nullable: true })
  durationS?: number | null;

  @Column({ name: 'duration_text', type: 'varchar', length: 50, nullable: true })
  durationText?: string | null;

  @Column({
    type: 'enum',
    enum: TransferRequestStatus,
    default: TransferRequestStatus.NEW,
  })
  status!: TransferRequestStatus;

  @Column({
    type: 'enum',
    enum: TransferRequestSource,
    default: TransferRequestSource.WEB,
  })
  source!: TransferRequestSource;

  @Column({ name: 'requested_at', type: 'timestamp' })
  requestedAt!: Date;

  // Tenant notu (admin tarafından eklenebilir)
  @Column({ name: 'admin_note', type: 'text', nullable: true })
  adminNote?: string | null;
}
