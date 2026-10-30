import { Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { EmailTemplate, EmailTemplateType } from '../entities/email-template.entity';

export type CreateEmailTemplateInput = {
  tenantId: string;
  languageId?: string;
  type: EmailTemplateType;
  name: string;
  subject: string;
  body: string;
  isActive?: boolean;
  description?: string;
};

export type UpdateEmailTemplateInput = Partial<CreateEmailTemplateInput>;

export class EmailTemplateService {
  private static repository(): Repository<EmailTemplate> {
    return AppDataSource.getRepository(EmailTemplate);
  }

  static async list(tenantId: string, languageId?: string): Promise<EmailTemplate[]> {
    const where: any = { tenantId };
    if (languageId) {
      where.languageId = languageId;
    }

    return this.repository().find({
      where,
      relations: ['language'],
      order: { type: 'ASC', name: 'ASC' },
    });
  }

  static async getById(id: string): Promise<EmailTemplate | null> {
    return this.repository().findOne({
      where: { id },
      relations: ['language'],
    });
  }

  static async getByType(
    tenantId: string,
    type: EmailTemplateType,
    languageId?: string
  ): Promise<EmailTemplate | null> {
    const where: any = { tenantId, type, isActive: true };
    if (languageId) {
      where.languageId = languageId;
    }

    // If language specified, try exact match first
    if (languageId) {
      const exact = await this.repository().findOne({
        where,
        relations: ['language'],
      });
      if (exact) return exact;
    }

    // Fallback to any active template of this type
    return this.repository().findOne({
      where: { tenantId, type, isActive: true },
      relations: ['language'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Rezervasyon e-postası: yalnızca verilen dildeki şablon; başka dildeki şablon kullanılmaz.
   */
  static async getByTypeStrictLanguage(
    tenantId: string,
    type: EmailTemplateType,
    languageId: string | null | undefined
  ): Promise<EmailTemplate | null> {
    if (!languageId) return null;
    return this.repository().findOne({
      where: { tenantId, type, isActive: true, languageId },
      relations: ['language'],
    });
  }

  static async create(input: CreateEmailTemplateInput): Promise<EmailTemplate> {
    const repo = this.repository();
    const template = repo.create({
      tenantId: input.tenantId,
      languageId: input.languageId,
      type: input.type,
      name: input.name,
      subject: input.subject,
      body: input.body,
      isActive: input.isActive ?? true,
      description: input.description,
    });

    return repo.save(template);
  }

  static async update(id: string, input: UpdateEmailTemplateInput): Promise<EmailTemplate> {
    const repo = this.repository();
    const template = await repo.findOne({ where: { id } });

    if (!template) {
      throw new Error('Email template not found');
    }

    Object.assign(template, input);
    return repo.save(template);
  }

  static async delete(id: string): Promise<void> {
    const template = await this.repository().findOne({ where: { id } });
    if (!template) {
      throw new Error('Email template not found');
    }

    await this.repository().remove(template);
  }

  /**
   * Replace template variables with actual values from reservation
   * Supported variables:
   * - {{customerName}}
   * - {{customerEmail}}
   * - {{customerPhone}}
   * - {{reservationReference}}
   * - {{checkIn}}
   * - {{checkOut}}
   * - {{reservationType}}
   * - {{reservationStatus}}
   */
  static replaceVariables(template: string, variables: Record<string, string | number | null | undefined>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, value?.toString() || '');
    }
    return result;
  }
}

