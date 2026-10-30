import { Column, Entity, JoinColumn, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { TenantServiceAgreement } from './tenant-service-agreement.entity';
import { Reservation } from '../../shared/entities/reservation.entity';

export enum TransactionType {
  COMMISSION_EARNED = 'commission_earned', // Provider earns commission
  COMMISSION_PAID = 'commission_paid', // Consumer pays commission
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSED = 'processed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Commission transactions - traceable financial records
 */
@Entity({ name: 'commission_transactions' })
@Index(['providerTenantId', 'status'])
@Index(['consumerTenantId', 'status'])
@Index(['agreementId'])
@Index(['reservationId'])
@Index(['transactionDate'])
export class CommissionTransaction extends BaseEntity {
  // Provider: Tenant earning commission
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'provider_tenant_id' })
  providerTenant!: Tenant;

  @Column({ name: 'provider_tenant_id' })
  providerTenantId!: string;

  // Consumer: Tenant paying commission
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'consumer_tenant_id' })
  consumerTenant!: Tenant;

  @Column({ name: 'consumer_tenant_id' })
  consumerTenantId!: string;

  // Agreement reference
  @ManyToOne(() => TenantServiceAgreement, { nullable: false })
  @JoinColumn({ name: 'agreement_id' })
  agreement!: TenantServiceAgreement;

  @Column({ name: 'agreement_id' })
  agreementId!: string;

  // Reservation reference (if applicable)
  @ManyToOne(() => Reservation, { nullable: true })
  @JoinColumn({ name: 'reservation_id' })
  reservation?: Reservation | null;

  @Column({ name: 'reservation_id', nullable: true })
  reservationId?: string | null;

  // Transaction details
  @Column({ type: 'enum', enum: TransactionType })
  type!: TransactionType;

  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.PENDING })
  status!: TransactionStatus;

  // Amounts
  @Column({ name: 'transaction_amount', type: 'decimal', precision: 10, scale: 2 })
  transactionAmount!: number; // Original transaction amount

  @Column({ name: 'commission_amount', type: 'decimal', precision: 10, scale: 2 })
  commissionAmount!: number; // Commission calculated

  @Column({ name: 'currency_code', type: 'varchar', length: 3, default: 'TRY' })
  currencyCode!: string;

  // Commission calculation details
  @Column({ name: 'commission_type', type: 'varchar', length: 20 })
  commissionType!: string;

  @Column({ name: 'commission_rate', type: 'decimal', precision: 5, scale: 2, nullable: true })
  commissionRate?: number | null;

  @Column({ name: 'commission_fixed', type: 'decimal', precision: 10, scale: 2, nullable: true })
  commissionFixed?: number | null;

  // Dates
  @Column({ name: 'transaction_date', type: 'date' })
  transactionDate!: Date;

  @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
  processedAt?: Date | null;

  // Description
  @Column({ type: 'text', nullable: true })
  description?: string;

  // Reference numbers
  @Column({ name: 'reference_number', type: 'varchar', length: 100, nullable: true })
  referenceNumber?: string;

  @Column({ name: 'external_reference', type: 'varchar', length: 200, nullable: true })
  externalReference?: string;

  // Metadata
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata?: Record<string, any> | null;
}

