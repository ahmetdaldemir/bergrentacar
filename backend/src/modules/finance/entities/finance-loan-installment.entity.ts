import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { FinanceLoan } from './finance-loan.entity';

export enum FinanceLoanInstallmentStatus {
  PLANNED = 'PLANNED',
  DUE = 'DUE',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

@Entity({ name: 'finance_loan_installments' })
@Unique(['tenantId', 'loanId', 'installmentNo'])
@Index(['tenantId', 'loanId'])
@Index(['tenantId', 'dueDate', 'status'])
export class FinanceLoanInstallment extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => FinanceLoan, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'loan_id' })
  loan!: FinanceLoan;

  @Column({ name: 'loan_id', type: 'uuid' })
  loanId!: string;

  @Column({ name: 'installment_no', type: 'int' })
  installmentNo!: number;

  @Column({ name: 'due_date', type: 'date' })
  dueDate!: Date;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 3, default: 'TRY' })
  currency!: string;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt?: Date | null;

  @Column({ name: 'paid_amount', type: 'numeric', precision: 14, scale: 2, nullable: true })
  paidAmount?: number | null;

  @Column({ type: 'enum', enum: FinanceLoanInstallmentStatus, default: FinanceLoanInstallmentStatus.PLANNED })
  status!: FinanceLoanInstallmentStatus;

  @Column({ name: 'reminder_sent_at', type: 'timestamp', nullable: true })
  reminderSentAt?: Date | null;
}

