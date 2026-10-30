import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { TransferZonePriceGroup } from './transfer-zone-price-group.entity';

@Entity({ name: 'transfer_zone_price_items' })
export class TransferZonePriceItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => TransferZonePriceGroup, (g) => g.items, { onDelete: 'CASCADE' })
  group!: TransferZonePriceGroup;

  @Column({ name: 'vehicle_id', type: 'varchar', length: 100, nullable: true })
  vehicleId?: string | null;

  @Column({ type: 'numeric', scale: 2 })
  price!: number;

  @Column({ name: 'currency_code', type: 'varchar', length: 10, default: 'EUR' })
  currencyCode!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

