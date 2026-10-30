import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

export enum FinanceCategoryType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

@Entity({ name: 'finance_categories' })
@Unique(['tenantId', 'type', 'name', 'parentId'])
@Index(['tenantId', 'type'])
@Index(['tenantId', 'parentId'])
export class FinanceCategory extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'enum', enum: FinanceCategoryType })
  type!: FinanceCategoryType;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @ManyToOne(() => FinanceCategory, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent?: FinanceCategory | null;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId?: string | null;

  @Column({ type: 'varchar', length: 24, nullable: true })
  color?: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'int', default: 0 })
  sort!: number;
}

