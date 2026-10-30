import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Destination } from './destination.entity';

@Entity({ name: 'hotels' })
export class Hotel extends BaseEntity {
  @Column({ length: 160 })
  name!: string;

  @Column({ name: 'star_rating', type: 'decimal', precision: 2, scale: 1, default: 0 })
  starRating!: number;

  @Column({ length: 160 })
  address!: string;

  @Column({ length: 80 })
  city!: string;

  @Column({ length: 80 })
  country!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'location_url', type: 'varchar', length: 255, nullable: true })
  locationUrl?: string;

  @ManyToOne(() => Destination, { nullable: true })
  @JoinColumn({ name: 'destination_id' })
  destination?: Destination | null;

  @Column({ name: 'destination_id', nullable: true })
  destinationId?: string | null;
}
