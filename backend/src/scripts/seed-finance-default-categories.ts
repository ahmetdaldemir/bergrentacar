/**
 * Seed script for default Finance Categories
 * Creates default income and expense categories for all tenants or a specific tenant
 * 
 * Usage:
 *   npm run ts-node src/scripts/seed-finance-default-categories.ts [tenantId]
 */

import { AppDataSource } from '../config/data-source';
import { FinanceCategoryService } from '../modules/finance/services/finance-category.service';
import { Tenant } from '../modules/tenants/entities/tenant.entity';
import { logger } from '../utils/logger';

async function seedDefaultCategories() {
  try {
    await AppDataSource.initialize();
    logger.info('Database connection initialized');

    const tenantId = process.argv[2]; // Optional tenant ID from command line

    if (tenantId) {
      // Seed for specific tenant
      logger.info(`Seeding default categories for tenant: ${tenantId}`);
      await FinanceCategoryService.ensureDefaultCategories(tenantId);
      logger.info('✅ Default categories seeded successfully');
    } else {
      // Seed for all tenants
      const tenantRepo = AppDataSource.getRepository(Tenant);
      const tenants = await tenantRepo.find();

      logger.info(`Seeding default categories for ${tenants.length} tenants...`);

      for (const tenant of tenants) {
        await FinanceCategoryService.ensureDefaultCategories(tenant.id);
        logger.info(`✅ Default categories seeded for tenant: ${tenant.name} (${tenant.id})`);
      }

      logger.info(`✅ Default categories seeded for all ${tenants.length} tenants`);
    }

    process.exit(0);
  } catch (error) {
    logger.error('Failed to seed default categories:', error);
    process.exit(1);
  }
}

seedDefaultCategories();

