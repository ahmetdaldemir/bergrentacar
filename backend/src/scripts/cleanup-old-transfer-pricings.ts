/**
 * Cleanup Script: Remove old transfer pricing records that don't have base_km_price
 * 
 * This script removes transfer pricing records that are incompatible with the new
 * pricing system (per_km_per_person model).
 * 
 * Run this script after updating the entity to make base_km_price nullable.
 * After cleanup, you can make base_km_price NOT NULL again in the entity.
 * 
 * Usage: npm run cleanup:transfer-pricings
 */

import 'reflect-metadata';
import { AppDataSource } from '../config/data-source';
import { TransferPricing } from '../modules/transfer/entities/transfer-pricing.entity';
import { logger } from '../utils/logger';
import { IsNull, Or } from 'typeorm';

async function cleanupOldTransferPricings() {
  try {
    logger.info('[Cleanup] Initializing database connection...');
    await AppDataSource.initialize();

    const pricingRepo = AppDataSource.getRepository(TransferPricing);

    // Find all pricing records that don't have base_km_price or passenger_multipliers (old system)
    const oldPricings = await pricingRepo.find({
      where: [
        { baseKmPrice: IsNull() },
        { passengerMultipliers: IsNull() },
      ],
    });

    if (oldPricings.length === 0) {
      logger.info('[Cleanup] No old transfer pricing records found. Nothing to clean up.');
      return;
    }

    logger.info(`[Cleanup] Found ${oldPricings.length} old transfer pricing record(s) to remove.`);

    // Show details before deletion
    for (const pricing of oldPricings) {
      logger.info(
        `[Cleanup] - Pricing ID: ${pricing.id}, Vehicle ID: ${pricing.vehicleId}, ` +
        `Base KM Price: ${pricing.baseKmPrice || 'N/A'}`
      );
    }

    // Delete old records
    const deleteResult = await pricingRepo.remove(oldPricings);

    logger.info(`[Cleanup] ✅ Successfully removed ${deleteResult.length} old transfer pricing record(s).`);
    logger.info('[Cleanup] You can now make base_km_price and passenger_multipliers NOT NULL in the entity.');

  } catch (error: any) {
    logger.error('[Cleanup] ❌ Error during cleanup:', error);
    throw error;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      logger.info('[Cleanup] Database connection closed.');
    }
  }
}

// Run if called directly
if (require.main === module) {
  cleanupOldTransferPricings()
    .then(() => {
      logger.info('[Cleanup] ✅ Cleanup completed successfully.');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('[Cleanup] ❌ Cleanup failed:', error);
      process.exit(1);
    });
}

export { cleanupOldTransferPricings };
