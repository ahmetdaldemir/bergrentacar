import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { ManyToOne, JoinColumn } from 'typeorm';

export enum FinanceCariKind {
  PERSON = 'PERSON',
  COMPANY = 'COMPANY',
}

@Entity({ name: 'finance_cariler' })
@Index(['tenantId', 'code'])
@Index(['tenantId', 'title'])
@Index(['tenantId', 'linkedCustomerId'])
export class FinanceCari extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  code?: string | null;

  @Column({ type: 'varchar', length: 160 })
  title!: string;

  @Column({ type: 'enum', enum: FinanceCariKind, default: FinanceCariKind.PERSON })
  kind!: FinanceCariKind;

  @Column({ name: 'tax_no', type: 'varchar', length: 32, nullable: true })
  taxNo?: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone?: string | null;

  @Column({ type: 'varchar', length: 140, nullable: true })
  email?: string | null;

  @Column({ type: 'text', nullable: true })
  address?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ name: 'linked_customer_id', type: 'uuid', nullable: true })
  linkedCustomerId?: string | null; // Reference to customers table (read-only link, no FK)

  @Column({ name: 'balance_opening', type: 'numeric', precision: 14, scale: 2, default: 0 })
  balanceOpening!: number;

  @Column({ type: 'varchar', length: 3, default: 'TRY' })
  currency!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}

