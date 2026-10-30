import { ContractTemplate, ContractSectionType } from '../entities/contract-template.entity';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface RenderContractInput {
  template: ContractTemplate;
  variables: Record<string, string>;
  optionalBlocks?: Array<{
    id: string;
    isEnabled: boolean;
  }>;
}

export interface RenderedContract {
  html: string;
  sections: Array<{
    id: string;
    type: string;
    title: string;
    content: string;
    order: number;
  }>;
  styling: {
    logoUrl?: string;
    primaryColor: string;
    secondaryColor?: string;
    textColor: string;
  };
}

export class ContractBuilderService {
  /**
   * Replace {{key}} placeholders in HTML template. Missing keys become empty string.
   */
  static renderHtmlTemplate(htmlTemplate: string, variables: Record<string, string>): string {
    let out = htmlTemplate;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${escapeRegExp(key)}\\}\\}`, 'g');
      out = out.replace(regex, value != null ? String(value) : '');
    }
    // Replace any remaining {{...}} with empty string
    out = out.replace(/\{\{[^}]+\}\}/g, '');
    return out;
  }

  /**
   * Render contract HTML from template and variables
   */
  static renderContract(input: RenderContractInput): RenderedContract {
    const { template, variables, optionalBlocks = [] } = input;

    // Filter visible sections
    const visibleSections = template.sections
      .filter(section => section.isVisible)
      .sort((a, b) => a.order - b.order);

    // Process sections with variable replacement
    const processedSections = visibleSections.map(section => {
      let content = section.content;

      // Replace variables in content
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        content = content.replace(regex, value || '');
      }

      return {
        id: section.id,
        type: section.type,
        title: section.title,
        content,
        order: section.order,
      };
    });

    // Add optional blocks if enabled
    if (template.optionalBlocks) {
      const enabledOptionalBlocks = template.optionalBlocks
        .filter(block => {
          const override = optionalBlocks.find(ob => ob.id === block.id);
          return override ? override.isEnabled : block.isEnabled;
        })
        .sort((a, b) => a.order - b.order);

      enabledOptionalBlocks.forEach(block => {
        let content = block.content;
        // Replace variables
        for (const [key, value] of Object.entries(variables)) {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
          content = content.replace(regex, value || '');
        }

        processedSections.push({
          id: block.id,
          type: ContractSectionType.CUSTOM,
          title: block.title,
          content,
          order: block.order + 1000, // Append after main sections
        });
      });
    }

    // Sort sections by order
    processedSections.sort((a, b) => a.order - b.order);

    // Generate HTML
    const html = this.generateHTML(processedSections, template, variables);

    return {
      html,
      sections: processedSections,
      styling: {
        logoUrl: template.logoUrl,
        primaryColor: template.primaryColor,
        secondaryColor: template.secondaryColor,
        textColor: template.textColor,
      },
    };
  }

  /**
   * Generate full HTML document
   */
  private static generateHTML(
    sections: Array<{ id: string; type: string; title: string; content: string }>,
    template: ContractTemplate,
    variables: Record<string, string>
  ): string {
    const sectionsHTML = sections
      .map(section => {
        const sectionClass = `contract-section contract-section-${section.type}`;
        return `
          <div class="${sectionClass}" data-section-id="${section.id}">
            ${section.type !== 'signature' ? `<h2 class="section-title">${section.title}</h2>` : ''}
            <div class="section-content">${section.content}</div>
          </div>
        `;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sözleşme - ${variables.contractNumber || 'Draft'}</title>
        <style>
          ${this.getContractStyles(template)}
        </style>
      </head>
      <body>
        <div class="contract-container">
          ${template.logoUrl ? `<div class="contract-header"><img src="${template.logoUrl}" alt="Logo" class="contract-logo" /></div>` : ''}
          ${sectionsHTML}
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get contract CSS styles
   */
  private static getContractStyles(template: ContractTemplate): string {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: 'Arial', 'Helvetica', sans-serif;
        color: ${template.textColor};
        line-height: 1.6;
        background: #fff;
      }
      
      .contract-container {
        max-width: 210mm;
        margin: 0 auto;
        padding: 20mm;
        background: white;
      }
      
      .contract-header {
        text-align: center;
        margin-bottom: 30px;
        border-bottom: 2px solid ${template.primaryColor};
        padding-bottom: 20px;
      }
      
      .contract-logo {
        max-height: 80px;
        max-width: 200px;
      }
      
      .contract-section {
        margin-bottom: 25px;
        page-break-inside: avoid;
      }
      
      .contract-section-legal_core {
        background: #f5f5f5;
        padding: 15px;
        border-left: 4px solid ${template.primaryColor};
        font-size: 0.9em;
      }
      
      .contract-section-header h1 {
        color: ${template.primaryColor};
        text-align: center;
        margin-bottom: 20px;
      }
      
      .section-title {
        color: ${template.primaryColor};
        font-size: 1.2em;
        margin-bottom: 10px;
        font-weight: bold;
      }
      
      .section-content {
        margin-top: 10px;
      }
      
      .contract-section-signature {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 2px solid ${template.primaryColor};
      }
      
      .signature-section {
        display: flex;
        justify-content: space-between;
        margin-top: 40px;
      }
      
      .signature-box {
        width: 45%;
        text-align: center;
        padding: 20px;
        border: 1px solid #ddd;
      }
      
      .signature-line {
        border-top: 2px solid ${template.textColor};
        margin-top: 60px;
        padding-top: 5px;
      }
      
      @media print {
        .contract-container {
          padding: 15mm;
        }
        .contract-section {
          page-break-inside: avoid;
        }
      }
      
      @media print and (max-width: 80mm) {
        /* Thermal printer styles */
        .contract-container {
          max-width: 80mm;
          padding: 5mm;
          font-size: 10px;
        }
        .contract-logo {
          max-height: 40px;
        }
        .section-title {
          font-size: 12px;
        }
      }
    `;
  }
}

