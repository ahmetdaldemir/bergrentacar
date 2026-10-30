import { Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { FinanceCategory, FinanceCategoryType } from '../entities/finance-category.entity';

export type CreateFinanceCategoryInput = {
  tenantId: string;
  type: FinanceCategoryType;
  name: string;
  parentId?: string | null;
  color?: string | null;
  isActive?: boolean;
  sort?: number;
};

export type UpdateFinanceCategoryInput = Partial<Omit<CreateFinanceCategoryInput, 'tenantId'>>;

export class FinanceCategoryService {
  private static repository(): Repository<FinanceCategory> {
    return AppDataSource.getRepository(FinanceCategory);
  }

  static async list(tenantId: string, type?: FinanceCategoryType, parentId?: string | null): Promise<FinanceCategory[]> {
    const where: any = { tenantId };
    if (type) where.type = type;
    if (parentId !== undefined) {
      where.parentId = parentId === null ? null : parentId;
    }

    return this.repository().find({
      where,
      relations: ['parent'],
      order: { sort: 'ASC', name: 'ASC' },
    });
  }

  static async getById(id: string, tenantId: string): Promise<FinanceCategory | null> {
    return this.repository().findOne({
      where: { id, tenantId },
      relations: ['parent'],
    });
  }

  static async create(input: CreateFinanceCategoryInput): Promise<FinanceCategory> {
    const category = this.repository().create(input);
    return this.repository().save(category);
  }

  static async update(id: string, tenantId: string, input: UpdateFinanceCategoryInput): Promise<FinanceCategory> {
    const category = await this.getById(id, tenantId);
    if (!category) {
      throw new Error('Category not found');
    }

    Object.assign(category, input);
    return this.repository().save(category);
  }

  static async remove(id: string, tenantId: string): Promise<void> {
    const category = await this.getById(id, tenantId);
    if (!category) {
      throw new Error('Category not found');
    }

    // Check if category has children
    const children = await this.repository().count({ where: { tenantId, parentId: id } });
    if (children > 0) {
      throw new Error('Cannot delete category with children');
    }

    await this.repository().remove(category);
  }

  static async ensureDefaultCategories(tenantId: string): Promise<void> {
    const incomeCategories = ['Transfer Geliri', 'Kira Geliri', 'Diğer Gelirler'];
    const expenseCategories = ['Yakıt', 'Bakım', 'Personel', 'Vergiler', 'Reklam', 'Diğer Giderler'];

    const existing = await this.repository().find({ where: { tenantId } });
    const existingNames = new Set(existing.map(c => `${c.type}:${c.name}`));

    // Create income categories
    for (const name of incomeCategories) {
      const key = `${FinanceCategoryType.INCOME}:${name}`;
      if (!existingNames.has(key)) {
        await this.create({
          tenantId,
          type: FinanceCategoryType.INCOME,
          name,
          isActive: true,
          sort: 0,
        });
      }
    }

    // Create expense categories
    for (const name of expenseCategories) {
      const key = `${FinanceCategoryType.EXPENSE}:${name}`;
      if (!existingNames.has(key)) {
        await this.create({
          tenantId,
          type: FinanceCategoryType.EXPENSE,
          name,
          isActive: true,
          sort: 0,
        });
      }
    }
  }
}

