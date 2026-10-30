import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Location } from './location.entity';
import { Vehicle } from './vehicle.entity';
import { VehicleCategory } from './vehicle-category.entity';

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

/**
 * Campaign entity for Rentacar discount campaigns
 * Supports location-based, vehicle/category-based campaigns with date ranges
 */
@Entity({ name: 'rentacar_campaigns' })
@Index(['tenantId', 'isActive', 'startDate', 'endDate'])
@Index(['tenantId', 'pickupLocationId'])
@Index(['tenantId', 'vehicleId'])
@Index(['tenantId', 'categoryId'])
export class Campaign extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  // Required: Pickup location filter
  @ManyToOne(() => Location, { nullable: false })
  @JoinColumn({ name: 'pickup_location_id' })
  pickupLocation!: Location;

  @Column({ name: 'pickup_location_id' })
  pickupLocationId!: string;

  // Optional: Vehicle filter (either vehicleId OR categoryId, not both)
  @ManyToOne(() => Vehicle, { nullable: true })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle?: Vehicle | null;

  @Column({ name: 'vehicle_id', nullable: true })
  vehicleId?: string | null;

  // Optional: Category filter (either vehicleId OR categoryId, not both)
  @ManyToOne(() => VehicleCategory, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category?: VehicleCategory | null;

  @Column({ name: 'category_id', nullable: true })
  categoryId?: string | null;

  // Conditions
  @Column({ name: 'min_rental_days', type: 'int', nullable: true })
  minRentalDays?: number | null; // Minimum rental day count (optional but can be required)

  // Discount configuration
  @Column({ name: 'discount_type', type: 'enum', enum: DiscountType, default: DiscountType.PERCENTAGE })
  discountType!: DiscountType;

  @Column({ name: 'discount_percent', type: 'decimal', precision: 5, scale: 2, nullable: true })
  discountPercent?: number | null; // Percentage discount (0-100)

  @Column({ name: 'discount_fixed', type: 'decimal', precision: 10, scale: 2, nullable: true })
  discountFixed?: number | null; // Fixed amount discount (optional extension)

  // Validity period
  @Column({ name: 'start_date', type: 'date' })
  startDate!: Date;

  @Column({ name: 'end_date', type: 'date' })
  endDate!: Date;

  // Priority and conflict resolution
  @Column({ type: 'int', default: 0 })
  priority!: number; // Higher priority wins in case of tie (tie-breaker)

  // Status
  @Column({ name: 'is_active', default: true })
  isActive!: boolean;
}

