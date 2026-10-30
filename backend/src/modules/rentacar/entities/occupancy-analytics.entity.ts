import { Column, Entity, JoinColumn, ManyToOne, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Vehicle } from './vehicle.entity';
import { Location } from './location.entity';

/**
 * Historical occupancy and pricing analytics
 * Aggregated data for analysis
 */
@Entity({ name: 'occupancy_analytics' })
@Unique(['tenantId', 'vehicleId', 'locationId', 'date', 'periodType'])
@Index(['tenantId', 'date'])
@Index(['tenantId', 'vehicleId', 'date'])
@Index(['tenantId', 'locationId', 'date'])
export class OccupancyAnalytics extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Vehicle, { nullable: true })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle?: Vehicle | null;

  @Column({ name: 'vehicle_id', nullable: true })
  vehicleId?: string | null;

  @ManyToOne(() => Location, { nullable: true })
  @JoinColumn({ name: 'location_id' })
  location?: Location | null;

  @Column({ name: 'location_id', nullable: true })
  locationId?: string | null;

  @Column({ type: 'date' })
  date!: Date; // Date of the period

  @Column({ name: 'period_type', type: 'varchar', length: 20, default: 'daily' })
  periodType!: string; // 'daily', 'weekly', 'monthly'

  // Occupancy metrics
  @Column({ name: 'total_days', type: 'int', default: 0 })
  totalDays!: number; // Total days in period

  @Column({ name: 'booked_days', type: 'int', default: 0 })
  bookedDays!: number; // Days with reservations

  @Column({ name: 'occupancy_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  occupancyRate!: number; // (bookedDays / totalDays) * 100

  // Pricing metrics
  @Column({ name: 'average_daily_price', type: 'decimal', precision: 10, scale: 2, default: 0 })
  averageDailyPrice!: number;

  @Column({ name: 'min_daily_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  minDailyPrice?: number | null;

  @Column({ name: 'max_daily_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxDailyPrice?: number | null;

  @Column({ name: 'total_revenue', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalRevenue!: number;

  // Reservation counts
  @Column({ name: 'total_reservations', type: 'int', default: 0 })
  totalReservations!: number;

  @Column({ name: 'confirmed_reservations', type: 'int', default: 0 })
  confirmedReservations!: number;

  @Column({ name: 'cancelled_reservations', type: 'int', default: 0 })
  cancelledReservations!: number;

  // Demand indicators
  @Column({ name: 'demand_score', type: 'decimal', precision: 5, scale: 2, default: 0 })
  demandScore!: number; // 0-100, calculated from multiple factors

  @Column({ name: 'booking_lead_time_avg', type: 'decimal', precision: 5, scale: 2, nullable: true })
  bookingLeadTimeAvg?: number | null; // Average days between booking and pickup

  // Seasonal indicators
  @Column({ name: 'month', type: 'int', nullable: true })
  month?: number | null; // 1-12

  @Column({ name: 'week_of_year', type: 'int', nullable: true })
  weekOfYear?: number | null; // 1-52

  @Column({ name: 'is_weekend', default: false })
  isWeekend!: boolean;

  @Column({ name: 'is_holiday', default: false })
  isHoliday!: boolean;
}

