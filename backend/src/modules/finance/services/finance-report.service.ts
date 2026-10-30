import { Repository, Between } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { FinanceTransaction, FinanceTransactionType, FinanceTransactionStatus } from '../entities/finance-transaction.entity';
import { FinanceCheck, FinanceCheckStatus } from '../entities/finance-check.entity';
import { FinanceLoanInstallment, FinanceLoanInstallmentStatus } from '../entities/finance-loan-installment.entity';

export class FinanceReportService {
  private static transactionRepo(): Repository<FinanceTransaction> {
    return AppDataSource.getRepository(FinanceTransaction);
  }

  private static checkRepo(): Repository<FinanceCheck> {
    return AppDataSource.getRepository(FinanceCheck);
  }

  private static installmentRepo(): Repository<FinanceLoanInstallment> {
    return AppDataSource.getRepository(FinanceLoanInstallment);
  }

  static async getSummary(tenantId: string, from?: Date, to?: Date) {
    const where: any = { tenantId };
    if (from && to) {
      where.date = Between(from, to);
    }

    const transactions = await this.transactionRepo().find({ where });

    const incomeTotal = transactions
      .filter(t => t.type === FinanceTransactionType.INCOME && t.status === FinanceTransactionStatus.PAID)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expenseTotal = transactions
      .filter(t => t.type === FinanceTransactionType.EXPENSE && t.status === FinanceTransactionStatus.PAID)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const incomePlanned = transactions
      .filter(t => t.type === FinanceTransactionType.INCOME && t.status === FinanceTransactionStatus.PLANNED)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expensePlanned = transactions
      .filter(t => t.type === FinanceTransactionType.EXPENSE && t.status === FinanceTransactionStatus.PLANNED)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const netTotal = incomeTotal - expenseTotal;

    // Get due soon and overdue items
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);

    const checks = await this.checkRepo().find({
      where: { tenantId },
    });

    const installments = await this.installmentRepo().find({
      where: { tenantId },
    });

    const dueSoonChecks = checks.filter(c => {
      const maturity = new Date(c.maturityDate);
      maturity.setHours(0, 0, 0, 0);
      return maturity >= today && maturity <= threeDaysLater && 
             (c.status === FinanceCheckStatus.IN_PORTFOLIO || c.status === FinanceCheckStatus.ENDORSED);
    });

    const overdueChecks = checks.filter(c => {
      const maturity = new Date(c.maturityDate);
      maturity.setHours(0, 0, 0, 0);
      return maturity < today && 
             (c.status === FinanceCheckStatus.IN_PORTFOLIO || c.status === FinanceCheckStatus.ENDORSED);
    });

    const dueSoonInstallments = installments.filter(i => {
      const due = new Date(i.dueDate);
      due.setHours(0, 0, 0, 0);
      return due >= today && due <= threeDaysLater && 
             (i.status === FinanceLoanInstallmentStatus.PLANNED || i.status === FinanceLoanInstallmentStatus.DUE);
    });

    const overdueInstallments = installments.filter(i => {
      const due = new Date(i.dueDate);
      due.setHours(0, 0, 0, 0);
      return due < today && 
             (i.status === FinanceLoanInstallmentStatus.PLANNED || i.status === FinanceLoanInstallmentStatus.DUE || i.status === FinanceLoanInstallmentStatus.OVERDUE);
    });

    return {
      incomeTotal: Number(incomeTotal.toFixed(2)),
      expenseTotal: Number(expenseTotal.toFixed(2)),
      netTotal: Number(netTotal.toFixed(2)),
      incomePlanned: Number(incomePlanned.toFixed(2)),
      expensePlanned: Number(expensePlanned.toFixed(2)),
      dueSoonCount: dueSoonChecks.length + dueSoonInstallments.length,
      overdueCount: overdueChecks.length + overdueInstallments.length,
    };
  }
}

