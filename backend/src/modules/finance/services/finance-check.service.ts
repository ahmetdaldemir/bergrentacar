import { Repository, Between } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { FinanceCheck, FinanceCheckDirection, FinanceCheckStatus } from '../entities/finance-check.entity';

export type CreateFinanceCheckInput = {
  tenantId: string;
  direction: FinanceCheckDirection;
  cariId?: string | null;
  checkNo?: string | null;
  bankName?: string | null;
  issuer?: string | null;
  issueDate?: string | Date | null;
  maturityDate: string | Date;
  amount: number;
  currency?: string;
  status?: FinanceCheckStatus;
  description?: string | null;
  attachmentUrl?: string | null;
};

export type UpdateFinanceCheckInput = Partial<Omit<CreateFinanceCheckInput, 'tenantId'>>;

export class FinanceCheckService {
  private static repository(): Repository<FinanceCheck> {
    return AppDataSource.getRepository(FinanceCheck);
  }

  static async list(
    tenantId: string,
    filters?: {
      direction?: FinanceCheckDirection;
      status?: FinanceCheckStatus;
      from?: Date;
      to?: Date;
      cariId?: string;
    }
  ): Promise<FinanceCheck[]> {
    const where: any = { tenantId };

    if (filters?.direction) where.direction = filters.direction;
    if (filters?.status) where.status = filters.status;
    if (filters?.cariId) where.cariId = filters.cariId;
    if (filters?.from && filters?.to) {
      where.maturityDate = Between(filters.from, filters.to);
    } else if (filters?.from) {
      where.maturityDate = Between(filters.from, new Date('2099-12-31'));
    } else if (filters?.to) {
      where.maturityDate = Between(new Date(0), filters.to);
    }

    return this.repository().find({
      where,
      relations: ['cari'],
      order: { maturityDate: 'ASC' },
    });
  }

  static async getById(id: string, tenantId: string): Promise<FinanceCheck | null> {
    return this.repository().findOne({
      where: { id, tenantId },
      relations: ['cari'],
    });
  }

  static async create(input: CreateFinanceCheckInput): Promise<FinanceCheck> {
    const check = this.repository().create({
      ...input,
      issueDate: input.issueDate ? (typeof input.issueDate === 'string' ? new Date(input.issueDate) : input.issueDate) : null,
      maturityDate: typeof input.maturityDate === 'string' ? new Date(input.maturityDate) : input.maturityDate,
      currency: input.currency || 'TRY',
      status: input.status || FinanceCheckStatus.IN_PORTFOLIO,
    });
    return this.repository().save(check);
  }

  static async update(id: string, tenantId: string, input: UpdateFinanceCheckInput): Promise<FinanceCheck> {
    const check = await this.getById(id, tenantId);
    if (!check) {
      throw new Error('Check not found');
    }

    if (input.issueDate) {
      input.issueDate = typeof input.issueDate === 'string' ? new Date(input.issueDate) : input.issueDate;
    }
    if (input.maturityDate) {
      input.maturityDate = typeof input.maturityDate === 'string' ? new Date(input.maturityDate) : input.maturityDate;
    }

    Object.assign(check, input);
    return this.repository().save(check);
  }

  static async markStatus(id: string, tenantId: string, status: FinanceCheckStatus): Promise<FinanceCheck> {
    const check = await this.getById(id, tenantId);
    if (!check) {
      throw new Error('Check not found');
    }

    check.status = status;
    return this.repository().save(check);
  }

  static async remove(id: string, tenantId: string): Promise<void> {
    const check = await this.getById(id, tenantId);
    if (!check) {
      throw new Error('Check not found');
    }

    await this.repository().remove(check);
  }
}

