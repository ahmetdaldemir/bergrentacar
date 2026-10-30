import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { VehiclePlate } from './vehicle-plate.entity';
import { VehiclePricingPeriod } from './vehicle-pricing-period.entity';
import { VehicleCategory } from './vehicle-category.entity';
import { VehicleBrand } from './vehicle-brand.entity';
import { VehicleModel } from './vehicle-model.entity';
import { Location } from './location.entity';
import { VehicleImage } from './vehicle-image.entity';

export enum TransmissionType {
  AUTOMATIC = 'automatic',
  MANUAL = 'manual',
}

export enum FuelType {
  GASOLINE = 'gasoline',
  DIESEL = 'diesel',
  HYBRID = 'hybrid',
  ELECTRIC = 'electric',
}

@Entity({ name: 'vehicles' })
export class Vehicle extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;


  @ManyToOne(() => VehicleCategory, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category?: VehicleCategory | null;

  @Column({ name: 'category_id', nullable: true })
  categoryId?: string | null;

  @ManyToOne(() => VehicleBrand, { nullable: true })
  @JoinColumn({ name: 'brand_id' })
  brand?: VehicleBrand | null;

  @Column({ name: 'brand_id', nullable: true })
  brandId?: string | null;

  @ManyToOne(() => VehicleModel, { nullable: true })
  @JoinColumn({ name: 'model_id' })
  model?: VehicleModel | null;

  @Column({ name: 'model_id', nullable: true })
  modelId?: string | null;

  /** Panel / listelerde gösterilen araç adı (marka-modelden bağımsız isteğe bağlı başlık) */
  @Column({ type: 'varchar', length: 160, nullable: true })
  name?: string | null;

  // Legacy fields for backward compatibility
  @Column({ length: 80, nullable: true })
  brandName?: string;

  @Column({ length: 80, nullable: true })
  modelName?: string;

  @Column({ type: 'int', nullable: true })
  year?: number;

  @Column({ type: 'enum', enum: TransmissionType, default: TransmissionType.AUTOMATIC })
  transmission!: TransmissionType;

  @Column({ type: 'enum', enum: FuelType, default: FuelType.GASOLINE })
  fuelType!: FuelType;

  @Column({ type: 'int', default: 4 })
  seats!: number;

  @Column({ type: 'int', default: 2 })
  luggage!: number;

  @Column({ name: 'large_luggage', type: 'int', default: 0 })
  largeLuggage!: number;

  @Column({ name: 'small_luggage', type: 'int', default: 0 })
  smallLuggage!: number;

  @Column({ type: 'int', default: 4 })
  doors!: number;

  @Column({ name: 'engine_size', length: 50, nullable: true })
  engineSize?: string;

  @Column({ name: 'horsepower', length: 50, nullable: true })
  horsepower?: string;

  @Column({ name: 'body_type', length: 50, nullable: true })
  bodyType?: string;

  @Column({ name: 'has_hydraulic_steering', default: false })
  hasHydraulicSteering!: boolean;

  @Column({ name: 'is_four_wheel_drive', default: false })
  isFourWheelDrive!: boolean;

  @Column({ name: 'has_air_conditioning', default: false })
  hasAirConditioning!: boolean;

  @Column({ name: 'has_abs', default: false })
  hasAbs!: boolean;

  @Column({ name: 'has_radio', default: false })
  hasRadio!: boolean;

  @Column({ name: 'has_cd', default: false })
  hasCd!: boolean;

  @Column({ name: 'has_sunroof', default: false })
  hasSunroof!: boolean;

  @Column({ name: 'order', type: 'int', default: 0 })
  order!: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'base_rate', type: 'decimal', precision: 10, scale: 2, default: 0 })
  baseRate!: number;

  @Column({ name: 'currency_code', length: 3, default: 'EUR' })
  currencyCode!: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @ManyToOne(() => Location, { nullable: true })
  @JoinColumn({ name: 'last_return_location_id' })
  lastReturnLocation?: Location | null;

  @Column({ name: 'last_return_location_id', nullable: true })
  lastReturnLocationId?: string | null;

  @OneToMany(() => VehiclePlate, (plate) => plate.vehicle)
  plates!: VehiclePlate[];

  @OneToMany(() => VehiclePricingPeriod, (pricing) => pricing.vehicle)
  pricingPeriods!: VehiclePricingPeriod[];

  @OneToMany(() => VehicleImage, (image) => image.vehicle)
  images!: VehicleImage[];
}
