import { Integrator, IssueInvoiceResult, InvoiceDto } from './integrator.interface';

/**
 * Mock integrator for development and testing
 * Returns fake invoice IDs and PDF URLs
 */
export class MockIntegrator implements Integrator {
  key(): string {
    return 'mock';
  }

  async issueInvoice(dto: InvoiceDto, config?: Record<string, unknown>): Promise<IssueInvoiceResult> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generate fake external invoice ID
    const externalInvoiceId = `MOCK-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const externalReference = `REF-${dto.reservationId.substring(0, 8).toUpperCase()}`;

    // Generate fake PDF URL (in real scenario, this would come from integrator)
    const pdfUrl = `https://mock-integrator.example.com/invoices/${externalInvoiceId}.pdf`;

    return {
      success: true,
      externalInvoiceId,
      externalReference,
      pdfUrl,
      responseData: {
        mock: true,
        timestamp: new Date().toISOString(),
        reservationId: dto.reservationId,
      },
    };
  }

  async healthCheck(config?: Record<string, unknown>): Promise<boolean> {
    // Mock integrator is always healthy
    return true;
  }
}

