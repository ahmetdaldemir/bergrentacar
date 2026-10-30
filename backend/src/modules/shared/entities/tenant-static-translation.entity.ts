import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

/**
 * Tenant web sitesindeki statik UI metinlerinin çok dilli karşılıkları.
 * Her satır bir çeviri anahtarı (key) ve tüm diller için değerleri (values JSONB) içerir.
 * Örnek: translationKey = "hero.title", values = { "tr": "Hoş Geldiniz", "en": "Welcome" }
 */
@Entity({ name: 'tenant_static_translations' })
@Unique(['tenantId', 'translationKey'])
export class TenantStaticTranslation extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  /**
   * Çeviri anahtarı; örn. "hero.title", "nav.home", "footer.contact"
   */
  @Column({ name: 'translation_key', length: 255 })
  translationKey!: string;

  /**
   * Dil koduna göre değerler: { "tr": "Hizmetler", "en": "Services", "de": "Dienstleistungen" }
   */
  @Column({ type: 'jsonb', default: {} })
  values!: Record<string, string>;

  /**
   * İsteğe bağlı gruplama etiketi; örn. "header", "footer", "homepage"
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  namespace?: string | null;
}
