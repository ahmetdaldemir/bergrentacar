import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tour } from './tour.entity';

@Entity({ name: 'tour_sessions' })
export class TourSession extends BaseEntity {
  @ManyToOne(() => Tour, (tour) => tour.sessions, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tour_id' })
  tour!: Tour;

  @Column({ name: 'tour_id' })
  tourId!: string;

  @Column({ name: 'starts_at', type: 'timestamp' })
  startsAt!: Date;

  @Column({ name: 'ends_at', type: 'timestamp', nullable: true })
  endsAt?: Date | null;

  @Column({ type: 'int', default: 0 })
  capacity!: number;

  @Column({ name: 'available_slots', type: 'int', default: 0 })
  availableSlots!: number;

  @Column({ name: 'price_override', type: 'decimal', precision: 10, scale: 2, nullable: true })
  priceOverride?: number | null;
}
