import { Column, Entity, JoinColumn, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

/**
 * Configurable thresholds for pricing intelligence rules
 * Tenant-specific rule configurations
 */
@Entity({ name: 'pricing_insight_rules' })
@Index(['tenantId'])
export class PricingInsightRule extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string; // Rule name (e.g., "Underpriced Vehicle Detection")

  @Column({ type: 'varchar', length: 200, nullable: true })
  description?: string;

  // Occupancy thresholds
  @Column({ name: 'min_occupancy_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  minOccupancyRate!: number; // Minimum acceptable occupancy (0-100)

  @Column({ name: 'low_occupancy_threshold', type: 'decimal', precision: 5, scale: 2, default: 30 })
  lowOccupancyThreshold!: number; // Alert if below this (0-100)

  @Column({ name: 'high_occupancy_threshold', type: 'decimal', precision: 5, scale: 2, default: 80 })
  highOccupancyThreshold!: number; // Consider high demand if above this (0-100)

  // Price comparison thresholds
  @Column({ name: 'price_deviation_threshold', type: 'decimal', precision: 5, scale: 2, default: 20 })
  priceDeviationThreshold!: number; // Alert if price deviates by this % from average

  @Column({ name: 'underprice_threshold', type: 'decimal', precision: 5, scale: 2, default: 15 })
  underpriceThreshold!: number; // Alert if price is this % below market average

  @Column({ name: 'overprice_threshold', type: 'decimal', precision: 5, scale: 2, default: 30 })
  overpriceThreshold!: number; // Alert if price is this % above market average

  // Idle vehicle thresholds
  @Column({ name: 'idle_days_threshold', type: 'int', default: 30 })
  idleDaysThreshold!: number; // Alert if vehicle idle for this many days

  @Column({ name: 'idle_occupancy_threshold', type: 'decimal', precision: 5, scale: 2, default: 10 })
  idleOccupancyThreshold!: number; // Alert if occupancy below this for idle period

  // Seasonal analysis
  @Column({ name: 'seasonal_analysis_enabled', default: true })
  seasonalAnalysisEnabled!: boolean;

  @Column({ name: 'seasonal_trend_periods', type: 'int', default: 12 })
  seasonalTrendPeriods!: number; // Months to analyze for trends

  // Location-based analysis
  @Column({ name: 'location_analysis_enabled', default: true })
  locationAnalysisEnabled!: boolean;

  @Column({ name: 'location_demand_threshold', type: 'decimal', precision: 5, scale: 2, default: 70 })
  locationDemandThreshold!: number; // High demand if location occupancy above this

  // Analysis period
  @Column({ name: 'analysis_period_days', type: 'int', default: 90 })
  analysisPeriodDays!: number; // Days to look back for analysis

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'is_default', default: false })
  isDefault!: boolean; // Default rule for tenant
}

