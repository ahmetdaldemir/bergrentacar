import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Location } from '../../rentacar/entities/location.entity';

@Entity({ name: 'destinations' })
export class Destination extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId?: string;

  @ManyToOne(() => Location, { nullable: true })
  @JoinColumn({ name: 'rentacar_location_id' })
  rentacarLocation?: Location;

  @Column({ name: 'rentacar_location_id', nullable: true })
  rentacarLocationId?: string;

  @Column({ type: 'text', nullable: true })
  image?: string;

  @Column({ name: 'is_featured', default: false })
  isFeatured!: boolean;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;
}
