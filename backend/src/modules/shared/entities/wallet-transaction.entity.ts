import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { CustomerWallet } from './customer-wallet.entity';
import { Reservation } from './reservation.entity';

export enum WalletTransactionType {
  CREDIT = 'credit', // Points added
  DEBIT = 'debit', // Points deducted
}

export enum WalletTransactionSource {
  RESERVATION_COMPLETION = 'reservation_completion', // Automatic from reservation
  ADMIN_ADJUSTMENT = 'admin_adjustment', // Manual admin action
  COUPON_GENERATION = 'coupon_generation', // Points converted to coupon
  REFUND = 'refund', // Refunded points
  EXPIRY = 'expiry', // Expired points
}

/**
 * Wallet transaction ledger for audit trail
 * Every credit/debit is recorded here
 */
@Entity({ name: 'wallet_transactions' })
@Index(['walletId', 'createdAt'])
@Index(['tenantId', 'createdAt'])
@Index(['reservationId'])
@Index(['transactionId'], { unique: true }) // For idempotency
export class WalletTransaction extends BaseEntity {
  @ManyToOne(() => CustomerWallet, { nullable: false })
  @JoinColumn({ name: 'wallet_id' })
  wallet!: CustomerWallet;

  @Column({ name: 'wallet_id' })
  walletId!: string;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @Column({ name: 'customer_id' })
  customerId!: string;

  @Column({ type: 'enum', enum: WalletTransactionType })
  type!: WalletTransactionType;

  @Column({ type: 'enum', enum: WalletTransactionSource })
  source!: WalletTransactionSource;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number; // Positive amount (credit or debit)

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  balanceBefore!: number; // Balance before this transaction

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  balanceAfter!: number; // Balance after this transaction

  @Column({ type: 'text', nullable: true })
  description?: string | null; // Human-readable description

  @Column({ name: 'reason', type: 'text', nullable: true })
  reason?: string | null; // Reason for admin adjustment

  @Column({ name: 'admin_user_id', type: 'uuid', nullable: true })
  adminUserId?: string | null; // Admin who made the adjustment

  @ManyToOne(() => Reservation, { nullable: true })
  @JoinColumn({ name: 'reservation_id' })
  reservation?: Reservation | null;

  @Column({ name: 'reservation_id', nullable: true })
  reservationId?: string | null;

  @Column({ name: 'transaction_id', type: 'varchar', length: 100, nullable: true, unique: true })
  transactionId?: string | null; // For idempotency (e.g., reservation_id + source)
}

