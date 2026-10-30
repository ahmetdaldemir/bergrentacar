import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { TransferDiscountCode } from './transfer-discount-code.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

/**
 * İndirim kodu kullanım kaydı — her kullanım (başarılı/başarısız) loglanır
 */
@Entity({ name: 'transfer_discount_code_usages' })
@Index(['discountCodeId'])
@Index(['tenantId', 'createdAt'])
export class TransferDiscountCodeUsage extends BaseEntity {
  @ManyToOne(() => TransferDiscountCode, { nullable: false })
  @JoinColumn({ name: 'discount_code_id' })
  discountCode!: TransferDiscountCode;

  @Column({ name: 'discount_code_id' })
  discountCodeId!: string;

  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  /** Bağlantılı rezervasyon ID'si (varsa) */
  @Column({ name: 'transfer_request_id', type: 'uuid', nullable: true })
  transferRequestId?: string | null;

  /** Uygulanan gerçek indirim tutarı */
  @Column({ name: 'discount_amount', type: 'decimal', precision: 10, scale: 2 })
  discountAmount!: number;

  /** Rezervasyonun orijinal toplam tutarı */
  @Column({ name: 'order_total', type: 'decimal', precision: 10, scale: 2, nullable: true })
  orderTotal?: number | null;

  @Column({ name: 'customer_email', type: 'varchar', length: 160, nullable: true })
  customerEmail?: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress?: string | null;

  @Column({ name: 'is_successful', type: 'boolean', default: true })
  isSuccessful!: boolean;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason?: string | null;
}
