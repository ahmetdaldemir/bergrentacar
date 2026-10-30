import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Customer } from './customer.entity';

@Entity({ name: 'customer_emails' })
export class CustomerEmail extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Customer, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer | null;

  @Column({ name: 'customer_id', nullable: true })
  customerId?: string | null;

  @Column({ length: 160 })
  email!: string;

  @Column({ name: 'first_name', length: 100, nullable: true })
  firstName?: string;

  @Column({ name: 'last_name', length: 100, nullable: true })
  lastName?: string;

  @Column({ name: 'full_name', length: 200, nullable: true })
  fullName?: string;

  @Column({ name: 'is_subscribed', default: true })
  isSubscribed!: boolean; // Email marketing'e abone mi?

  @Column({ name: 'subscription_date', type: 'timestamp', nullable: true })
  subscriptionDate?: Date;

  @Column({ name: 'unsubscription_date', type: 'timestamp', nullable: true })
  unsubscriptionDate?: Date;

  @Column({ name: 'unsubscription_reason', type: 'text', nullable: true })
  unsubscriptionReason?: string;

  @Column({ name: 'email_verified', default: false })
  emailVerified!: boolean; // Email doğrulandı mı?

  @Column({ name: 'verification_token', length: 255, nullable: true })
  verificationToken?: string;

  @Column({ name: 'verification_date', type: 'timestamp', nullable: true })
  verificationDate?: Date;

  @Column({ name: 'bounce_count', default: 0 })
  bounceCount!: number; // Bounce sayısı

  @Column({ name: 'last_bounce_date', type: 'timestamp', nullable: true })
  lastBounceDate?: Date;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>; // Ek bilgiler (tags, segments, vs.)
}

