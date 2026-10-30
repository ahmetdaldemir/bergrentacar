import { Column, Entity, JoinColumn, ManyToOne, OneToMany, Unique } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { PaymentMethod } from '../../shared/entities/payment-method.entity';
import { Reservation } from '../../shared/entities/reservation.entity';
import { Tour } from '../../tour/entities/tour.entity';
import { Vehicle } from '../../rentacar/entities/vehicle.entity';
import { TenantUser } from './tenant-user.entity';
import { Currency } from '../../shared/entities/currency.entity';
import { TenantLanguage } from './tenant-language.entity';

export enum TenantCategory {
  TOUR = 'tour',
  RENTACAR = 'rentacar',
  TRANSFER = 'transfer',
}

@Entity({ name: 'tenants' })
@Unique(['slug'])
export class Tenant extends BaseEntity {
  @Column({ length: 120 })
  name!: string;

  @Column({ length: 120 })
  slug!: string;

  @Column({ type: 'enum', enum: TenantCategory })
  category!: TenantCategory;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ name: 'default_language', length: 8, default: 'en' })
  defaultLanguage!: string;

  @Column({ name: 'support_email', nullable: true })
  supportEmail?: string;

  @ManyToOne(() => Currency, { nullable: true })
  @JoinColumn({ name: 'default_currency_id' })
  defaultCurrency?: Currency | null;

  @Column({ name: 'default_currency_id', type: 'uuid', nullable: true })
  defaultCurrencyId?: string | null;

  @OneToMany(() => PaymentMethod, (payment) => payment.tenant)
  paymentMethods!: PaymentMethod[];

  @OneToMany(() => Reservation, (reservation) => reservation.tenant)
  reservations!: Reservation[];

  @OneToMany(() => Tour, (tour) => tour.tenant)
  tours!: Tour[];

  @OneToMany(() => Vehicle, (vehicle) => vehicle.tenant)
  vehicles!: Vehicle[];

  @OneToMany(() => TenantUser, (user) => user.tenant)
  users!: TenantUser[];

  @OneToMany(() => TenantLanguage, (tenantLanguage) => tenantLanguage.tenant)
  languages!: TenantLanguage[];
}
