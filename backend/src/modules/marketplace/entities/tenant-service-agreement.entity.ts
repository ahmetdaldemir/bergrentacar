import { Column, Entity, JoinColumn, ManyToOne, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { MarketplaceListing } from './marketplace-listing.entity';

export enum AgreementStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  TERMINATED = 'terminated',
}

/**
 * Service agreements between tenants
 * Defines partnership terms and commission structure
 */
@Entity({ name: 'tenant_service_agreements' })
@Unique(['providerTenantId', 'consumerTenantId', 'listingId'])
@Index(['providerTenantId', 'status'])
@Index(['consumerTenantId', 'status'])
export class TenantServiceAgreement extends BaseEntity {
  // Provider: Tenant offering the service
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'provider_tenant_id' })
  providerTenant!: Tenant;

  @Column({ name: 'provider_tenant_id' })
  providerTenantId!: string;

  // Consumer: Tenant consuming the service
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'consumer_tenant_id' })
  consumerTenant!: Tenant;

  @Column({ name: 'consumer_tenant_id' })
  consumerTenantId!: string;

  // Listing reference
  @ManyToOne(() => MarketplaceListing, { nullable: false })
  @JoinColumn({ name: 'listing_id' })
  listing!: MarketplaceListing;

  @Column({ name: 'listing_id' })
  listingId!: string;

  // Agreement terms (can override listing defaults)
  @Column({ name: 'commission_type', type: 'varchar', length: 20, default: 'percentage' })
  commissionType!: string;

  @Column({ name: 'commission_rate', type: 'decimal', precision: 5, scale: 2, nullable: true })
  commissionRate?: number | null;

  @Column({ name: 'commission_fixed', type: 'decimal', precision: 10, scale: 2, nullable: true })
  commissionFixed?: number | null;

  @Column({ name: 'min_commission', type: 'decimal', precision: 10, scale: 2, nullable: true })
  minCommission?: number | null;

  @Column({ name: 'max_commission', type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxCommission?: number | null;

  // Status
  @Column({ type: 'enum', enum: AgreementStatus, default: AgreementStatus.PENDING })
  status!: AgreementStatus;

  @Column({ name: 'activated_at', type: 'timestamp', nullable: true })
  activatedAt?: Date | null;

  @Column({ name: 'suspended_at', type: 'timestamp', nullable: true })
  suspendedAt?: Date | null;

  @Column({ name: 'terminated_at', type: 'timestamp', nullable: true })
  terminatedAt?: Date | null;

  // Terms
  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate?: Date | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate?: Date | null;

  @Column({ name: 'auto_renew', default: false })
  autoRenew!: boolean;

  // Custom terms
  @Column({ name: 'custom_terms', type: 'text', nullable: true })
  customTerms?: string;

  // Approval
  @Column({ name: 'approved_by_provider', default: false })
  approvedByProvider!: boolean;

  @Column({ name: 'approved_by_consumer', default: false })
  approvedByConsumer!: boolean;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt?: Date | null;

  // Statistics
  @Column({ name: 'total_transactions', type: 'int', default: 0 })
  totalTransactions!: number;

  @Column({ name: 'total_commission_paid', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalCommissionPaid!: number;

  @Column({ name: 'total_commission_earned', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalCommissionEarned!: number;
}

