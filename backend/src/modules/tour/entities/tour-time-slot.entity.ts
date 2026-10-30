import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tour } from './tour.entity';

@Entity({ name: 'tour_time_slots' })
export class TourTimeSlot extends BaseEntity {
  @ManyToOne(() => Tour, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tour_id' })
  tour!: Tour;

  @Column({ name: 'tour_id' })
  tourId!: string;

  @Column({ name: 'start_time', type: 'time' })
  startTime!: string; // Format: HH:mm

  @Column({ name: 'end_time', type: 'time' })
  endTime!: string; // Format: HH:mm

  @Column({ type: 'int', default: 0 })
  order!: number;
}

