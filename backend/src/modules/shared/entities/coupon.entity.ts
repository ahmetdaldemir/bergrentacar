import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Customer } from './customer.entity';

export enum CouponStatus {
  ACTIVE = 'active',
  USED = 'used',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

/**
 * Coupon codes generated from ParaPuan
 */
@Entity({ name: 'coupons' })
@Index(['tenantId', 'code'], { unique: true })
@Index(['tenantId', 'status'])
@Index(['customerId'])
@Index(['code'])
export class Coupon extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code!: string; // Unique coupon code

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  value!: number; // Discount amount

  @Column({ name: 'currency_code', type: 'varchar', length: 3, default: 'TRY' })
  currencyCode!: string;

  @Column({ name: 'points_used', type: 'decimal', precision: 10, scale: 2 })
  pointsUsed!: number; // ParaPuan amount used to generate this coupon

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate?: Date | null;

  @Column({ name: 'is_single_use', default: true })
  isSingleUse!: boolean;

  @Column({ name: 'is_used', default: false })
  isUsed!: boolean;

  @Column({ type: 'enum', enum: CouponStatus, default: CouponStatus.ACTIVE })
  status!: CouponStatus;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer | null;

  @Column({ name: 'customer_id', nullable: true })
  customerId?: string | null; // Optional customer binding

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId?: string | null; // Admin who created the coupon

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string | null;
}

