import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { TransferPricing } from './transfer-pricing.entity';
import { TransferReservation } from './transfer-reservation.entity';
import { VehicleBrand } from '../../rentacar/entities/vehicle-brand.entity';
import { VehicleModel } from '../../rentacar/entities/vehicle-model.entity';
import { TransferVehicleImage } from './transfer-vehicle-image.entity';

export enum TransferVehicleType {
  VIP = 'vip',
  SHUTTLE = 'shuttle',
  PREMIUM = 'premium',
  LUXURY = 'luxury',
}

export enum TransferVehicleFeature {
  WIFI = 'wifi',
  BABY_SEAT = 'baby_seat',
  DRINKS = 'drinks',
  NEWSPAPER = 'newspaper',
  CHARGER = 'charger',
  GPS = 'gps',
  MULTILINGUAL_DRIVER = 'multilingual_driver',
}

@Entity({ name: 'transfer_vehicles' })
export class TransferVehicle extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  // Brand and Model relations (optional - can use shared vehicle brands/models)
  @ManyToOne(() => VehicleBrand, { nullable: true })
  @JoinColumn({ name: 'brand_id' })
  brand?: VehicleBrand;

  @Column({ name: 'brand_id', type: 'uuid', nullable: true })
  brandId?: string;

  @ManyToOne(() => VehicleModel, { nullable: true })
  @JoinColumn({ name: 'model_id' })
  model?: VehicleModel;

  @Column({ name: 'model_id', type: 'uuid', nullable: true })
  modelId?: string;

  @Column({ type: 'int', nullable: true })
  year?: number; // Model yılı

  @Column({ type: 'enum', enum: TransferVehicleType, default: TransferVehicleType.VIP })
  type!: TransferVehicleType;

  @Column({ name: 'passenger_capacity', type: 'int' })
  passengerCapacity!: number;

  @Column({ name: 'luggage_capacity', type: 'int' })
  luggageCapacity!: number;

  @Column({ name: 'min_km', type: 'int', default: 0 })
  minKm!: number; // Minimum billable kilometers for this vehicle

  @Column({ name: 'min_price', type: 'decimal', precision: 10, scale: 2, default: 0 })
  minPrice!: number; // Minimum total price for this vehicle

  @Column({ name: 'has_driver', default: true })
  hasDriver!: boolean; // Transfer araçları varsayılan olarak şoförlü

  @Column({ type: 'simple-array', nullable: true })
  features?: TransferVehicleFeature[]; // Wi-Fi, Bebek Koltuğu, İçecek, vb.

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  /** Rentacar / Mobilize ile aynı takip sağlayıcısında kullanılan plaka (rezervasyon detay haritası) */
  @Column({ name: 'tracking_plate_number', type: 'varchar', length: 32, nullable: true })
  trackingPlateNumber?: string | null;

  @OneToMany(() => TransferVehicleImage, (image) => image.vehicle, { cascade: true })
  images!: TransferVehicleImage[];

  @OneToMany(() => TransferPricing, (pricing) => pricing.vehicle)
  pricings!: TransferPricing[];

  @OneToMany(() => TransferReservation, (reservation) => reservation.vehicle)
  reservations!: TransferReservation[];
}

