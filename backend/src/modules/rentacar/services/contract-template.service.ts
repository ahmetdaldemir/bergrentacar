import { Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { ContractTemplate, ContractSectionType } from '../entities/contract-template.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

export type CreateContractTemplateInput = {
  tenantId: string;
  name: string;
  description?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  textColor?: string;
  htmlTemplate?: string | null;
  sections?: Array<{
    id: string;
    type: ContractSectionType;
    title: string;
    content: string;
    isLocked: boolean;
    order: number;
    isVisible: boolean;
  }>;
  optionalBlocks?: Array<{
    id: string;
    title: string;
    content: string;
    isEnabled: boolean;
    order: number;
  }>;
  variables?: Record<string, {
    label: string;
    defaultValue?: string;
    required: boolean;
  }>;
  isDefault?: boolean;
};

export type UpdateContractTemplateInput = Partial<Omit<CreateContractTemplateInput, 'tenantId'>> & {
  isActive?: boolean;
};

export class ContractTemplateService {
  private static templateRepo(): Repository<ContractTemplate> {
    return AppDataSource.getRepository(ContractTemplate);
  }

  private static tenantRepo(): Repository<Tenant> {
    return AppDataSource.getRepository(Tenant);
  }

  /**
   * Get default template for tenant or create one if doesn't exist
   */
  static async getDefaultTemplate(tenantId: string): Promise<ContractTemplate> {
    const template = await this.templateRepo().findOne({
      where: { tenantId, isDefault: true, isActive: true },
    });

    if (template) {
      return template;
    }

    // Create default template
    return this.createDefaultTemplate(tenantId);
  }

  /**
   * Create default contract template
   */
  static async createDefaultTemplate(tenantId: string): Promise<ContractTemplate> {
    const defaultSections: ContractTemplate['sections'] = [
      {
        id: 'header',
        type: ContractSectionType.HEADER,
        title: 'Sözleşme Başlığı',
        content: '<h1>ARAÇ KİRALAMA SÖZLEŞMESİ</h1>',
        isLocked: false,
        order: 1,
        isVisible: true,
      },
      {
        id: 'parties',
        type: ContractSectionType.CUSTOM,
        title: 'Taraflar',
        content: '<p><strong>KİRAYA VEREN:</strong> {{companyName}}<br><strong>KİRALAYAN:</strong> {{customerName}}</p>',
        isLocked: false,
        order: 2,
        isVisible: true,
      },
      {
        id: 'vehicle-info',
        type: ContractSectionType.CUSTOM,
        title: 'Araç Bilgileri',
        content: '<p><strong>Araç:</strong> {{vehicleName}}<br><strong>Plaka:</strong> {{plateNumber}}</p>',
        isLocked: false,
        order: 3,
        isVisible: true,
      },
      {
        id: 'rental-terms',
        type: ContractSectionType.LEGAL_CORE,
        title: 'Kiralama Koşulları',
        content: '<p>Bu sözleşme, araç kiralama işlemlerine ilişkin yasal hükümleri içermektedir. Kiralayan, aracı teslim aldığı andan itibaren tüm sorumluluğu üstlenir.</p>',
        isLocked: true,
        order: 4,
        isVisible: true,
      },
      {
        id: 'liability',
        type: ContractSectionType.LEGAL_CORE,
        title: 'Sorumluluk ve Sigorta',
        content: '<p>Kiralayan, aracın kullanımı sırasında meydana gelebilecek tüm hasar, kaza ve sorumluluklardan sorumludur. Araç, kapsamlı sigorta ile korunmaktadır.</p>',
        isLocked: true,
        order: 5,
        isVisible: true,
      },
      {
        id: 'signature',
        type: ContractSectionType.SIGNATURE,
        title: 'İmza',
        content: '<div class="signature-section"><p>Taraflar yukarıdaki koşulları kabul ettiklerini imza ile onaylarlar.</p></div>',
        isLocked: false,
        order: 6,
        isVisible: true,
      },
    ];

    const template = this.templateRepo().create({
      tenantId,
      name: 'Varsayılan Sözleşme Şablonu',
      description: 'Varsayılan araç kiralama sözleşmesi şablonu',
      primaryColor: '#1976D2',
      textColor: '#000000',
      sections: defaultSections,
      isActive: true,
      isDefault: true,
    });

    return this.templateRepo().save(template);
  }

  /**
   * List templates for tenant
   */
  static async list(tenantId: string): Promise<ContractTemplate[]> {
    return this.templateRepo().find({
      where: { tenantId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Get template by ID
   */
  static async getById(id: string, tenantId: string): Promise<ContractTemplate | null> {
    return this.templateRepo().findOne({
      where: { id, tenantId },
    });
  }

  /**
   * Create template
   */
  static async create(input: CreateContractTemplateInput): Promise<ContractTemplate> {
    // If this is set as default, unset other defaults
    if (input.isDefault) {
      await this.templateRepo().update(
        { tenantId: input.tenantId, isDefault: true },
        { isDefault: false }
      );
    }

    const template = this.templateRepo().create({
      tenantId: input.tenantId,
      name: input.name,
      description: input.description,
      logoUrl: input.logoUrl,
      primaryColor: input.primaryColor || '#1976D2',
      secondaryColor: input.secondaryColor,
      textColor: input.textColor || '#000000',
      htmlTemplate: input.htmlTemplate ?? undefined,
      sections: input.sections || [],
      optionalBlocks: input.optionalBlocks,
      variables: input.variables,
      isActive: true,
      isDefault: input.isDefault || false,
    });

    return this.templateRepo().save(template);
  }

  /**
   * Update template
   */
  static async update(
    id: string,
    tenantId: string,
    input: UpdateContractTemplateInput
  ): Promise<ContractTemplate> {
    const template = await this.templateRepo().findOne({
      where: { id, tenantId },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    // If setting as default, unset other defaults
    if (input.isDefault === true) {
      await this.templateRepo().update(
        { tenantId, isDefault: true },
        { isDefault: false }
      );
    }

    // Update sections - preserve locked sections
    if (input.sections) {
      // Merge with existing locked sections
      const existingLockedSections = template.sections.filter(s => s.isLocked);
      const newSections = input.sections.map(s => {
        const existing = existingLockedSections.find(es => es.id === s.id);
        if (existing && existing.isLocked) {
          // Preserve locked content
          return existing;
        }
        return s;
      });
      template.sections = newSections;
    }

    Object.assign(template, {
      name: input.name ?? template.name,
      description: input.description ?? template.description,
      logoUrl: input.logoUrl ?? template.logoUrl,
      primaryColor: input.primaryColor ?? template.primaryColor,
      secondaryColor: input.secondaryColor ?? template.secondaryColor,
      textColor: input.textColor ?? template.textColor,
      htmlTemplate: input.htmlTemplate !== undefined ? input.htmlTemplate : template.htmlTemplate,
      optionalBlocks: input.optionalBlocks ?? template.optionalBlocks,
      variables: input.variables ?? template.variables,
      isDefault: input.isDefault ?? template.isDefault,
      isActive: input.isActive !== undefined ? input.isActive : template.isActive,
    });

    return this.templateRepo().save(template);
  }

  /**
   * Delete template
   */
  static async delete(id: string, tenantId: string): Promise<void> {
    const template = await this.templateRepo().findOne({
      where: { id, tenantId },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    if (template.isDefault) {
      throw new Error('Cannot delete default template');
    }

    await this.templateRepo().remove(template);
  }
}

