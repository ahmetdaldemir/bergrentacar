import { Column, Entity, JoinColumn, ManyToOne, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Vehicle } from './vehicle.entity';
import { Reservation } from '../../shared/entities/reservation.entity';
import { VehicleTimelineMedia } from './vehicle-timeline-media.entity';

export enum PenaltyType {
  HGS = 'hgs', // Highway toll system
  TRAFFIC_FINE = 'traffic_fine',
  PARKING_FINE = 'parking_fine',
  SPEEDING_FINE = 'speeding_fine',
  OTHER = 'other',
}

export enum PenaltyStatus {
  PENDING = 'pending',
  PAID = 'paid',
  CONTESTED = 'contested',
  WAIVED = 'waived',
}

@Entity({ name: 'vehicle_penalties' })
@Index(['vehicleId', 'date'])
@Index(['tenantId', 'vehicleId'])
export class VehiclePenalty extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Vehicle, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: Vehicle;

  @Column({ name: 'vehicle_id' })
  vehicleId!: string;

  @ManyToOne(() => Reservation, { nullable: true })
  @JoinColumn({ name: 'reservation_id' })
  reservation?: Reservation | null;

  @Column({ name: 'reservation_id', nullable: true })
  reservationId?: string | null;

  @Column({ type: 'date' })
  date!: Date;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: PenaltyType, default: PenaltyType.OTHER })
  type!: PenaltyType;

  @Column({ type: 'enum', enum: PenaltyStatus, default: PenaltyStatus.PENDING })
  status!: PenaltyStatus;

  @Column({ name: 'amount', type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ name: 'currency_code', type: 'varchar', length: 3, default: 'EUR' })
  currencyCode!: string;

  @Column({ name: 'fine_number', type: 'varchar', length: 100, nullable: true })
  fineNumber?: string;

  @Column({ name: 'location', type: 'varchar', length: 200, nullable: true })
  location?: string;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt?: Date | null;

  @Column({ name: 'paid_by', type: 'varchar', length: 120, nullable: true })
  paidBy?: string;

  @OneToMany(() => VehicleTimelineMedia, (media) => media.penalty, { cascade: true })
  media!: VehicleTimelineMedia[];
}

