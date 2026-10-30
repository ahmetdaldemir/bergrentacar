import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Location } from './location.entity';
import { Vehicle } from './vehicle.entity';

export enum DayRange {
  RANGE_1_3 = '1-3',
  RANGE_4_6 = '4-6',
  RANGE_7_10 = '7-10',
  RANGE_11_13 = '11-13',
  RANGE_14_20 = '14-20',
  RANGE_21_29 = '21-29',
  RANGE_30_PLUS = '30++',
}

@Entity({ name: 'location_vehicle_pricing' })
@Unique(['locationId', 'vehicleId', 'month', 'dayRange'])
@Index(['locationId', 'month'])
@Index(['vehicleId'])
export class LocationVehiclePricing extends BaseEntity {
  @ManyToOne(() => Location, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'location_id' })
  location!: Location;

  @Column({ name: 'location_id' })
  locationId!: string;

  @ManyToOne(() => Vehicle, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: Vehicle;

  @Column({ name: 'vehicle_id' })
  vehicleId!: string;

  @Column({ type: 'int' })
  month!: number; // 1-12

  @Column({ name: 'day_range', type: 'enum', enum: DayRange })
  dayRange!: DayRange;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount!: number;

  @Column({ name: 'min_days', type: 'int', default: 0 })
  minDays!: number;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;
}

