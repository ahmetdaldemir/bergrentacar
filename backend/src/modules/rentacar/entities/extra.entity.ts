import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

export enum ExtraSalesType {
  DAILY = 'daily',
  PER_RENTAL = 'per_rental',
}

@Entity({ name: 'rentacar_extras' })
export class Extra extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @Column({ length: 200 })
  name!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price!: number;

  @Column({ name: 'currency_code', length: 3, default: 'TRY' })
  currencyCode!: string;

  @Column({ name: 'is_mandatory', default: false })
  isMandatory!: boolean;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'sales_type', type: 'enum', enum: ExtraSalesType, default: ExtraSalesType.DAILY })
  salesType!: ExtraSalesType;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'image_url', length: 500, nullable: true })
  imageUrl?: string;
}

