#!/usr/bin/env ts-node

/**
 * Generate Initial Blogs Script
 * 
 * This script creates 5 initial blog posts for a tenant if they don't have any blogs yet.
 * It uses AI to generate content in all active languages for the tenant.
 * 
 * Usage:
 *   ts-node scripts/generate-initial-blogs.ts <tenant-slug>
 * 
 * Example:
 *   ts-node scripts/generate-initial-blogs.ts berg
 */

import { AppDataSource } from '../backend/src/config/data-source';
import { TenantService } from '../backend/src/modules/tenants/services/tenant.service';
import { TenantLanguageService } from '../backend/src/modules/tenants/services/tenant-language.service';
import { BlogService } from '../backend/src/modules/shared/services/blog.service';
import { BlogAiService } from '../backend/src/modules/shared/services/blog-ai.service';
import { LanguageService } from '../backend/src/modules/shared/services/language.service';
import { TenantFeaturesService } from '../backend/src/modules/shared/services/tenant-features.service';
import { TenantSettingsService } from '../backend/src/modules/shared/services/tenant-settings.service';
import { BlogStatus } from '../backend/src/modules/shared/entities/blog.entity';
import { logger } from '../backend/src/utils/logger';

// Default blog titles (can be customized)
const DEFAULT_BLOG_TITLES = [
  "Antalya'da Gezilecek En İyi Yerler",
  "Tatil Rezervasyonu İçin Pratik İpuçları",
  "Türkiye'nin En Güzel Plajları ve Koyları",
  "Yerel Kültür ve Gelenekler Hakkında Bilmeniz Gerekenler",
  "Seyahat Rehberi: Unutulmaz Bir Tatil İçin Öneriler"
];

async function generateInitialBlogs(tenantSlug: string) {
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

    // Step 2: Check if tenant has any blogs
    const existingBlogs = await BlogService.list(tenant.id);
    
    if (existingBlogs.length > 0) {
      logger.info(`⚠️  Tenant already has ${existingBlogs.length} blog(s). Skipping blog generation.`);
      logger.info('If you want to generate blogs anyway, please delete existing blogs first.');
      return;
    }

    logger.info('✅ Tenant has no blogs. Proceeding with blog generation...');

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

    // Step 4: Generate blogs for each title
    logger.info(`\n🚀 Starting blog generation for ${DEFAULT_BLOG_TITLES.length} blogs...\n`);

    for (let i = 0; i < DEFAULT_BLOG_TITLES.length; i++) {
      const title = DEFAULT_BLOG_TITLES[i];
      logger.info(`\n[${i + 1}/${DEFAULT_BLOG_TITLES.length}] Generating blog: "${title}"`);

      try {
        // Generate AI content for all languages (AI service generates for all active languages)
        logger.info(`  🤖 Generating AI content...`);
        const aiContent = await BlogAiService.generateBlogContent({
          title,
          tone: 'kurumsal',
          regenerate: false,
          tenantId: tenant.id,
        });

        logger.info(`  ✅ AI content generated for ${Object.keys(aiContent).length} language(s)`);

        // Build translations array from AI content - only for tenant's active languages
        const translations = tenantLanguages
          .map(lang => {
            const langContent = aiContent[lang.code];
            if (!langContent) {
              logger.warn(`  ⚠️  No AI content found for language ${lang.code}, skipping...`);
              return null;
            }

            // Generate slug from title
            const slug = langContent.title
              .toLowerCase()
              .trim()
              .replace(/\s+/g, '-')
              .replace(/[^\w\-ğüşıöçĞÜŞİÖÇ]+/g, '')
              .replace(/\-\-+/g, '-')
              .replace(/^-+/, '')
              .replace(/-+$/, '');

            return {
              languageId: lang.id,
              title: langContent.title,
              slug: slug,
              content: langContent.content,
              short_description: langContent.short_description,
            };
          })
          .filter(t => t !== null) as Array<{
            languageId: string;
            title: string;
            slug: string;
            content: string;
            short_description?: string;
          }>;

        if (translations.length === 0) {
          throw new Error(`No translations generated for blog "${title}"`);
        }

        logger.info(`  📝 Creating blog with ${translations.length} translation(s)...`);

        // Create blog
        const blog = await BlogService.create({
          tenantId: tenant.id,
          locationId: null, // General blog (not location-specific)
          status: BlogStatus.PUBLISHED, // Publish immediately
          publishedAt: new Date(),
          translations,
        });

        logger.info(`  ✅ Blog created successfully! ID: ${blog.id}`);
        logger.info(`     Title: ${translations[0]?.title || title}`);
        logger.info(`     Status: ${blog.status}`);
        logger.info(`     Published: ${blog.publishedAt ? 'Yes' : 'No'}`);

        // Small delay to avoid rate limiting
        if (i < DEFAULT_BLOG_TITLES.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        }
      } catch (error) {
        logger.error(`  ❌ Failed to generate blog "${title}":`, error);
        logger.error(`     Error: ${error instanceof Error ? error.message : String(error)}`);
        // Continue with next blog even if one fails
      }
    }

    logger.info(`\n✅ Blog generation completed!`);
    logger.info(`   Total blogs created: ${DEFAULT_BLOG_TITLES.length}`);
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
  console.error('Usage: ts-node scripts/generate-initial-blogs.ts <tenant-slug>');
  console.error('Example: ts-node scripts/generate-initial-blogs.ts berg');
  process.exit(1);
}

generateInitialBlogs(tenantSlug)
  .then(() => {
    logger.info('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('❌ Script failed:', error);
    process.exit(1);
  });

