import { Column, Entity, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity({ name: 'phone_countries' })
@Unique(['dialCode'])
export class PhoneCountry extends BaseEntity {
  @Column({ length: 2 })
  isoCode!: string;

  @Column({ length: 80 })
  name!: string;

  @Column({ name: 'dial_code', length: 6 })
  dialCode!: string;

  @Column({ default: true })
  isActive!: boolean;
}
