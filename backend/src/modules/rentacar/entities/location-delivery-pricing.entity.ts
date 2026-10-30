import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Location } from './location.entity';

@Entity({ name: 'location_delivery_pricing' })
@Unique(['locationId', 'deliveryLocationId'])
@Index(['locationId'])
export class LocationDeliveryPricing extends BaseEntity {
  @ManyToOne(() => Location, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'location_id' })
  location!: Location;

  @Column({ name: 'location_id' })
  locationId!: string;

  @ManyToOne(() => Location, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'delivery_location_id' })
  deliveryLocation!: Location;

  @Column({ name: 'delivery_location_id' })
  deliveryLocationId!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  distance!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  fee!: number;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;
}

