import { Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { Contract, ContractStatus } from '../entities/contract.entity';
import { ContractTemplate } from '../entities/contract-template.entity';
import { ContractBuilderService, RenderContractInput } from './contract-builder.service';
import { generatePDF, generateThermalPDF } from '../../../utils/pdf-generator';
import { sendMail } from '../../../services/mail.service';
import path from 'path';
import fs from 'fs';
import { getUploadsDir } from '../../shared/controllers/file-upload.controller';

export type CreateContractInput = {
  tenantId: string;
  templateId: string;
  vehicleId?: string;
  reservationId?: string;
  variables: Record<string, string>;
  optionalBlocks?: Array<{
    id: string;
    isEnabled: boolean;
  }>;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerIdNumber?: string;
  createdByUserId?: string;
};

export type SignContractInput = {
  customerSignature: {
    signerName: string;
    signerEmail?: string;
    signerPhone?: string;
    signatureImage?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  companySignature?: {
    signerName: string;
    signatureImage?: string;
  };
};

export class ContractService {
  private static contractRepo(): Repository<Contract> {
    return AppDataSource.getRepository(Contract);
  }

  private static templateRepo(): Repository<ContractTemplate> {
    return AppDataSource.getRepository(ContractTemplate);
  }

  /**
   * Generate unique contract number
   */
  private static generateContractNumber(tenantId: string): string {
    const prefix = 'CNT';
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${year}-${random}`;
  }

  /**
   * Create contract from template
   */
  static async create(input: CreateContractInput): Promise<Contract> {
    // Get template
    const template = await this.templateRepo().findOne({
      where: { id: input.templateId, tenantId: input.tenantId },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    // Generate contract number
    const contractNumber = this.generateContractNumber(input.tenantId);

    // Render contract
    const rendered = ContractBuilderService.renderContract({
      template,
      variables: {
        ...input.variables,
        contractNumber,
        date: new Date().toLocaleDateString('tr-TR'),
      },
      optionalBlocks: input.optionalBlocks,
    });

    // Create contract
    const contract = this.contractRepo().create({
      tenantId: input.tenantId,
      templateId: input.templateId,
      vehicleId: input.vehicleId,
      reservationId: input.reservationId,
      contractNumber,
      status: ContractStatus.DRAFT,
      content: {
        sections: rendered.sections,
        variables: input.variables,
        styling: rendered.styling,
      },
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      customerIdNumber: input.customerIdNumber,
      createdByUserId: input.createdByUserId,
    });

    return this.contractRepo().save(contract);
  }

  /**
   * Get contract by ID
   */
  static async getById(id: string, tenantId: string): Promise<Contract | null> {
    return this.contractRepo().findOne({
      where: { id, tenantId },
      relations: ['template', 'vehicle', 'reservation'],
    });
  }

  /**
   * List contracts for tenant
   */
  static async list(tenantId: string, status?: ContractStatus): Promise<Contract[]> {
    const where: any = { tenantId };
    if (status) {
      where.status = status;
    }

    return this.contractRepo().find({
      where,
      relations: ['template', 'vehicle', 'reservation'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Update contract (draft only)
   */
  static async update(
    id: string,
    tenantId: string,
    input: Partial<CreateContractInput>
  ): Promise<Contract> {
    const contract = await this.contractRepo().findOne({
      where: { id, tenantId },
      relations: ['template'],
    });

    if (!contract) {
      throw new Error('Contract not found');
    }

    if (contract.status !== ContractStatus.DRAFT) {
      throw new Error('Only draft contracts can be updated');
    }

    // Re-render if template or variables changed
    if (input.variables || input.optionalBlocks) {
      const template = contract.template;
      const rendered = ContractBuilderService.renderContract({
        template,
        variables: {
          ...contract.content.variables,
          ...(input.variables || {}),
          contractNumber: contract.contractNumber,
          date: new Date().toLocaleDateString('tr-TR'),
        },
        optionalBlocks: input.optionalBlocks || contract.content.sections.map(s => ({
          id: s.id,
          isEnabled: true,
        })),
      });

      contract.content = {
        sections: rendered.sections,
        variables: { ...contract.content.variables, ...(input.variables || {}) },
        styling: rendered.styling,
      };
    }

    if (input.customerName) contract.customerName = input.customerName;
    if (input.customerEmail) contract.customerEmail = input.customerEmail;
    if (input.customerPhone) contract.customerPhone = input.customerPhone;
    if (input.customerIdNumber) contract.customerIdNumber = input.customerIdNumber;

    return this.contractRepo().save(contract);
  }

  /**
   * Sign contract (add digital signatures)
   */
  static async signContract(
    id: string,
    tenantId: string,
    input: SignContractInput
  ): Promise<Contract> {
    const contract = await this.contractRepo().findOne({
      where: { id, tenantId },
      relations: ['template'],
    });

    if (!contract) {
      throw new Error('Contract not found');
    }

    // Add signatures
    contract.customerSignature = {
      signerName: input.customerSignature.signerName,
      signerEmail: input.customerSignature.signerEmail,
      signerPhone: input.customerSignature.signerPhone,
      signatureImage: input.customerSignature.signatureImage,
      signedAt: new Date(),
      ipAddress: input.customerSignature.ipAddress,
      userAgent: input.customerSignature.userAgent,
    };

    if (input.companySignature) {
      contract.companySignature = {
        signerName: input.companySignature.signerName,
        signatureImage: input.companySignature.signatureImage,
        signedAt: new Date(),
      };
    }

    contract.status = ContractStatus.SIGNED;
    contract.signedAt = new Date();

    // Generate PDF
    await this.generateContractPDF(contract);

    // Send emails and WhatsApp (async)
    this.sendContractNotifications(contract).catch(console.error);

    return this.contractRepo().save(contract);
  }

  /**
   * Generate PDF for contract
   */
  static async generateContractPDF(contract: Contract): Promise<string> {
    // Re-render contract with signatures
    const template = await this.templateRepo().findOne({
      where: { id: contract.templateId },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    // Add signature HTML to content
    const signatureHTML = this.generateSignatureHTML(contract);
    const htmlWithSignatures = ContractBuilderService.renderContract({
      template,
      variables: contract.content.variables,
    }).html.replace('</body>', `${signatureHTML}</body>`);

    // Generate PDF
    const filename = `contract-${contract.contractNumber}-${Date.now()}.pdf`;
    const { path: pdfPath } = await generatePDF({
      html: htmlWithSignatures,
      outputPath: filename,
      format: 'A4',
    });

    // Save PDF URL
    contract.pdfUrl = `/uploads/${filename}`;
    contract.pdfGeneratedAt = new Date();
    await this.contractRepo().save(contract);

    return contract.pdfUrl;
  }

  /**
   * Generate thermal printer PDF
   */
  static async generateThermalPDF(contract: Contract): Promise<Buffer> {
    const template = await this.templateRepo().findOne({
      where: { id: contract.templateId },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    const rendered = ContractBuilderService.renderContract({
      template,
      variables: contract.content.variables,
    });

    const signatureHTML = this.generateSignatureHTML(contract);
    const htmlWithSignatures = rendered.html.replace('</body>', `${signatureHTML}</body>`);

    const { buffer } = await generateThermalPDF(htmlWithSignatures);
    return buffer;
  }

  /**
   * Generate signature HTML
   */
  private static generateSignatureHTML(contract: Contract): string {
    let html = '<div class="contract-section-signature">';
    html += '<div class="signature-section">';

    // Customer signature
    if (contract.customerSignature) {
      html += `
        <div class="signature-box">
          <p><strong>Kiralayan</strong></p>
          ${contract.customerSignature.signatureImage ? `<img src="${contract.customerSignature.signatureImage}" alt="Signature" class="signature-image" />` : ''}
          <div class="signature-line">
            <p>${contract.customerSignature.signerName}</p>
            <p>${contract.customerSignature.signedAt ? new Date(contract.customerSignature.signedAt).toLocaleDateString('tr-TR') : ''}</p>
          </div>
        </div>
      `;
    }

    // Company signature
    if (contract.companySignature) {
      html += `
        <div class="signature-box">
          <p><strong>Kiraya Veren</strong></p>
          ${contract.companySignature.signatureImage ? `<img src="${contract.companySignature.signatureImage}" alt="Signature" class="signature-image" />` : ''}
          <div class="signature-line">
            <p>${contract.companySignature.signerName}</p>
            <p>${contract.companySignature.signedAt ? new Date(contract.companySignature.signedAt).toLocaleDateString('tr-TR') : ''}</p>
          </div>
        </div>
      `;
    }

    html += '</div></div>';
    return html;
  }

  /**
   * Send contract via email and WhatsApp
   */
  private static async sendContractNotifications(contract: Contract): Promise<void> {
    if (!contract.pdfUrl || !contract.customerEmail) {
      return;
    }

    const uploadsDir = getUploadsDir();
    const pdfPath = path.join(uploadsDir, contract.pdfUrl.replace('/uploads/', ''));

    if (!fs.existsSync(pdfPath)) {
      console.error(`PDF not found: ${pdfPath}`);
      return;
    }

    // Send email
    try {
      await sendMail({
        tenantId: contract.tenantId,
        to: contract.customerEmail,
        subject: `Sözleşme - ${contract.contractNumber}`,
        html: `
          <h2>Sözleşme</h2>
          <p>Sayın ${contract.customerName},</p>
          <p>İmzaladığınız sözleşme ekte gönderilmiştir.</p>
          <p><strong>Sözleşme No:</strong> ${contract.contractNumber}</p>
          <p>İyi günler dileriz.</p>
        `,
        attachments: [
          {
            filename: `contract-${contract.contractNumber}.pdf`,
            path: pdfPath,
          },
        ],
      });

      contract.emailSent = true;
      contract.emailSentAt = new Date();
      await this.contractRepo().save(contract);
    } catch (error) {
      console.error('Failed to send contract email:', error);
    }

    // TODO: Send WhatsApp (implement WhatsApp integration)
    // For now, just mark as attempted
    contract.whatsappSent = false;
  }

  /**
   * Delete contract (only drafts)
   */
  static async delete(id: string, tenantId: string): Promise<void> {
    const contract = await this.contractRepo().findOne({
      where: { id, tenantId },
    });

    if (!contract) {
      throw new Error('Contract not found');
    }

    if (contract.status !== ContractStatus.DRAFT) {
      throw new Error('Only draft contracts can be deleted');
    }

    await this.contractRepo().remove(contract);
  }
}

