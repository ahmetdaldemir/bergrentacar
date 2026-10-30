import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';

@Entity({ name: 'tour_features' })
export class TourFeature extends BaseEntity {
  @Column({ length: 100 })
  icon!: string; // Material Design Icons name (e.g., 'mdi-wifi', 'mdi-pool')

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;
}

