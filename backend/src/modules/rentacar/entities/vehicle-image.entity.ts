import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Vehicle } from './vehicle.entity';

@Entity({ name: 'vehicle_images' })
export class VehicleImage extends BaseEntity {
  @ManyToOne(() => Vehicle, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: Vehicle;

  @Column({ name: 'vehicle_id' })
  vehicleId!: string;

  @Column({ length: 500 })
  url!: string;

  @Column({ length: 500, nullable: true })
  alt?: string;

  @Column({ type: 'int', default: 0 })
  order!: number;

  @Column({ name: 'is_primary', default: false })
  isPrimary!: boolean;
}

