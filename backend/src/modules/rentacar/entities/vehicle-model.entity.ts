import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { VehicleBrand } from './vehicle-brand.entity';

@Entity({ name: 'vehicle_models' })
@Index(['brandId'])
export class VehicleModel extends BaseEntity {
  @ManyToOne(() => VehicleBrand, (brand) => brand.models, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'brand_id' })
  brand!: VehicleBrand;

  @Column({ name: 'brand_id' })
  brandId!: string;

  @Column({ length: 80 })
  name!: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;
}

