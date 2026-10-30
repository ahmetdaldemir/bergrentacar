import { Column, Entity, JoinColumn, ManyToOne, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Vehicle } from './vehicle.entity';
import { VehicleTimelineMedia } from './vehicle-timeline-media.entity';

export enum MaintenanceType {
  OIL_CHANGE = 'oil_change',
  FILTER_REPLACEMENT = 'filter_replacement',
  TIRE_REPLACEMENT = 'tire_replacement',
  BRAKE_SERVICE = 'brake_service',
  BATTERY_REPLACEMENT = 'battery_replacement',
  ENGINE_SERVICE = 'engine_service',
  TRANSMISSION_SERVICE = 'transmission_service',
  INSPECTION = 'inspection',
  REPAIR = 'repair',
  OTHER = 'other',
}

export enum MaintenanceStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity({ name: 'vehicle_maintenances' })
@Index(['vehicleId', 'date'])
@Index(['tenantId', 'vehicleId'])
export class VehicleMaintenance extends BaseEntity {
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

  @Column({ type: 'date' })
  date!: Date;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: MaintenanceType, default: MaintenanceType.OTHER })
  type!: MaintenanceType;

  @Column({ type: 'enum', enum: MaintenanceStatus, default: MaintenanceStatus.SCHEDULED })
  status!: MaintenanceStatus;

  @Column({ name: 'cost', type: 'decimal', precision: 10, scale: 2, nullable: true })
  cost?: number;

  @Column({ name: 'currency_code', type: 'varchar', length: 3, default: 'EUR' })
  currencyCode!: string;

  @Column({ name: 'service_provider', type: 'varchar', length: 200, nullable: true })
  serviceProvider?: string;

  @Column({ name: 'odometer_reading', type: 'int', nullable: true })
  odometerReading?: number;

  @Column({ name: 'next_service_date', type: 'date', nullable: true })
  nextServiceDate?: Date;

  @Column({ name: 'next_service_odometer', type: 'int', nullable: true })
  nextServiceOdometer?: number;

  @Column({ name: 'performed_by', type: 'varchar', length: 120, nullable: true })
  performedBy?: string;

  @OneToMany(() => VehicleTimelineMedia, (media) => media.maintenance, { cascade: true })
  media!: VehicleTimelineMedia[];
}

