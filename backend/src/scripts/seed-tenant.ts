import 'reflect-metadata';
import bcrypt from 'bcryptjs';
import { AppDataSource } from '../config/data-source';
import { Tenant, TenantCategory } from '../modules/tenants/entities/tenant.entity';
import { TenantUser, TenantUserRole } from '../modules/tenants/entities/tenant-user.entity';
import { TenantSettings, SettingsCategory } from '../modules/shared/entities/tenant-settings.entity';

/**
 * Tenant Seed Script
 * 
 * Yeni tenant eklemek için bu script'teki bilgileri güncelleyip çalıştırın:
 * 
 * npm run seed:tenant
 * 
 * Script şunları oluşturur:
 * - Tenant (şirket bilgileri)
 * - Tenant Settings (site, mail, payment ayarları)
 * - Tenant User (admin kullanıcı)
 */

// ============================================
// TENANT BİLGİLERİ - Burayı güncelleyin
// ============================================
const TENANT_CONFIG = {
  name: 'Sunset Rentals',
  slug: 'sunset-rentals', // URL'de kullanılacak (örn: yeni-sirket.saastour360.com)
  category: TenantCategory.RENTACAR as TenantCategory, // 'tour' veya 'rentacar'
  defaultLanguage: 'tr', // 'tr', 'en', 'de' vb.
  supportEmail: 'destek@sunsetrentals.com',
};

// ============================================
// ADMIN KULLANICI BİLGİLERİ
// ============================================
const ADMIN_USER = {
  name: 'Admin Kullanıcı',
  email: 'admin@sunsetrentals.com',
  password: 'Admin123!', // İlk girişte değiştirilmeli
  role: TenantUserRole.ADMIN as TenantUserRole,
};

// ============================================
// SITE AYARLARI (İsteğe bağlı)
// ============================================
const SITE_SETTINGS = {
  siteName: 'Sunset Rentals',
  siteDescription: 'Sunset Rentals açıklaması',
  companyName: 'Sunset Rentals Ltd.',
  companyAddress: 'İstanbul, Türkiye',
  companyEmail: 'info@sunsetrentals.com',
  companyPhone: '+90 555 123 4567',
  companyWebsite: 'https://www.sunsetrentals.com',
  companyTaxNumber: '1234567890',
};

// ============================================
// MAIL AYARLARI (İsteğe bağlı)
// ============================================
const MAIL_SETTINGS = {
  smtpHost: 'smtp.gmail.com',
  smtpPort: 587,
  smtpUser: 'noreply@sunsetrentals.com',
  smtpPassword: '', // SMTP şifresi
  smtpSecure: true,
  fromEmail: 'noreply@sunsetrentals.com',
  fromName: 'Sunset Rentals',
};

async function seedTenant() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const tenantRepo = AppDataSource.getRepository(Tenant);
    const userRepo = AppDataSource.getRepository(TenantUser);
    const settingsRepo = AppDataSource.getRepository(TenantSettings);

    // Check if tenant already exists
    const existingTenant = await tenantRepo.findOne({ 
      where: { slug: TENANT_CONFIG.slug } 
    });

    if (existingTenant) {
      console.log(`⚠️  Tenant with slug "${TENANT_CONFIG.slug}" already exists!`);
      console.log(`   Tenant ID: ${existingTenant.id}`);
      console.log(`   Tenant Name: ${existingTenant.name}`);
      await AppDataSource.destroy();
      process.exit(0);
    }

    // 1. Create Tenant
    console.log(`\n📦 Creating tenant: ${TENANT_CONFIG.name}...`);
    const tenant = tenantRepo.create({
      name: TENANT_CONFIG.name,
      slug: TENANT_CONFIG.slug,
      category: TENANT_CONFIG.category,
      defaultLanguage: TENANT_CONFIG.defaultLanguage,
      supportEmail: TENANT_CONFIG.supportEmail,
    });
    const savedTenant = await tenantRepo.save(tenant);
    console.log(`✅ Tenant created: ${savedTenant.id}`);

    // Initialize tenant languages (all system active languages as inactive)
    const { TenantLanguageService } = await import('../modules/tenants/services/tenant-language.service');
    try {
      await TenantLanguageService.initializeFromActiveLanguages(savedTenant.id, false);
      console.log(`✅ Tenant languages initialized (inactive)`);
    } catch (error) {
      console.error('⚠️  Failed to initialize tenant languages:', error);
    }

    // 2. Create Tenant User (Admin)
    console.log(`\n👤 Creating admin user: ${ADMIN_USER.email}...`);
    const passwordHash = await bcrypt.hash(ADMIN_USER.password, 10);
    const user = userRepo.create({
      tenant: savedTenant,
      name: ADMIN_USER.name,
      email: ADMIN_USER.email,
      passwordHash,
      role: ADMIN_USER.role,
    });
    const savedUser = await userRepo.save(user);
    console.log(`✅ Admin user created: ${savedUser.id}`);
    console.log(`   Email: ${ADMIN_USER.email}`);
    console.log(`   Password: ${ADMIN_USER.password} (⚠️  İlk girişte değiştirin!)`);

    // 3. Create Settings (tek satır — category: GENERAL)
    console.log(`\n⚙️  Creating settings (general)...`);
    const generalSettings = settingsRepo.create({
      tenant: savedTenant,
      tenantId: savedTenant.id,
      category: SettingsCategory.GENERAL,
      ...SITE_SETTINGS,
      ...(MAIL_SETTINGS.smtpHost && MAIL_SETTINGS.smtpUser ? MAIL_SETTINGS : {}),
      smtpSecure: true,
    });
    await settingsRepo.save(generalSettings);
    console.log(`✅ Settings created (general — site + mail merged)`);

    console.log(`\n✅ Tenant seed completed successfully!`);
    console.log(`\n📋 Summary:`);
    console.log(`   Tenant ID: ${savedTenant.id}`);
    console.log(`   Tenant Slug: ${savedTenant.slug}`);
    console.log(`   Admin Email: ${ADMIN_USER.email}`);
    console.log(`   Admin Password: ${ADMIN_USER.password}`);
    console.log(`\n🌐 Access URL: http://${savedTenant.slug}.local.saastour360.test:5001`);

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    await AppDataSource.destroy();
    process.exit(1);
  }
}

seedTenant();

