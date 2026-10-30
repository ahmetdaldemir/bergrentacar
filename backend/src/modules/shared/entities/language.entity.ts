import { Column, Entity, Index, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity({ name: 'languages' })
@Unique(['code'])
@Index(['isDefault']) // Index for faster queries on default language
export class Language extends BaseEntity {
  @Column({ length: 8 })
  code!: string;

  @Column({ length: 64 })
  name!: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ name: 'is_default', default: false })
  isDefault!: boolean;
}
