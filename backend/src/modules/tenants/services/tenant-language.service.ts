import { Repository, In } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { TenantLanguage } from '../entities/tenant-language.entity';
import { Language } from '../../shared/entities/language.entity';
import { Tenant } from '../entities/tenant.entity';

export type CreateTenantLanguageInput = {
  tenantId: string;
  languageId: string;
  isActive?: boolean;
  sortOrder?: number;
};

export type UpdateTenantLanguageInput = {
  isActive?: boolean;
  isDefault?: boolean;
  sortOrder?: number;
};

export type BulkUpdateTenantLanguagesInput = {
  tenantId: string;
  languageIds: string[]; // Aktif edilecek dil ID'leri
};

export class TenantLanguageService {
  private static repo(): Repository<TenantLanguage> {
    return AppDataSource.getRepository(TenantLanguage);
  }

  private static languageRepo(): Repository<Language> {
    return AppDataSource.getRepository(Language);
  }

  private static tenantRepo(): Repository<Tenant> {
    return AppDataSource.getRepository(Tenant);
  }

  /**
   * Get all languages for a tenant (with active status)
   */
  static async list(tenantId: string, isActive?: boolean): Promise<TenantLanguage[]> {
    const where: any = { tenantId };
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    return this.repo().find({
      where,
      relations: ['language'],
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  /**
   * Get active language IDs for a tenant
   */
  static async getActiveLanguageIds(tenantId: string): Promise<string[]> {
    const tenantLanguages = await this.repo().find({
      where: { tenantId, isActive: true },
      select: ['languageId'],
    });

    return tenantLanguages.map((tl) => tl.languageId);
  }

  /**
   * Get default language for a tenant
   */
  static async getDefaultLanguage(tenantId: string): Promise<TenantLanguage | null> {
    return this.repo().findOne({
      where: { tenantId, isDefault: true, isActive: true },
      relations: ['language'],
    });
  }

  /**
   * Get default language ID for a tenant
   */
  static async getDefaultLanguageId(tenantId: string): Promise<string | null> {
    const defaultLanguage = await this.getDefaultLanguage(tenantId);
    return defaultLanguage?.languageId || null;
  }

  /**
   * Check if a language is active for a tenant
   */
  static async isLanguageActive(tenantId: string, languageId: string): Promise<boolean> {
    const tenantLanguage = await this.repo().findOne({
      where: { tenantId, languageId, isActive: true },
    });

    return !!tenantLanguage;
  }

  /**
   * Get tenant language by ID
   */
  static async getById(id: string, tenantId: string): Promise<TenantLanguage | null> {
    return this.repo().findOne({
      where: { id, tenantId },
      relations: ['language', 'tenant'],
    });
  }

  /**
   * Create a tenant language
   */
  static async create(input: CreateTenantLanguageInput): Promise<TenantLanguage> {
    const repo = this.repo();

    // Check if already exists
    const existing = await repo.findOne({
      where: {
        tenantId: input.tenantId,
        languageId: input.languageId,
      },
    });

    if (existing) {
      throw new Error('Bu dil zaten bu firma için tanımlı');
    }

    // Verify tenant exists
    const tenant = await this.tenantRepo().findOne({ where: { id: input.tenantId } });
    if (!tenant) {
      throw new Error('Firma bulunamadı');
    }

    // Verify language exists
    const language = await this.languageRepo().findOne({ where: { id: input.languageId } });
    if (!language) {
      throw new Error('Dil bulunamadı');
    }

    const tenantLanguage = repo.create({
      tenantId: input.tenantId,
      languageId: input.languageId,
      isActive: input.isActive !== undefined ? input.isActive : true,
      sortOrder: input.sortOrder ?? 0,
    });

    return repo.save(tenantLanguage);
  }

  /**
   * Update tenant language
   */
  static async update(
    id: string,
    tenantId: string,
    input: UpdateTenantLanguageInput
  ): Promise<TenantLanguage> {
    const repo = this.repo();
    const tenantLanguage = await repo.findOne({ where: { id, tenantId } });

    if (!tenantLanguage) {
      throw new Error('Firma dili bulunamadı');
    }

    if (typeof input.isActive === 'boolean') {
      tenantLanguage.isActive = input.isActive;
    }

    if (typeof input.isDefault === 'boolean') {
      // If setting as default, unset other defaults for this tenant
      if (input.isDefault) {
        await repo.update(
          { tenantId, isDefault: true },
          { isDefault: false }
        );
        tenantLanguage.isDefault = true;
      } else {
        tenantLanguage.isDefault = false;
      }
    }

    if (typeof input.sortOrder === 'number') {
      tenantLanguage.sortOrder = input.sortOrder;
    }

    return repo.save(tenantLanguage);
  }

  /**
   * Set default language for a tenant
   */
  static async setDefaultLanguage(tenantId: string, tenantLanguageId: string): Promise<TenantLanguage> {
    const repo = this.repo();
    
    // Verify tenant language exists and belongs to tenant
    const tenantLanguage = await repo.findOne({
      where: { id: tenantLanguageId, tenantId },
    });

    if (!tenantLanguage) {
      throw new Error('Firma dili bulunamadı');
    }

    if (!tenantLanguage.isActive) {
      throw new Error('Varsayılan dil aktif olmalıdır');
    }

    // Unset all other defaults for this tenant
    await repo.update(
      { tenantId, isDefault: true },
      { isDefault: false }
    );

    // Set this as default
    tenantLanguage.isDefault = true;
    return repo.save(tenantLanguage);
  }

  /**
   * Delete tenant language
   */
  static async delete(id: string, tenantId: string): Promise<void> {
    const repo = this.repo();
    const tenantLanguage = await repo.findOne({ where: { id, tenantId } });

    if (!tenantLanguage) {
      throw new Error('Firma dili bulunamadı');
    }

    await repo.remove(tenantLanguage);
  }

  /**
   * Bulk update tenant languages (set active languages)
   * This will:
   * 1. Activate languages in languageIds
   * 2. Deactivate languages not in languageIds
   * 3. Create new TenantLanguage records if needed
   */
  static async bulkUpdate(input: BulkUpdateTenantLanguagesInput): Promise<TenantLanguage[]> {
    const repo = this.repo();
    const { tenantId, languageIds } = input;

    // Verify tenant exists
    const tenant = await this.tenantRepo().findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new Error('Firma bulunamadı');
    }

    // Verify all languages exist
    const languages = await this.languageRepo().find({
      where: { id: In(languageIds) },
    });

    if (languages.length !== languageIds.length) {
      throw new Error('Bir veya daha fazla dil bulunamadı');
    }

    // Get all existing tenant languages
    const existingTenantLanguages = await repo.find({
      where: { tenantId },
    });

    const existingLanguageIds = new Set(existingTenantLanguages.map((tl) => tl.languageId));

    // Update existing languages
    const updates: Promise<TenantLanguage>[] = [];
    for (const tenantLanguage of existingTenantLanguages) {
      const shouldBeActive = languageIds.includes(tenantLanguage.languageId);
      if (tenantLanguage.isActive !== shouldBeActive) {
        tenantLanguage.isActive = shouldBeActive;
        updates.push(repo.save(tenantLanguage));
      }
    }

    // Create new tenant languages for languages not yet added
    const newLanguageIds = languageIds.filter((lid) => !existingLanguageIds.has(lid));
    const newTenantLanguages = newLanguageIds.map((languageId) =>
      repo.create({
        tenantId,
        languageId,
        isActive: true,
        sortOrder: 0,
      })
    );

    if (newTenantLanguages.length > 0) {
      updates.push(...newTenantLanguages.map((tl) => repo.save(tl)));
    }

    await Promise.all(updates);

    // Return all tenant languages
    return this.list(tenantId);
  }

  /**
   * Initialize tenant languages from all active languages
   * Adds all system active languages as INACTIVE for the tenant
   * Tenant can then activate the languages they want to use
   */
  static async initializeFromActiveLanguages(tenantId: string, setActive: boolean = false): Promise<TenantLanguage[]> {
    const activeLanguages = (await this.languageRepo().find({
      where: { isActive: true },
      order: { name: 'ASC' },
    })) ?? [];

    // Check which languages are already added
    const existingTenantLanguages = (await this.repo().find({
      where: { tenantId },
    })) ?? [];
    const existingLanguageIds = new Set(existingTenantLanguages.map((tl) => tl.languageId));

    // Only add languages that don't exist yet
    const newLanguages = activeLanguages.filter((lang) => !existingLanguageIds.has(lang.id));

    // Check if tenant already has a default language
    const hasDefault = existingTenantLanguages.some((tl) => tl.isDefault);

    const tenantLanguages = newLanguages.map((language, index) =>
      this.repo().create({
        tenantId,
        languageId: language.id,
        isActive: setActive, // Default: false (inactive), tenant can activate later
        isDefault: !hasDefault && index === 0 && setActive, // First active language becomes default if no default exists
        sortOrder: existingTenantLanguages.length + index,
      })
    );

    if (tenantLanguages.length > 0) {
      await this.repo().save(tenantLanguages);
    }

    // Return all tenant languages (existing + new)
    return this.list(tenantId);
  }
}
