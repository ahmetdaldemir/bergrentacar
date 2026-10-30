import { Repository, Between } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { FinanceTransaction, FinanceTransactionType, FinanceTransactionStatus, FinancePaymentMethod } from '../entities/finance-transaction.entity';

export type CreateFinanceTransactionInput = {
  tenantId: string;
  type: FinanceTransactionType;
  date: string | Date;
  amount: number;
  currency?: string;
  categoryId?: string | null;
  cariId?: string | null;
  paymentMethod?: string;
  description?: string | null;
  referenceNo?: string | null;
  attachmentUrl?: string | null;
  status?: FinanceTransactionStatus;
  reservationId?: string | null;
  transferReservationId?: string | null;
};

export type UpdateFinanceTransactionInput = Partial<Omit<CreateFinanceTransactionInput, 'tenantId'>>;

export class FinanceTransactionService {
  private static repository(): Repository<FinanceTransaction> {
    return AppDataSource.getRepository(FinanceTransaction);
  }

  static async list(
    tenantId: string,
    filters?: {
      type?: FinanceTransactionType;
      from?: Date;
      to?: Date;
      categoryId?: string;
      cariId?: string;
      status?: FinanceTransactionStatus;
      reservationId?: string;
      transferReservationId?: string;
    }
  ): Promise<FinanceTransaction[]> {
    const where: any = { tenantId };

    if (filters?.type) where.type = filters.type;
    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.cariId) where.cariId = filters.cariId;
    if (filters?.status) where.status = filters.status;
    if (filters?.reservationId) where.reservationId = filters.reservationId;
    if (filters?.transferReservationId) where.transferReservationId = filters.transferReservationId;
    if (filters?.from && filters?.to) {
      where.date = Between(filters.from, filters.to);
    } else if (filters?.from) {
      where.date = Between(filters.from, new Date());
    } else if (filters?.to) {
      where.date = Between(new Date(0), filters.to);
    }

    return this.repository().find({
      where,
      relations: ['category', 'cari'],
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  static async getById(id: string, tenantId: string): Promise<FinanceTransaction | null> {
    return this.repository().findOne({
      where: { id, tenantId },
      relations: ['category', 'cari'],
    });
  }

  static async create(input: CreateFinanceTransactionInput): Promise<FinanceTransaction> {
    const transaction = this.repository().create({
      tenantId: input.tenantId,
      type: input.type,
      date: typeof input.date === 'string' ? new Date(input.date) : input.date,
      amount: input.amount,
      currency: input.currency || 'TRY',
      categoryId: input.categoryId || null,
      cariId: input.cariId || null,
      paymentMethod: (input.paymentMethod as FinancePaymentMethod) || FinancePaymentMethod.TRANSFER,
      description: input.description || null,
      referenceNo: input.referenceNo || null,
      attachmentUrl: input.attachmentUrl || null,
      status: input.status || FinanceTransactionStatus.PAID,
      reservationId: input.reservationId || null,
      transferReservationId: input.transferReservationId || null,
    });
    return this.repository().save(transaction);
  }

  static async update(id: string, tenantId: string, input: UpdateFinanceTransactionInput): Promise<FinanceTransaction> {
    const transaction = await this.getById(id, tenantId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (input.date) {
      input.date = typeof input.date === 'string' ? new Date(input.date) : input.date;
    }

    Object.assign(transaction, input);
    return this.repository().save(transaction);
  }

  static async remove(id: string, tenantId: string): Promise<void> {
    const transaction = await this.getById(id, tenantId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    await this.repository().remove(transaction);
  }
}

