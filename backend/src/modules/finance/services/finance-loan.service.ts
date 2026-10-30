import { Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { FinanceLoan, FinanceLoanStatus } from '../entities/finance-loan.entity';
import { FinanceLoanInstallment, FinanceLoanInstallmentStatus } from '../entities/finance-loan-installment.entity';

export type CreateFinanceLoanInput = {
  tenantId: string;
  cariId?: string | null;
  title: string;
  principal: number;
  interestRate?: number | null;
  totalCost?: number | null;
  currency?: string;
  startDate: string | Date;
  paymentDay: number; // 1..28
  termCount: number;
  status?: FinanceLoanStatus;
  notes?: string | null;
};

export type UpdateFinanceLoanInput = Partial<Omit<CreateFinanceLoanInput, 'tenantId'>>;

export class FinanceLoanService {
  private static repository(): Repository<FinanceLoan> {
    return AppDataSource.getRepository(FinanceLoan);
  }

  private static installmentRepo(): Repository<FinanceLoanInstallment> {
    return AppDataSource.getRepository(FinanceLoanInstallment);
  }

  static async list(tenantId: string, status?: FinanceLoanStatus): Promise<FinanceLoan[]> {
    const where: any = { tenantId };
    if (status) where.status = status;

    return this.repository().find({
      where,
      relations: ['cari'],
      order: { startDate: 'DESC' },
    });
  }

  static async getById(id: string, tenantId: string, includeInstallments = false): Promise<FinanceLoan | null> {
    const loan = await this.repository().findOne({
      where: { id, tenantId },
      relations: ['cari'],
    });

    if (loan && includeInstallments) {
      (loan as any).installments = await this.installmentRepo().find({
        where: { loanId: id, tenantId },
        order: { installmentNo: 'ASC' },
      });
    }

    return loan;
  }

  static async create(input: CreateFinanceLoanInput): Promise<FinanceLoan> {
    const loan = this.repository().create({
      ...input,
      startDate: typeof input.startDate === 'string' ? new Date(input.startDate) : input.startDate,
      currency: input.currency || 'TRY',
      status: input.status || FinanceLoanStatus.ACTIVE,
    });

    const savedLoan = await this.repository().save(loan);

    // Auto-generate installments
    await this.generateInstallments(savedLoan.id, input.tenantId, input);

    return savedLoan;
  }

  static async update(id: string, tenantId: string, input: UpdateFinanceLoanInput): Promise<FinanceLoan> {
    const loan = await this.getById(id, tenantId);
    if (!loan) {
      throw new Error('Loan not found');
    }

    if (input.startDate) {
      input.startDate = typeof input.startDate === 'string' ? new Date(input.startDate) : input.startDate;
    }

    Object.assign(loan, input);
    return this.repository().save(loan);
  }

  static async close(id: string, tenantId: string): Promise<FinanceLoan> {
    const loan = await this.getById(id, tenantId);
    if (!loan) {
      throw new Error('Loan not found');
    }

    loan.status = FinanceLoanStatus.CLOSED;
    return this.repository().save(loan);
  }

  static async generateInstallments(
    loanId: string,
    tenantId: string,
    loanData: CreateFinanceLoanInput | FinanceLoan
  ): Promise<FinanceLoanInstallment[]> {
    // Check if any installments have been paid
    const existingInstallments = await this.installmentRepo().find({
      where: { loanId, tenantId },
    });

    const hasPaidInstallments = existingInstallments.some(
      inst => inst.status === FinanceLoanInstallmentStatus.PAID
    );

    if (hasPaidInstallments) {
      throw new Error('Cannot regenerate installments: some installments have already been paid');
    }

    // Delete existing installments
    if (existingInstallments.length > 0) {
      await this.installmentRepo().remove(existingInstallments);
    }

    const loan = typeof loanData === 'object' && 'id' in loanData
      ? loanData
      : await this.getById(loanId, tenantId);

    if (!loan) {
      throw new Error('Loan not found');
    }

    const startDate = typeof loan.startDate === 'string' ? new Date(loan.startDate) : loan.startDate;
    const paymentDay = loan.paymentDay;
    const termCount = loan.termCount;
    const principal = Number(loan.principal);
    const totalCost = loan.totalCost ? Number(loan.totalCost) : principal;
    const currency = loan.currency || 'TRY';

    // Calculate installment amount
    const installmentAmount = totalCost / termCount;

    const installments: FinanceLoanInstallment[] = [];

    // Determine first due date
    let firstDueDate = new Date(startDate);
    firstDueDate.setDate(paymentDay);

    // If start date's day is after payment day, first due date should be next month
    if (startDate.getDate() > paymentDay) {
      firstDueDate.setMonth(firstDueDate.getMonth() + 1);
    } else if (startDate.getDate() === paymentDay) {
      // If same day, first installment is in current month
      firstDueDate = new Date(startDate);
    }

    // Generate installments
    for (let i = 0; i < termCount; i++) {
      const dueDate = new Date(firstDueDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      const installment = this.installmentRepo().create({
        tenantId,
        loanId,
        installmentNo: i + 1,
        dueDate,
        amount: installmentAmount,
        currency,
        status: FinanceLoanInstallmentStatus.PLANNED,
      });

      installments.push(installment);
    }

    return this.installmentRepo().save(installments);
  }

  static async remove(id: string, tenantId: string): Promise<void> {
    const loan = await this.getById(id, tenantId);
    if (!loan) {
      throw new Error('Loan not found');
    }

    // Delete installments first (CASCADE should handle this, but explicit is safer)
    await this.installmentRepo().delete({ loanId: id, tenantId });
    await this.repository().remove(loan);
  }
}

