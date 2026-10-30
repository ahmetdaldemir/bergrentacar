import { Column, Entity, JoinColumn, ManyToOne, Unique, Index } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { TransferRoute } from './transfer-route.entity';
import { TransferVehicle } from './transfer-vehicle.entity';
import { Currency } from '../../shared/entities/currency.entity';

/**
 * Transfer Popular Route Entity
 * 
 * Popüler rotalar için Google Maps ile belirlenen rotalar
 * Fiyat otomatik olarak TransferPricing'den hesaplanır
 * Örnek: "IST → Marmaris" rotası için "Mercedes Vito" aracı
 */
@Entity({ name: 'transfer_popular_routes' })
@Unique(['tenantId', 'pickupPlaceId', 'dropoffPlaceId', 'vehicleId'])
@Index(['tenantId', 'isActive'])
@Index(['tenantId', 'sortOrder'])
export class TransferPopularRoute extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  // Google Maps Place IDs
  @Column({ name: 'pickup_place_id', type: 'varchar', length: 255 })
  pickupPlaceId!: string; // Google Maps Place ID

  @Column({ name: 'pickup_address', type: 'varchar', length: 300 })
  pickupAddress!: string; // Display address

  @Column({ name: 'pickup_lat', type: 'varchar', length: 50 })
  pickupLat!: string;

  @Column({ name: 'pickup_lng', type: 'varchar', length: 50 })
  pickupLng!: string;

  @Column({ name: 'dropoff_place_id', type: 'varchar', length: 255 })
  dropoffPlaceId!: string; // Google Maps Place ID

  @Column({ name: 'dropoff_address', type: 'varchar', length: 300 })
  dropoffAddress!: string; // Display address

  @Column({ name: 'dropoff_lat', type: 'varchar', length: 50 })
  dropoffLat!: string;

  @Column({ name: 'dropoff_lng', type: 'varchar', length: 50 })
  dropoffLng!: string;

  // Route name (auto-generated or custom)
  @Column({ type: 'varchar', length: 200 })
  name!: string; // "IST → Marmaris"

  // Distance in kilometers (calculated from Google Maps)
  @Column({ type: 'decimal', precision: 8, scale: 2 })
  distanceKm!: number;

  // Average duration in minutes (calculated from Google Maps)
  @Column({ name: 'average_duration_minutes', type: 'int', nullable: true })
  averageDurationMinutes?: number;

  @ManyToOne(() => TransferVehicle, { nullable: false })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: TransferVehicle;

  @Column({ name: 'vehicle_id' })
  vehicleId!: string;

  // Legacy: Keep routeId for backward compatibility (optional)
  @ManyToOne(() => TransferRoute, { nullable: true })
  @JoinColumn({ name: 'route_id' })
  route?: TransferRoute | null;

  @Column({ name: 'route_id', nullable: true })
  routeId?: string | null;

  // Legacy: Keep fixedPrice for backward compatibility (optional)
  // If null, price will be calculated from TransferPricing
  @Column({ name: 'fixed_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  fixedPrice?: number | null;

  @ManyToOne(() => Currency, { nullable: true })
  @JoinColumn({ name: 'currency_id' })
  currency?: Currency | null;

  @Column({ name: 'currency_id', type: 'uuid', nullable: true })
  currencyId?: string | null;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number; // Sıralama için

  @Column({ type: 'text', nullable: true })
  description?: string; // Opsiyonel açıklama
}
