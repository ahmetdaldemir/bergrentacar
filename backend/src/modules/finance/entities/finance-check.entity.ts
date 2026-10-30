import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { FinanceCari } from './finance-cari.entity';

export enum FinanceCheckDirection {
  RECEIVABLE = 'RECEIVABLE',
  PAYABLE = 'PAYABLE',
}

export enum FinanceCheckStatus {
  IN_PORTFOLIO = 'IN_PORTFOLIO',
  ENDORSED = 'ENDORSED',
  COLLECTED = 'COLLECTED',
  PAID = 'PAID',
  RETURNED = 'RETURNED',
  CANCELLED = 'CANCELLED',
}

@Entity({ name: 'finance_checks' })
@Index(['tenantId', 'maturityDate'])
@Index(['tenantId', 'status'])
@Index(['tenantId', 'direction'])
@Index(['tenantId', 'cariId'])
export class FinanceCheck extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'enum', enum: FinanceCheckDirection })
  direction!: FinanceCheckDirection;

  @ManyToOne(() => FinanceCari, { nullable: true })
  @JoinColumn({ name: 'cari_id' })
  cari?: FinanceCari | null;

  @Column({ name: 'cari_id', type: 'uuid', nullable: true })
  cariId?: string | null;

  @Column({ name: 'check_no', type: 'varchar', length: 80, nullable: true })
  checkNo?: string | null;

  @Column({ name: 'bank_name', type: 'varchar', length: 120, nullable: true })
  bankName?: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  issuer?: string | null;

  @Column({ name: 'issue_date', type: 'date', nullable: true })
  issueDate?: Date | null;

  @Column({ name: 'maturity_date', type: 'date' })
  maturityDate!: Date;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 3, default: 'TRY' })
  currency!: string;

  @Column({ type: 'enum', enum: FinanceCheckStatus, default: FinanceCheckStatus.IN_PORTFOLIO })
  status!: FinanceCheckStatus;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'attachment_url', type: 'text', nullable: true })
  attachmentUrl?: string | null;

  @Column({ name: 'reminder_sent_at', type: 'timestamp', nullable: true })
  reminderSentAt?: Date | null;
}

