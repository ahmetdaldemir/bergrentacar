import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tour } from './tour.entity';

export enum PricingType {
  ADULT = 'adult',
  CHILD = 'child',
  INFANT = 'infant',
  EXTRA_MOTOR = 'extra_motor',
  ONE_PLUS_ONE = 'one_plus_one',
}

@Entity({ name: 'tour_pricing' })
export class TourPricing extends BaseEntity {
  @ManyToOne(() => Tour, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tour_id' })
  tour!: Tour;

  @Column({ name: 'tour_id' })
  tourId!: string;

  @Column({ type: 'enum', enum: PricingType })
  type!: PricingType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: number;

  @Column({ name: 'currency_code', length: 3, default: 'EUR' })
  currencyCode!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;
}

