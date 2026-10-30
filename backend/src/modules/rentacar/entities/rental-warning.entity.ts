import { Column, Entity, JoinColumn, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Reservation } from '../../shared/entities/reservation.entity';

export enum WarningType {
  KM_OVER_LIMIT = 'KM_OVER_LIMIT',
  FUEL_MISMATCH = 'FUEL_MISMATCH',
}

@Entity({ name: 'rental_warnings' })
@Index(['tenantId', 'reservationId'])
export class RentalWarning extends BaseEntity {
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

  @Column({ type: 'enum', enum: WarningType })
  type!: WarningType;

  @Column({ type: 'text' })
  message!: string;

  @Column({ name: 'payload_json', type: 'jsonb', nullable: true })
  payloadJson?: Record<string, unknown> | null; // { km_diff, pickup_km, return_km, pickup_fuel, return_fuel }

  @Column({ name: 'acknowledged_by', type: 'uuid', nullable: true })
  acknowledgedBy?: string | null; // User ID who acknowledged

  @Column({ name: 'acknowledged_at', type: 'timestamp', nullable: true })
  acknowledgedAt?: Date | null;
}

