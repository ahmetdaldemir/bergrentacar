import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { CrmPageCategory } from './crm-page-category.entity';

export enum CrmPageType {
  /** İçerik sayfası - slug ile CRM sayfası URL'i */
  CONTENT = 'content',
  /** Site içi route - /iletisim, /hakkimizda gibi */
  INTERNAL_ROUTE = 'internal_route',
  /** Harici/sabit URL - https://... */
  EXTERNAL_URL = 'external_url',
}

/**
 * CRM Page Entity
 * Pages for CRM module (e.g., Privacy Policy, Terms of Service, Help articles)
 * Multi-language support via Translation entity
 * pageType: content = slug-based, internal_route = site route, external_url = full URL
 */
@Entity({ name: 'crm_pages' })
export class CrmPage extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => CrmPageCategory, { nullable: false })
  @JoinColumn({ name: 'category_id' })
  category!: CrmPageCategory;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId!: string;

  @Column({ type: 'varchar', length: 200 })
  slug!: string; // URL-friendly identifier (content type) or fallback

  /** Sayfa tipi: content (içerik), internal_route (site içi), external_url (harici) */
  @Column({ name: 'page_type', type: 'varchar', length: 20, default: CrmPageType.CONTENT })
  pageType!: CrmPageType;

  /** internal_route veya external_url için kullanılan URL */
  @Column({ name: 'custom_url', type: 'varchar', length: 500, nullable: true })
  customUrl?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  image?: string; // Image URL

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number; // For ordering pages within category

  @Column({ name: 'view_count', type: 'int', default: 0 })
  viewCount!: number; // Track page views

  // Note: title and description are stored in Translation entity with model='CrmPage'
  // title -> Translation.name
  // description -> Translation.value
}

