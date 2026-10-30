import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { TransferRoute } from './transfer-route.entity';

export enum RoutePointType {
  AIRPORT = 'airport',
  HOTEL = 'hotel',
  CITY_CENTER = 'city_center',
  ADDRESS = 'address',
  LANDMARK = 'landmark',
}

@Entity({ name: 'transfer_route_points' })
export class TransferRoutePoint extends BaseEntity {
  @ManyToOne(() => TransferRoute, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'route_id' })
  route!: TransferRoute;

  @Column({ name: 'route_id' })
  routeId!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string; // "IST Havalimanı", "Marmaris Otel", vb.

  @Column({ type: 'enum', enum: RoutePointType })
  type!: RoutePointType;

  @Column({ type: 'varchar', length: 300, nullable: true })
  address?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  latitude?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  longitude?: string;

  @Column({ name: 'is_pickup', default: true })
  isPickup!: boolean; // true = Çıkış Noktası, false = Varış Noktası

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;
}

