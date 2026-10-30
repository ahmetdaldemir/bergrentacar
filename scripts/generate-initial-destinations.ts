#!/usr/bin/env ts-node

/**
 * Generate Initial Destinations Script
 * 
 * This script creates 5 initial destinations for a tenant if they don't have any destinations yet.
 * It uses AI to generate content in all active languages for the tenant.
 * 
 * Usage:
 *   ts-node scripts/generate-initial-destinations.ts <tenant-slug>
 * 
 * Example:
 *   ts-node scripts/generate-initial-destinations.ts sunset
 */

import { AppDataSource } from '../backend/src/config/data-source';
import { TenantService } from '../backend/src/modules/tenants/services/tenant.service';
import { TenantLanguageService } from '../backend/src/modules/tenants/services/tenant-language.service';
import { DestinationService } from '../backend/src/modules/shared/services/destination.service';
import { AiContentService } from '../backend/src/modules/shared/services/ai-content.service';
import { LanguageService } from '../backend/src/modules/shared/services/language.service';
import { TenantFeaturesService } from '../backend/src/modules/shared/services/tenant-features.service';
import { TenantSettingsService } from '../backend/src/modules/shared/services/tenant-settings.service';
import { logger } from '../backend/src/utils/logger';

// Default destination titles (can be customized)
// These are popular destinations that work well for tourism
// AI will generate unique content for each title
const DEFAULT_DESTINATION_TITLES = [
  "Kapadokya",
  "Pamukkale",
  "Antalya Kalesi",
  "Efes Antik Kenti",
  "Sultanahmet Camii"
];

async function generateInitialDestinations(tenantSlug: string) {
  try {
    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      logger.info('Initializing database connection...');
      await AppDataSource.initialize();
    }

    // Step 1: Find tenant by slug
    logger.info(`Looking for tenant with slug: ${tenantSlug}`);
    const tenant = await TenantService.getTenantBySlug(tenantSlug);
    
    if (!tenant) {
      throw new Error(`Tenant not found with slug: ${tenantSlug}`);
    }

    logger.info(`✅ Found tenant: ${tenant.name} (ID: ${tenant.id})`);

    // Step 1.5: Enable AI feature for tenant if not enabled (required for script)
    const hasAiFeature = await TenantFeaturesService.hasFeature(tenant.id, 'ai');
    if (!hasAiFeature) {
      logger.info(`⚠️  AI feature is not enabled for tenant. Enabling it temporarily...`);
      await TenantFeaturesService.updateFeatures(tenant.id, { ai: true });
      logger.info(`✅ AI feature enabled for tenant`);
    }

    // Step 1.6: Get OpenAI API key from tenant settings or use environment variable
    const aiSettings = await TenantSettingsService.getAiSettings(tenant.id);
    if (aiSettings?.metadata && (aiSettings.metadata as any)?.openaiApiKey) {
      const tenantApiKey = (aiSettings.metadata as any).openaiApiKey;
      if (tenantApiKey && typeof tenantApiKey === 'string' && tenantApiKey.trim()) {
        process.env.OPENAI_API_KEY = tenantApiKey.trim();
        logger.info(`✅ Using OpenAI API key from tenant settings`);
      }
    } else if (!process.env.OPENAI_API_KEY) {
      logger.warn(`⚠️  No OpenAI API key found in tenant settings or environment variables`);
      logger.warn(`   AI content generation may fail. Please set OPENAI_API_KEY or configure tenant AI settings.`);
    }

    // Step 2: Check if tenant has any destinations
    const existingDestinations = await DestinationService.list(tenant.id);
    
    if (existingDestinations.length > 0) {
      logger.info(`⚠️  Tenant already has ${existingDestinations.length} destination(s). Skipping destination generation.`);
      logger.info('If you want to generate destinations anyway, please delete existing destinations first.');
      return;
    }

    logger.info('✅ Tenant has no destinations. Proceeding with destination generation...');

    // Step 3: Get active languages for tenant
    const activeLanguageIds = await TenantLanguageService.getActiveLanguageIds(tenant.id);
    
    if (activeLanguageIds.length === 0) {
      throw new Error(`No active languages found for tenant ${tenantSlug}. Please configure tenant languages first.`);
    }

    // Get language details
    const allLanguages = await LanguageService.list();
    const tenantLanguages = allLanguages.filter(lang => 
      activeLanguageIds.includes(lang.id) && lang.isActive
    );

    logger.info(`✅ Found ${tenantLanguages.length} active language(s) for tenant: ${tenantLanguages.map(l => l.code).join(', ')}`);

    // Step 4: Generate destinations for each title
    logger.info(`\n🚀 Starting destination generation for ${DEFAULT_DESTINATION_TITLES.length} destinations...\n`);

    for (let i = 0; i < DEFAULT_DESTINATION_TITLES.length; i++) {
      const title = DEFAULT_DESTINATION_TITLES[i];
      logger.info(`\n[${i + 1}/${DEFAULT_DESTINATION_TITLES.length}] Generating destination: "${title}"`);

      try {
        // Generate AI content for all languages (AI service generates for all active languages)
        logger.info(`  🤖 Generating AI content...`);
        const aiContent = await AiContentService.generateDestinationContent(
          { title },
          tenant.id
        );

        logger.info(`  ✅ AI content generated for ${Object.keys(aiContent).length} language(s)`);

        // Build translations array from AI content - only for tenant's active languages
        const translations = tenantLanguages
          .map(lang => {
            const langContent = aiContent[lang.code];
            if (!langContent) {
              logger.warn(`  ⚠️  No AI content found for language ${lang.code}, skipping...`);
              return null;
            }

            return {
              languageId: lang.id,
              title: langContent.title,
              description: langContent.description,
              shortDescription: langContent.short_description,
            };
          })
          .filter(t => t !== null) as Array<{
            languageId: string;
            title: string;
            description: string;
            shortDescription: string;
          }>;

        if (translations.length === 0) {
          throw new Error(`No translations generated for destination "${title}"`);
        }

        logger.info(`  📝 Creating destination with ${translations.length} translation(s)...`);

        // Create destination
        // Randomly set one as featured (first one)
        const isFeatured = i === 0;
        const destination = await DestinationService.create({
          tenantId: tenant.id,
          image: undefined, // No image by default, can be added later
          isFeatured: isFeatured,
          isActive: true,
          rentacarLocationId: undefined, // Optional, can be linked later
          translations,
        });

        logger.info(`  ✅ Destination created successfully! ID: ${destination.id}`);
        logger.info(`     Title: ${translations[0]?.title || title}`);
        logger.info(`     Featured: ${isFeatured ? 'Yes' : 'No'}`);
        logger.info(`     Active: Yes`);

        // Small delay to avoid rate limiting
        if (i < DEFAULT_DESTINATION_TITLES.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        }
      } catch (error) {
        logger.error(`  ❌ Failed to generate destination "${title}":`, error);
        logger.error(`     Error: ${error instanceof Error ? error.message : String(error)}`);
        // Continue with next destination even if one fails
      }
    }

    logger.info(`\n✅ Destination generation completed!`);
    logger.info(`   Total destinations created: ${DEFAULT_DESTINATION_TITLES.length}`);
    logger.info(`   Tenant: ${tenant.name} (${tenantSlug})`);

  } catch (error) {
    logger.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

// Main execution
const tenantSlug = process.argv[2];

if (!tenantSlug) {
  console.error('❌ Error: Tenant slug is required');
  console.error('Usage: ts-node scripts/generate-initial-destinations.ts <tenant-slug>');
  console.error('Example: ts-node scripts/generate-initial-destinations.ts sunset');
  process.exit(1);
}

generateInitialDestinations(tenantSlug)
  .then(() => {
    logger.info('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('❌ Script failed:', error);
    process.exit(1);
  });

