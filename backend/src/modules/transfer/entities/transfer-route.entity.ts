import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { TransferRoutePoint } from './transfer-route-point.entity';
import { TransferPricing } from './transfer-pricing.entity';
import { TransferReservation } from './transfer-reservation.entity';

export enum TransferRouteType {
  AIRPORT_TO_HOTEL = 'airport_to_hotel',
  HOTEL_TO_AIRPORT = 'hotel_to_airport',
  CITY_TO_CITY = 'city_to_city',
  INTRA_CITY = 'intra_city',
  CUSTOM = 'custom',
}

@Entity({ name: 'transfer_routes' })
export class TransferRoute extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string; // "IST → Marmaris", "Antalya → Alanya", vb.

  @Column({ type: 'enum', enum: TransferRouteType })
  type!: TransferRouteType;

  @OneToMany(() => TransferRoutePoint, (point) => point.route, { cascade: true })
  points!: TransferRoutePoint[];

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  distance?: number; // km

  @Column({ name: 'average_duration_minutes', type: 'int', nullable: true })
  averageDurationMinutes?: number; // Ortalama süre (dakika)

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;


  @OneToMany(() => TransferReservation, (reservation) => reservation.route)
  reservations!: TransferReservation[];
}

