import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { stringArrayJsonColumnTransformer } from '../../../utils/string-array-json-column.transformer';

export enum SettingsCategory {
  SITE = 'site',
  MAIL = 'mail',
  PAYMENT = 'payment',
  GENERAL = 'general',
  AI = 'ai',
  INVOICE = 'invoice',
}

@Entity({ name: 'tenant_settings' })
@Unique(['tenantId', 'category'])
export class TenantSettings extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @Column({ type: 'enum', enum: SettingsCategory })
  category!: SettingsCategory;

  // Site Settings
  @Column({ name: 'site_name', type: 'varchar', length: 200, nullable: true })
  siteName?: string;

  @Column({ name: 'site_description', type: 'text', nullable: true })
  siteDescription?: string;

  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl?: string;

  @Column({ name: 'favicon_url', type: 'text', nullable: true })
  faviconUrl?: string;

  // Mail Settings
  @Column({ name: 'smtp_host', type: 'varchar', length: 200, nullable: true })
  smtpHost?: string;

  @Column({ name: 'smtp_port', type: 'int', nullable: true })
  smtpPort?: number;

  @Column({ name: 'smtp_user', type: 'varchar', length: 200, nullable: true })
  smtpUser?: string;

  @Column({ name: 'smtp_password', type: 'varchar', length: 500, nullable: true })
  smtpPassword?: string;

  @Column({ name: 'smtp_secure', default: false })
  smtpSecure!: boolean; // false=STARTTLS (port 587), true=SSL (port 465)

  @Column({ name: 'from_email', type: 'varchar', length: 200, nullable: true })
  fromEmail?: string;

  @Column({ name: 'from_name', type: 'varchar', length: 200, nullable: true })
  fromName?: string;

  // Payment Settings
  @Column({ name: 'payment_default_method_id', type: 'uuid', nullable: true })
  paymentDefaultMethodId?: string | null;

  // Company/Address Information (for email templates)
  @Column({ name: 'company_name', type: 'varchar', length: 200, nullable: true })
  companyName?: string;

  @Column({ name: 'company_address', type: 'text', nullable: true })
  companyAddress?: string;

  @Column({ name: 'company_phone', type: 'varchar', length: 50, nullable: true })
  companyPhone?: string;

  @Column({ name: 'company_email', type: 'varchar', length: 160, nullable: true })
  companyEmail?: string;

  @Column({ name: 'company_website', type: 'varchar', length: 255, nullable: true })
  companyWebsite?: string;

  @Column({ name: 'company_tax_number', type: 'varchar', length: 50, nullable: true })
  companyTaxNumber?: string;

  // CC email addresses (DB: text; legacy values may be plain email or JSON array string)
  @Column({
    name: 'cc_emails',
    type: 'text',
    nullable: true,
    transformer: stringArrayJsonColumnTransformer,
  })
  ccEmails?: string[] | null;

  // Additional settings as JSONB for flexibility
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  // Optional OpenAI API key stored at top-level for easy sync/migration
  @Column({ name: 'openai_api_key', type: 'varchar', length: 500, nullable: true })
  openaiApiKey?: string;

  // Optional DeepL API key stored at top-level for easy sync/migration
  @Column({ name: 'deepl_api_key', type: 'varchar', length: 500, nullable: true })
  deeplApiKey?: string;

  // Google Maps API key stored at top-level; used for map embeds and zone drawing
  @Column({ name: 'google_maps_api_key', type: 'varchar', length: 500, nullable: true })
  googleMapsApiKey?: string;
}

