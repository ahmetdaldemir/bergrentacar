import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tour } from './tour.entity';

@Entity({ name: 'tour_images' })
export class TourImage extends BaseEntity {
  @ManyToOne(() => Tour, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tour_id' })
  tour!: Tour;

  @Column({ name: 'tour_id' })
  tourId!: string;

  @Column({ length: 500 })
  url!: string;

  @Column({ length: 500, nullable: true })
  alt?: string;

  @Column({ type: 'int', default: 0 })
  order!: number;

  @Column({ name: 'is_primary', default: false })
  isPrimary!: boolean;
}

