import { Column, Entity, JoinColumn, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Reservation } from '../../shared/entities/reservation.entity';

export enum PickupStatus {
  DRAFT = 'draft',
  COMPLETED = 'completed',
}

@Entity({ name: 'rental_pickups' })
@Index(['tenantId', 'reservationId'])
export class RentalPickup extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Reservation, { nullable: false })
  @JoinColumn({ name: 'reservation_id' })
  reservation!: Reservation;

  @Column({ name: 'reservation_id', type: 'uuid' })
  reservationId!: string;

  @Column({ name: 'odometer_km', type: 'decimal', precision: 10, scale: 2, nullable: true })
  odometerKm?: number | null;

  @Column({ name: 'fuel_level', type: 'varchar', length: 20, nullable: true })
  fuelLevel?: string | null; // 'full', '3/4', '1/2', '1/4', 'empty' or percentage

  @Column({ type: 'enum', enum: PickupStatus, default: PickupStatus.DRAFT })
  status!: PickupStatus;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt?: Date | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string | null; // User ID who created this pickup record
}

