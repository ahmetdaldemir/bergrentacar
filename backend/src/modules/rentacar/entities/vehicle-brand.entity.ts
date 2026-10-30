import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { VehicleModel } from './vehicle-model.entity';

@Entity({ name: 'vehicle_brands' })
export class VehicleBrand extends BaseEntity {
  @Column({ length: 80, unique: true })
  name!: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @OneToMany(() => VehicleModel, (model) => model.brand, { cascade: true })
  models!: VehicleModel[];
}

