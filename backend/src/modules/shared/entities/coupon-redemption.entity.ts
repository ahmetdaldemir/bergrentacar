import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Coupon } from './coupon.entity';
import { Reservation } from './reservation.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

/**
 * Coupon redemption audit log
 * Tracks every coupon usage for security and analytics
 */
@Entity({ name: 'coupon_redemptions' })
@Index(['couponId'])
@Index(['reservationId'])
@Index(['tenantId', 'createdAt'])
@Index(['ipAddress'])
export class CouponRedemption extends BaseEntity {
  @ManyToOne(() => Coupon, { nullable: false })
  @JoinColumn({ name: 'coupon_id' })
  coupon!: Coupon;

  @Column({ name: 'coupon_id' })
  couponId!: string;

  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Reservation, { nullable: true })
  @JoinColumn({ name: 'reservation_id' })
  reservation?: Reservation | null;

  @Column({ name: 'reservation_id', nullable: true })
  reservationId?: string | null;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 10, scale: 2 })
  discountAmount!: number; // Actual discount applied

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress?: string | null; // IPv4 or IPv6

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string | null;

  @Column({ name: 'is_successful', default: true })
  isSuccessful!: boolean; // false if validation failed

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason?: string | null; // Reason if validation failed
}

