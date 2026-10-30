import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Vehicle } from './vehicle.entity';

export enum SeasonName {
  WINTER = 'winter',
  SPRING = 'spring',
  SUMMER = 'summer',
  AUTUMN = 'autumn',
}

@Entity({ name: 'vehicle_pricing_periods' })
@Unique(['vehicleId', 'month'])
export class VehiclePricingPeriod extends BaseEntity {
  @ManyToOne(() => Vehicle, (vehicle) => vehicle.pricingPeriods, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: Vehicle;

  @Column({ name: 'vehicle_id' })
  vehicleId!: string;

  @Column({ type: 'enum', enum: SeasonName })
  season!: SeasonName;

  @Column({ type: 'int' })
  month!: number;

  @Column({ name: 'daily_rate', type: 'decimal', precision: 10, scale: 2 })
  dailyRate!: number;

  @Column({ name: 'weekly_rate', type: 'decimal', precision: 10, scale: 2, nullable: true })
  weeklyRate?: number | null;
}
