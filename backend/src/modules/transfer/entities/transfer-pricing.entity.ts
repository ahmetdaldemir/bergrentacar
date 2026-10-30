import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { TransferVehicle } from './transfer-vehicle.entity';
import { TransferRoute } from './transfer-route.entity';
import { Currency } from '../../shared/entities/currency.entity';

/**
 * Transfer Pricing Entity
 * 
 * Pricing Formula: 
 * Total Price = (Distance in KM × Base KM Price × Passenger Multiplier) + Night Surcharge + Extra Services
 * 
 * Example:
 * - Distance: 50 km
 * - Base KM Price: 2 EUR
 * - Passengers: 3
 * - Passenger Multiplier for 3: 1.5
 * - Total: 50 × 2 × 1.5 = 150 EUR
 */
@Entity({ name: 'transfer_pricings' })
@Unique(['tenantId', 'vehicleId'])
export class TransferPricing extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => TransferVehicle, { nullable: false })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: TransferVehicle;

  @Column({ name: 'vehicle_id' })
  vehicleId!: string;



  // Mesafe aralığına göre taban fiyat (€/km): 0-50, 50-100, 100-200, 200+
  // Örnek: { "0_50": 2.5, "50_100": 2.0, "100_200": 1.8, "200_plus": 1.5 }
  @Column({ name: 'distance_tier_prices', type: 'jsonb', nullable: true })
  distanceTierPrices?: Record<string, number>;

  // Base price per kilometer (legacy - distanceTierPrices yoksa kullanılır)
  @Column({ name: 'base_km_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  baseKmPrice?: number;

  // Passenger count multipliers (JSONB)
  // Example: { "1": 0.8, "2": 1, "3": 1.5, "4": 2, "5": 2.5 }
  // Temporarily nullable for migration - will be NOT NULL after cleanup
  @Column({ name: 'passenger_multipliers', type: 'jsonb', nullable: true })
  passengerMultipliers?: Record<string, number>;

  // Currency from tenant's default currency
  @ManyToOne(() => Currency, { nullable: true })
  @JoinColumn({ name: 'currency_id' })
  currency?: Currency | null;

  @Column({ name: 'currency_id', type: 'uuid', nullable: true })
  currencyId?: string | null;

  // Legacy: Keep for backward compatibility
  @Column({ name: 'base_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  basePrice?: number;

  

  @Column({ name: 'extra_service_prices', type: 'jsonb', nullable: true })
  extraServicePrices?: Record<string, number>; // { "baby_seat": 10, "waiting_time": 15 }


  @Column({ type: 'text', nullable: true })
  notes?: string;
}

