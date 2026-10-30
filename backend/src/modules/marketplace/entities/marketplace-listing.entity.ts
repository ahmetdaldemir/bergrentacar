import { Column, Entity, JoinColumn, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

export enum ServiceType {
  TRANSFER = 'transfer',
  TOUR = 'tour',
  INSURANCE = 'insurance',
  VEHICLE_RENTAL = 'vehicle_rental',
  OTHER = 'other',
}

export enum CommissionType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
  HYBRID = 'hybrid', // Percentage + fixed
}

export enum ListingStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING_APPROVAL = 'pending_approval',
  REJECTED = 'rejected',
}

/**
 * Marketplace listings - services offered by tenants to other tenants
 */
@Entity({ name: 'marketplace_listings' })
@Index(['tenantId', 'status'])
@Index(['serviceType', 'status'])
@Index(['tenantId', 'serviceType'])
export class MarketplaceListing extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'service_type', type: 'enum', enum: ServiceType })
  serviceType!: ServiceType;

  // Commission structure
  @Column({ name: 'commission_type', type: 'enum', enum: CommissionType, default: CommissionType.PERCENTAGE })
  commissionType!: CommissionType;

  @Column({ name: 'commission_rate', type: 'decimal', precision: 5, scale: 2, nullable: true })
  commissionRate?: number | null; // Percentage (0-100)

  @Column({ name: 'commission_fixed', type: 'decimal', precision: 10, scale: 2, nullable: true })
  commissionFixed?: number | null; // Fixed amount

  @Column({ name: 'min_commission', type: 'decimal', precision: 10, scale: 2, nullable: true })
  minCommission?: number | null; // Minimum commission amount

  @Column({ name: 'max_commission', type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxCommission?: number | null; // Maximum commission amount

  // Pricing
  @Column({ name: 'base_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  basePrice?: number | null;

  @Column({ name: 'currency_code', type: 'varchar', length: 3, default: 'TRY' })
  currencyCode!: string;

  // Service configuration (JSON)
  @Column({ name: 'service_config', type: 'jsonb', nullable: true })
  serviceConfig?: Record<string, any> | null; // Service-specific settings

  // Availability
  @Column({ name: 'is_available', default: true })
  isAvailable!: boolean;

  @Column({ name: 'available_from', type: 'date', nullable: true })
  availableFrom?: Date | null;

  @Column({ name: 'available_to', type: 'date', nullable: true })
  availableTo?: Date | null;

  // Status
  @Column({ type: 'enum', enum: ListingStatus, default: ListingStatus.PENDING_APPROVAL })
  status!: ListingStatus;

  // Approval
  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt?: Date | null;

  @Column({ name: 'approved_by_user_id', type: 'uuid', nullable: true })
  approvedByUserId?: string | null;

  // Metadata
  @Column({ name: 'contact_email', type: 'varchar', length: 200, nullable: true })
  contactEmail?: string;

  @Column({ name: 'contact_phone', type: 'varchar', length: 50, nullable: true })
  contactPhone?: string;

  @Column({ name: 'terms_and_conditions', type: 'text', nullable: true })
  termsAndConditions?: string;

  // Statistics
  @Column({ name: 'total_bookings', type: 'int', default: 0 })
  totalBookings!: number;

  @Column({ name: 'total_revenue', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalRevenue!: number;

  @Column({ name: 'average_rating', type: 'decimal', precision: 3, scale: 2, nullable: true })
  averageRating?: number | null; // 0-5
}

