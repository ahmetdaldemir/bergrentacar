import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { CrmPage } from './crm-page.entity';

/**
 * CRM Page Category Entity
 * Categories for organizing CRM pages (e.g., "Politikalar", "Yardım")
 * Multi-language support via Translation entity
 */
@Entity({ name: 'crm_page_categories' })
export class CrmPageCategory extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 100 })
  slug!: string; // URL-friendly identifier (e.g., "policies", "help")

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number; // For ordering categories

  // Relations
  @OneToMany(() => CrmPage, (page) => page.category)
  pages!: CrmPage[];

  // Note: title/name is stored in Translation entity with model='CrmPageCategory'
}

