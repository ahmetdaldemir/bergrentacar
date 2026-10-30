import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { TransferZonePriceItem } from './transfer-zone-price-item.entity';

@Entity({ name: 'transfer_zone_price_groups' })
export class TransferZonePriceGroup {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 100 })
  tenantId!: string;

  @Column({ name: 'from_zone_id', type: 'varchar', length: 100 })
  fromZoneId!: string;

  @Column({ name: 'to_zone_id', type: 'varchar', length: 100 })
  toZoneId!: string;

  @Column({ name: 'price_type', type: 'varchar', length: 20, default: 'between' })
  priceType!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt?: Date | null;

  @OneToMany(() => TransferZonePriceItem, (item) => item.group, { cascade: true })
  items!: TransferZonePriceItem[];
}

