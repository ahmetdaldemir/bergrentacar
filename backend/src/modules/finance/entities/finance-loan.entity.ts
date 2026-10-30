import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { FinanceCari } from './finance-cari.entity';

export enum FinanceLoanStatus {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

@Entity({ name: 'finance_loans' })
@Index(['tenantId', 'status'])
@Index(['tenantId', 'startDate'])
@Index(['tenantId', 'cariId'])
export class FinanceLoan extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => FinanceCari, { nullable: true })
  @JoinColumn({ name: 'cari_id' })
  cari?: FinanceCari | null;

  @Column({ name: 'cari_id', type: 'uuid', nullable: true })
  cariId?: string | null;

  @Column({ type: 'varchar', length: 160 })
  title!: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  principal!: number;

  @Column({ name: 'interest_rate', type: 'numeric', precision: 6, scale: 3, nullable: true })
  interestRate?: number | null;

  @Column({ name: 'total_cost', type: 'numeric', precision: 14, scale: 2, nullable: true })
  totalCost?: number | null;

  @Column({ type: 'varchar', length: 3, default: 'TRY' })
  currency!: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: Date;

  @Column({ name: 'payment_day', type: 'int' })
  paymentDay!: number; // 1..28

  @Column({ name: 'term_count', type: 'int' })
  termCount!: number;

  @Column({ type: 'enum', enum: FinanceLoanStatus, default: FinanceLoanStatus.ACTIVE })
  status!: FinanceLoanStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;
}

