import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

export enum TransferExtraChargeType {
  PER_BOOKING = 'per_booking', // Rezervasyon başına sabit ücret
  PER_PERSON = 'per_person',   // Yolcu başına ücret
  PER_DAY = 'per_day',         // Gün başına ücret
}

@Entity({ name: 'transfer_extra_products' })
export class TransferExtraProduct extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  /** Varsayılan (fallback) ad — çeviri bulunamazsa kullanılır */
  @Column({ type: 'varchar', length: 200 })
  name!: string;

  /** Varsayılan (fallback) açıklama */
  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price!: number;

  /** Tenant'ın varsayılan para birimi kodu (EUR, TRY, USD …) */
  @Column({ name: 'currency_code', type: 'varchar', length: 10, default: 'EUR' })
  currencyCode!: string;

  @Column({
    name: 'charge_type',
    type: 'enum',
    enum: TransferExtraChargeType,
    default: TransferExtraChargeType.PER_BOOKING,
  })
  chargeType!: TransferExtraChargeType;

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl?: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;
}
