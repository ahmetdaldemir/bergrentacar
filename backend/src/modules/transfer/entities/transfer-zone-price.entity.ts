import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { TransferZone } from './transfer-zone.entity';
import { TransferVehicle } from './transfer-vehicle.entity';

@Entity('transfer_zone_prices')
export class TransferZonePrice {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'from_zone_id', type: 'uuid' })
  fromZoneId!: string;

  @ManyToOne(() => TransferZone)
  @JoinColumn({ name: 'from_zone_id' })
  fromZone!: TransferZone;

  @Column({ name: 'to_zone_id', type: 'uuid' })
  toZoneId!: string;

  @ManyToOne(() => TransferZone)
  @JoinColumn({ name: 'to_zone_id' })
  toZone!: TransferZone;

  @Column({ name: 'vehicle_id', type: 'uuid', nullable: true })
  vehicleId?: string;

  @ManyToOne(() => TransferVehicle, { nullable: true })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle?: TransferVehicle;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: number;

  @Column({ type: 'varchar', length: 20, default: 'between', name: 'price_type' })
  priceType!: string;

  @Column({ type: 'varchar', length: 3, default: 'EUR', name: 'currency_code' })
  currencyCode!: string;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'deleted_at' })
  deletedAt?: Date;
}

