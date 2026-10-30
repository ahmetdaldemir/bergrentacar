import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Customer } from './customer.entity';
import { WalletTransaction } from './wallet-transaction.entity';

/**
 * Customer wallet for ParaPuan (loyalty points)
 * One wallet per customer per tenant
 */
@Entity({ name: 'customer_wallets' })
@Index(['tenantId', 'customerId'], { unique: true })
@Index(['tenantId'])
@Index(['customerId'])
export class CustomerWallet extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Customer, { nullable: false })
  @JoinColumn({ name: 'customer_id' })
  customer!: Customer;

  @Column({ name: 'customer_id' })
  customerId!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance!: number; // Current ParaPuan balance

  @Column({ name: 'total_earned', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalEarned!: number; // Lifetime points earned

  @Column({ name: 'total_spent', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalSpent!: number; // Lifetime points spent

  @OneToMany(() => WalletTransaction, (transaction) => transaction.wallet)
  transactions!: WalletTransaction[];
}

