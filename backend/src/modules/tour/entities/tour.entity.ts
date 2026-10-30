import { Column, Entity, JoinColumn, ManyToMany, ManyToOne, OneToMany, JoinTable } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Destination } from '../../shared/entities/destination.entity';
import { Language } from '../../shared/entities/language.entity';
import { TourSession } from './tour-session.entity';
import { TourFeature } from './tour-feature.entity';
import { TourInfoItem } from './tour-info-item.entity';
import { TourImage } from './tour-image.entity';
import { TourTimeSlot } from './tour-time-slot.entity';
import { TourPricing } from './tour-pricing.entity';

export enum DurationUnit {
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day',
}

@Entity({ name: 'tours' })
export class Tour extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Destination, { nullable: false })
  @JoinColumn({ name: 'destination_id' })
  destination!: Destination;

  @Column({ name: 'destination_id' })
  destinationId!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'varchar', length: 200 })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  summary?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  basePrice!: number;

  @Column({ name: 'currency_code', type: 'varchar', length: 3, default: 'EUR' })
  currencyCode!: string;

  @Column({ name: 'duration_hours', type: 'int', default: 24 })
  durationHours!: number;

  @Column({ type: 'int', nullable: true })
  duration?: number;

  @Column({ name: 'duration_unit', type: 'enum', enum: DurationUnit, default: DurationUnit.HOUR })
  durationUnit!: DurationUnit;

  @Column({ name: 'max_capacity', type: 'int', default: 0 })
  maxCapacity!: number; // 0 = unlimited

  @Column({ type: 'simple-array', nullable: true })
  days?: string[]; // ['monday', 'tuesday', etc.]

  @Column({ type: 'varchar', length: 500, nullable: true })
  video?: string;

  @Column({ type: 'simple-array', nullable: true })
  tags?: string[];

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @ManyToMany(() => Language)
  @JoinTable({
    name: 'tour_languages',
    joinColumn: { name: 'tour_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'language_id', referencedColumnName: 'id' },
  })
  languages!: Language[];

  @ManyToOne(() => Language, { nullable: true })
  @JoinColumn({ name: 'default_language_id' })
  defaultLanguage?: Language | null;

  @Column({ name: 'default_language_id', nullable: true })
  defaultLanguageId?: string | null;

  @ManyToMany(() => TourFeature)
  @JoinTable({
    name: 'tour_feature_assignments',
    joinColumn: { name: 'tour_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'feature_id', referencedColumnName: 'id' },
  })
  features!: TourFeature[];

  @OneToMany(() => TourSession, (session) => session.tour)
  sessions!: TourSession[];

  @OneToMany(() => TourInfoItem, (item) => item.tour, { cascade: true })
  infoItems!: TourInfoItem[];

  @OneToMany(() => TourImage, (image) => image.tour, { cascade: true })
  images!: TourImage[];

  @OneToMany(() => TourTimeSlot, (slot) => slot.tour, { cascade: true })
  timeSlots!: TourTimeSlot[];

  @OneToMany(() => TourPricing, (pricing) => pricing.tour, { cascade: true })
  pricing!: TourPricing[];
}
