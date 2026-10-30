import { Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { Tenant, TenantCategory } from '../entities/tenant.entity';
import { Currency } from '../../shared/entities/currency.entity';
import { logger } from '../../../utils/logger';

export type CreateTenantInput = {
  name: string;
  slug: string;
  category: TenantCategory;
  defaultLanguage?: string;
  supportEmail?: string;
  defaultCurrencyId?: string | null;
};

export class TenantService {
  private static repository(): Repository<Tenant> {
    return AppDataSource.getRepository(Tenant);
  }

  static async createTenant(input: CreateTenantInput): Promise<Tenant> {
    const repo = this.repository();
    const existing = await repo.findOne({ where: { slug: input.slug } });
    if (existing) {
      throw new Error('Tenant with this slug already exists');
    }

    const tenant = repo.create({
      name: input.name,
      slug: input.slug,
      category: input.category,
      defaultLanguage: input.defaultLanguage ?? 'en',
      supportEmail: input.supportEmail,
      defaultCurrencyId: input.defaultCurrencyId,
    });

    const savedTenant = await repo.save(tenant);

    // Initialize tenant languages (all system active languages as inactive)
    const { TenantLanguageService } = await import('./tenant-language.service');
    try {
      await TenantLanguageService.initializeFromActiveLanguages(savedTenant.id, false);
    } catch (error) {
      // Log error but don't fail tenant creation
      console.error('Failed to initialize tenant languages:', error);
    }

    return savedTenant;
  }

  static listTenants(): Promise<Tenant[]> {
    return this.repository().find({
      relations: ['defaultCurrency'],
    });
  }

  static async getTenantById(id: string): Promise<Tenant | null> {
    return this.repository().findOne({
      where: { id },
      relations: ['defaultCurrency'],
    });
  }

  static async getTenantBySlug(slug: string): Promise<Tenant | null> {
    try {
      // Ensure database connection is initialized
      if (!AppDataSource.isInitialized) {
        logger.warn('Database not initialized, attempting to initialize...');
        await AppDataSource.initialize();
      }

      // First, try to get tenant with defaultCurrency relation
      try {
        const tenant = await this.repository().findOne({
          where: { slug, isActive: true },
          relations: ['defaultCurrency'],
        });
        
        if (tenant) {
          return tenant;
        }
      } catch (relationError) {
        // If relation loading fails (e.g., deleted_at column missing in currencies table),
        // fallback to loading tenant without relation and manually load currency
        if (relationError instanceof Error && relationError.message.includes('deleted_at')) {
          logger.warn('DefaultCurrency relation failed due to deleted_at, loading tenant without relation', {
            slug,
            error: relationError.message,
          });
          
          const tenant = await this.repository().findOne({
            where: { slug, isActive: true },
          });
          
          // Manually load defaultCurrency if tenant has defaultCurrencyId
          if (tenant && tenant.defaultCurrencyId) {
            try {
              const currencyRepo = AppDataSource.getRepository(Currency);
              const currency = await currencyRepo.findOne({
                where: { id: tenant.defaultCurrencyId },
              });
              tenant.defaultCurrency = currency || null;
            } catch (currencyError) {
              logger.warn('Failed to load defaultCurrency manually', {
                currencyId: tenant.defaultCurrencyId,
                error: currencyError instanceof Error ? currencyError.message : String(currencyError),
              });
              tenant.defaultCurrency = null;
            }
          }
          
          return tenant;
        }
        // If error is not related to deleted_at, rethrow it
        throw relationError;
      }

      return null;
    } catch (error) {
      logger.error('Error getting tenant by slug', {
        slug,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        dbInitialized: AppDataSource.isInitialized,
      });
      throw error;
    }
  }

  static async updateTenant(
    id: string,
    input: Partial<CreateTenantInput>
  ): Promise<Tenant> {
    const repo = this.repository();
    const tenant = await repo.findOne({ where: { id } });
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    Object.assign(tenant, input);
    return repo.save(tenant);
  }

  static async updateDefaultCurrency(
    tenantId: string,
    currencyId: string | null
  ): Promise<Tenant> {
    const repo = this.repository();
    
    // Load tenant WITHOUT relations to avoid TypeORM sync issues
    const tenant = await repo.findOne({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // If currencyId is provided, verify it exists
    if (currencyId !== null && currencyId !== undefined) {
      const currencyRepo = AppDataSource.getRepository(Currency);
      const currency = await currencyRepo.findOne({ where: { id: currencyId } });
      if (!currency) {
        logger.error(`Currency not found`, { currencyId, tenantId });
        throw new Error(`Currency with id ${currencyId} not found`);
      }
    }

    logger.info(`Updating default currency for tenant ${tenantId} to ${currencyId}`);
    
    // Use update method instead of save to avoid relation sync issues
    await repo.update({ id: tenantId }, { defaultCurrencyId: currencyId ?? null });
    
    // Reload with relations to ensure defaultCurrency is loaded
    const updatedTenant = await repo.findOne({
      where: { id: tenantId },
      relations: ['defaultCurrency'],
    });
    
    if (!updatedTenant) {
      logger.error(`Failed to reload tenant after currency update`, { tenantId });
      throw new Error('Failed to update default currency');
    }
    
    // Verify the update was successful
    if (updatedTenant.defaultCurrencyId !== (currencyId ?? null)) {
      logger.error(`Currency update mismatch. Expected: ${currencyId ?? null}, Got: ${updatedTenant.defaultCurrencyId}`, { 
        tenantId, 
        expected: currencyId ?? null,
        actual: updatedTenant.defaultCurrencyId 
      });
      throw new Error('Default currency update failed - value mismatch');
    }
    
    logger.info(`Successfully updated default currency for tenant ${tenantId}`, {
      tenantId,
      currencyId: updatedTenant.defaultCurrencyId,
    });
    
    return updatedTenant;
  }
}
