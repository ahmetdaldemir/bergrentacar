import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { TransferVehicle } from './transfer-vehicle.entity';

@Entity({ name: 'transfer_vehicle_images' })
export class TransferVehicleImage extends BaseEntity {
  @ManyToOne(() => TransferVehicle, (vehicle) => vehicle.images, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: TransferVehicle;

  @Column({ name: 'vehicle_id' })
  vehicleId!: string;

  @Column({ name: 'image_url', type: 'varchar', length: 500 })
  imageUrl!: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_primary', default: false })
  isPrimary!: boolean; // Ana görsel
}
