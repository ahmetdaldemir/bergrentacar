import { Column, Entity, JoinColumn, ManyToOne, Index, Unique, DeleteDateColumn } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { MasterLocation } from '../../shared/entities/master-location.entity';

@Entity({ name: 'rentacar_locations' })
@Index(['tenantId', 'locationId'])
@Index(['tenantId', 'isActive'])
@Unique(['tenantId', 'locationId'])
export class Location extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => MasterLocation, { nullable: false })
  @JoinColumn({ name: 'location_id' })
  location!: MasterLocation;

  @Column({ name: 'location_id' })
  locationId!: string;

  @Column({ name: 'meta_title', length: 200, nullable: true })
  metaTitle?: string;

  @Column({ type: 'int', default: 0 })
  sort!: number;

  @Column({ name: 'delivery_fee', type: 'decimal', precision: 10, scale: 2, default: 0 })
  deliveryFee!: number;

  @Column({ name: 'drop_fee', type: 'decimal', precision: 10, scale: 2, default: 0 })
  dropFee!: number;

  @Column({ name: 'min_day_count', type: 'int', nullable: true })
  minDayCount?: number;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date | null;
}

