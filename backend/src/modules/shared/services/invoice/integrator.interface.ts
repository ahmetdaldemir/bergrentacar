/**
 * Result of issuing an invoice through an integrator
 */
export interface IssueInvoiceResult {
  success: boolean;
  externalInvoiceId?: string;
  externalReference?: string;
  pdfUrl?: string;
  errorMessage?: string;
  responseData?: Record<string, unknown>;
}

/**
 * Invoice DTO passed to integrators
 */
export interface InvoiceDto {
  reservationId: string;
  tenantId: string;
  customerName: string;
  customerEmail: string;
  customerTaxNumber?: string;
  customerAddress?: string;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  currencyCode: string;
  items: InvoiceItemDto[];
  metadata?: Record<string, unknown>;
}

export interface InvoiceItemDto {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

/**
 * Base interface for e-invoice integrators
 */
export interface Integrator {
  /**
   * Unique key identifying this integrator (e.g., 'parasut', 'mock', 'entegrator_x')
   */
  key(): string;

  /**
   * Issue an invoice through this integrator
   */
  issueInvoice(dto: InvoiceDto, config?: Record<string, unknown>): Promise<IssueInvoiceResult>;

  /**
   * Optional: Check if integrator is healthy/available
   */
  healthCheck?(config?: Record<string, unknown>): Promise<boolean>;
}

