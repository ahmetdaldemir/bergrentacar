import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

/**
 * Transfer Vehicle Feature Entity
 * 
 * Tenant'a özel araç özellikleri tanımlamak için kullanılır.
 * Örnek: Wi-Fi, Bebek Koltuğu, İçecek, vb.
 */
@Entity({ name: 'transfer_vehicle_features' })
export class TransferVehicleFeature extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string; // Özellik adı (örn: "Wi-Fi", "Bebek Koltuğu")

  @Column({ type: 'varchar', length: 50, nullable: true })
  icon?: string; // İkon adı veya class (opsiyonel)

  @Column({ type: 'varchar', length: 50, nullable: true })
  code?: string; // Unique kod (opsiyonel, slug gibi)

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;
}

