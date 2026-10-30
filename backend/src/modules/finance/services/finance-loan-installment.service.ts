import { Repository, In } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { FinanceLoanInstallment, FinanceLoanInstallmentStatus } from '../entities/finance-loan-installment.entity';

export class FinanceLoanInstallmentService {
  private static repository(): Repository<FinanceLoanInstallment> {
    return AppDataSource.getRepository(FinanceLoanInstallment);
  }

  static async list(tenantId: string, loanId?: string): Promise<FinanceLoanInstallment[]> {
    const where: any = { tenantId };
    if (loanId) where.loanId = loanId;

    return this.repository().find({
      where,
      relations: ['loan'],
      order: { installmentNo: 'ASC' },
    });
  }

  static async getById(id: string, tenantId: string): Promise<FinanceLoanInstallment | null> {
    return this.repository().findOne({
      where: { id, tenantId },
      relations: ['loan'],
    });
  }

  static async pay(
    id: string,
    tenantId: string,
    paidAmount: number,
    paymentMethod?: string
  ): Promise<FinanceLoanInstallment> {
    const installment = await this.getById(id, tenantId);
    if (!installment) {
      throw new Error('Installment not found');
    }

    installment.paidAt = new Date();
    installment.paidAmount = paidAmount;
    installment.status = FinanceLoanInstallmentStatus.PAID;

    return this.repository().save(installment);
  }

  static async cancel(id: string, tenantId: string): Promise<FinanceLoanInstallment> {
    const installment = await this.getById(id, tenantId);
    if (!installment) {
      throw new Error('Installment not found');
    }

    installment.status = FinanceLoanInstallmentStatus.CANCELLED;
    return this.repository().save(installment);
  }

  static async updateStatuses(tenantId: string): Promise<void> {
    // Update installment statuses based on due dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const installments = await this.repository().find({
      where: {
        tenantId,
        status: In([
          FinanceLoanInstallmentStatus.PLANNED,
          FinanceLoanInstallmentStatus.DUE,
          FinanceLoanInstallmentStatus.OVERDUE,
        ]),
      },
    });

    for (const installment of installments) {
      const dueDate = new Date(installment.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      if (installment.status === FinanceLoanInstallmentStatus.PAID) {
        continue; // Skip paid installments
      }

      if (dueDate < today) {
        installment.status = FinanceLoanInstallmentStatus.OVERDUE;
      } else if (dueDate.getTime() === today.getTime()) {
        installment.status = FinanceLoanInstallmentStatus.DUE;
      } else {
        installment.status = FinanceLoanInstallmentStatus.PLANNED;
      }

      await this.repository().save(installment);
    }
  }
}

