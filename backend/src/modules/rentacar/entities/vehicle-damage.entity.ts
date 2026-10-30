import { Column, Entity, JoinColumn, ManyToOne, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Vehicle } from './vehicle.entity';
import { Reservation } from '../../shared/entities/reservation.entity';
import { VehicleTimelineMedia } from './vehicle-timeline-media.entity';

export enum DamageSeverity {
  MINOR = 'minor',
  MODERATE = 'moderate',
  MAJOR = 'major',
  CRITICAL = 'critical',
}

export enum DamageStatus {
  REPORTED = 'reported',
  INSPECTED = 'inspected',
  REPAIRED = 'repaired',
  WRITTEN_OFF = 'written_off',
}

@Entity({ name: 'vehicle_damages' })
@Index(['vehicleId', 'date'])
@Index(['tenantId', 'vehicleId'])
export class VehicleDamage extends BaseEntity {
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

  @Column({ type: 'enum', enum: DamageSeverity, default: DamageSeverity.MINOR })
  severity!: DamageSeverity;

  @Column({ type: 'enum', enum: DamageStatus, default: DamageStatus.REPORTED })
  status!: DamageStatus;

  @Column({ name: 'repair_cost', type: 'decimal', precision: 10, scale: 2, nullable: true })
  repairCost?: number;

  @Column({ name: 'currency_code', type: 'varchar', length: 3, default: 'EUR' })
  currencyCode!: string;

  @Column({ name: 'reported_by', type: 'varchar', length: 120, nullable: true })
  reportedBy?: string;

  @Column({ name: 'repaired_at', type: 'timestamp', nullable: true })
  repairedAt?: Date | null;

  @OneToMany(() => VehicleTimelineMedia, (media) => media.damage, { cascade: true })
  media!: VehicleTimelineMedia[];
}

