import { Column, Entity, JoinColumn, ManyToOne, Unique, Index } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from './tenant.entity';
import { Language } from '../../shared/entities/language.entity';

/**
 * TenantLanguage Entity
 * 
 * Her firma (tenant) kendi kullanacağı dilleri bu tabloda aktif/pasif eder.
 * İçerikler sadece aktif dillere göre oluşturulabilir.
 */
@Entity({ name: 'tenant_languages' })
@Unique(['tenantId', 'languageId'])
@Index(['tenantId', 'isActive'])
export class TenantLanguage extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Language, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'language_id' })
  language!: Language;

  @Column({ name: 'language_id' })
  languageId!: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'is_default', default: false })
  isDefault!: boolean; // Tenant için varsayılan dil

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number; // Sıralama için
}
