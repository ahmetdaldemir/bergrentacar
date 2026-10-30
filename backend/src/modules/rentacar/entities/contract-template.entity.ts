import { Column, Entity, JoinColumn, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

export enum ContractSectionType {
  HEADER = 'header',
  LEGAL_CORE = 'legal_core', // Locked, uneditable
  CUSTOM = 'custom', // Editable by tenant
  FOOTER = 'footer',
  SIGNATURE = 'signature',
}

export interface ContractSection {
  id: string;
  type: ContractSectionType;
  title: string;
  content: string;
  isLocked: boolean; // Legal core sections are locked
  order: number;
  isVisible: boolean;
}

@Entity({ name: 'contract_templates' })
@Index(['tenantId'])
export class ContractTemplate extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // Tenant customization
  @Column({ name: 'logo_url', type: 'varchar', length: 500, nullable: true })
  logoUrl?: string;

  @Column({ name: 'primary_color', type: 'varchar', length: 7, default: '#1976D2' })
  primaryColor!: string; // Hex color

  @Column({ name: 'secondary_color', type: 'varchar', length: 7, nullable: true })
  secondaryColor?: string;

  @Column({ name: 'text_color', type: 'varchar', length: 7, default: '#000000' })
  textColor!: string;

  // Contract sections (JSON array)
  @Column({ type: 'jsonb' })
  sections!: ContractSection[];

  // Optional text blocks (customizable by tenant)
  @Column({ name: 'optional_blocks', type: 'jsonb', nullable: true })
  optionalBlocks?: Array<{
    id: string;
    title: string;
    content: string;
    isEnabled: boolean;
    order: number;
  }>;

  // Template variables (for dynamic content)
  @Column({ name: 'variables', type: 'jsonb', nullable: true })
  variables?: Record<string, {
    label: string;
    defaultValue?: string;
    required: boolean;
  }>;

  /** Sözleşme yazdırma şablonu: dosya yolu (örn. berg-rental-agreement.html) veya inline HTML. Dosya yolu ise backend/src/modules/rentacar/templates/ altından okunur; {{alan}} placeholder'ları rezervasyon verisi ile doldurulur. */
  @Column({ name: 'html_template', type: 'text', nullable: true })
  htmlTemplate?: string | null;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'is_default', default: false })
  isDefault!: boolean; // Default template for tenant
}

