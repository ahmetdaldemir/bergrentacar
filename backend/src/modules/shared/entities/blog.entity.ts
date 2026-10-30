import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Location } from '../../rentacar/entities/location.entity';

export enum BlogStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Entity({ name: 'blogs' })
export class Blog extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Location, { nullable: true })
  @JoinColumn({ name: 'location_id' })
  location?: Location | null;

  @Column({ name: 'location_id', nullable: true })
  locationId?: string | null;

  // title, content, slug are stored in translations table
  // No columns for these fields in blog entity

  @Column({ type: 'enum', enum: BlogStatus, default: BlogStatus.DRAFT })
  status!: BlogStatus;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  image?: string;
}
