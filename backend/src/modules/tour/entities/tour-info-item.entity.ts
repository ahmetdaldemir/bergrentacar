import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Language } from '../../shared/entities/language.entity';
import { Tour } from './tour.entity';

@Entity({ name: 'tour_info_items' })
@Unique(['tourId', 'languageId', 'order'])
export class TourInfoItem extends BaseEntity {
  @ManyToOne(() => Tour, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tour_id' })
  tour!: Tour;

  @Column({ name: 'tour_id' })
  tourId!: string;

  @ManyToOne(() => Language, { nullable: false })
  @JoinColumn({ name: 'language_id' })
  language!: Language;

  @Column({ name: 'language_id' })
  languageId!: string;

  @Column({ type: 'text' })
  text!: string;

  @Column({ type: 'int', default: 0 })
  order!: number;
}

