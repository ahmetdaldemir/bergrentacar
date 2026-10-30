import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Reservation } from './reservation.entity';

@Entity({ name: 'reservation_traffic_fines' })
export class ReservationTrafficFine extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Reservation, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reservation_id' })
  reservation!: Reservation;

  @Column({ name: 'reservation_id' })
  reservationId!: string;

  /** Ceza / ihlal tarihi (gün) */
  @Column({ name: 'fine_date', type: 'date' })
  fineDate!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: string;

  @Column({ name: 'currency_code', type: 'varchar', length: 3, default: 'TRY' })
  currencyCode!: string;

  @Column({ type: 'boolean', default: false })
  paid!: boolean;

  @Column({ name: 'paid_at', type: 'timestamp with time zone', nullable: true })
  paidAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  description?: string | null;
}
