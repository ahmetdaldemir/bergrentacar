import { Column, Entity, JoinColumn, ManyToOne, Unique, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Language } from './language.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity({ name: 'translations' })
@Unique(['model', 'modelId', 'languageId', 'tenantId'])
@Index(['model', 'modelId'])
@Index(['tenantId'])
export class Translation extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant | null;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId?: string | null;

  @Column({ type: 'varchar', length: 100 })
  model!: string; // Entity name (e.g., 'Destination', 'Tour', 'Blog')

  @Column({ name: 'model_id', type: 'uuid' })
  modelId!: string; // Foreign key to the related entity

  @ManyToOne(() => Language, { nullable: false })
  @JoinColumn({ name: 'language_id' })
  language!: Language;

  @Column({ name: 'language_id', type: 'uuid' })
  languageId!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string; // Title/Name field

  @Column({ type: 'text', nullable: true })
  value?: string; // Generic value field for description, shortDescription, or any other content

  @Column({ type: 'varchar', length: 255, nullable: true })
  slug?: string; // URL-friendly slug generated from name

  // SEO Fields
  @Column({ name: 'meta_title', type: 'varchar', length: 255, nullable: true })
  metaTitle?: string; // SEO meta title

  @Column({ name: 'meta_description', type: 'text', nullable: true })
  metaDescription?: string; // SEO meta description

  @Column({ name: 'meta_keywords', type: 'varchar', length: 500, nullable: true })
  metaKeywords?: string; // SEO meta keywords
}

