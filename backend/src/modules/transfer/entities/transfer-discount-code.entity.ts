import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

export enum DiscountType {
  PERCENTAGE = 'percentage', // Yüzde indirim (%10 gibi)
  FIXED = 'fixed',           // Sabit tutar indirimi (50 EUR gibi)
}

export enum DiscountCodeStatus {
  ACTIVE = 'active',
  USED = 'used',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Entity({ name: 'transfer_discount_codes' })
@Index(['tenantId', 'code'], { unique: true })
@Index(['tenantId', 'status'])
@Index(['code'])
export class TransferDiscountCode extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  /** İndirim kodu — otomatik veya manuel oluşturulur */
  @Column({ type: 'varchar', length: 50 })
  code!: string;

  @Column({
    name: 'discount_type',
    type: 'enum',
    enum: DiscountType,
    default: DiscountType.FIXED,
  })
  discountType!: DiscountType;

  /**
   * İndirim değeri:
   *   - PERCENTAGE ise: 0–100 arası yüzde (örn: 15 → %15)
   *   - FIXED ise: para birimi cinsinden tutar (örn: 50)
   */
  @Column({ name: 'discount_value', type: 'decimal', precision: 10, scale: 2 })
  discountValue!: number;

  /** FIXED tipinde kullanılacak para birimi kodu */
  @Column({ name: 'currency_code', type: 'varchar', length: 10, default: 'EUR' })
  currencyCode!: string;

  /** PERCENTAGE tipinde: maksimum indirim tutarı (opsiyonel üst limit) */
  @Column({ name: 'max_discount_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxDiscountAmount?: number | null;

  /** Minimum sipariş tutarı (bu tutarın altındaki rezervasyonlara uygulanmaz) */
  @Column({ name: 'min_order_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  minOrderAmount?: number | null;

  /** Bu kod belirli bir müşteriye tahsis edilmişse e-postası */
  @Column({ name: 'customer_email', type: 'varchar', length: 160, nullable: true })
  customerEmail?: string | null;

  /** Müşteri adı (bilgi amaçlı) */
  @Column({ name: 'customer_name', type: 'varchar', length: 120, nullable: true })
  customerName?: string | null;

  /** Son geçerlilik tarihi */
  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt?: Date | null;

  @Column({ type: 'enum', enum: DiscountCodeStatus, default: DiscountCodeStatus.ACTIVE })
  status!: DiscountCodeStatus;

  @Column({ name: 'is_used', type: 'boolean', default: false })
  isUsed!: boolean;

  @Column({ name: 'used_at', type: 'timestamp', nullable: true })
  usedAt?: Date | null;

  /** Admin notu */
  @Column({ type: 'text', nullable: true })
  description?: string | null;

  /** Kodu oluşturan admin kullanıcısı */
  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId?: string | null;
}
