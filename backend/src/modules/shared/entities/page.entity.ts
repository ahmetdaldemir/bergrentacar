import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity({ name: 'pages' })
export class Page extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @Column({ length: 100 })
  category!: string; // e.g., 'kurumsal', 'destek'

  @Column({ type: 'simple-array', nullable: true })
  images?: string[]; // Array of image URLs
}

