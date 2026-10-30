import 'reflect-metadata';
import bcrypt from 'bcryptjs';
import { AppDataSource } from '../config/data-source';
import { Tenant, TenantCategory } from '../modules/tenants/entities/tenant.entity';
import { TenantUser, TenantUserRole } from '../modules/tenants/entities/tenant-user.entity';
import { TenantSettings, SettingsCategory } from '../modules/shared/entities/tenant-settings.entity';
import { Currency, CurrencyCode } from '../modules/shared/entities/currency.entity';

/**
 * Local Development Tenant Seed Script
 * 
 * Lokal development için "local" tenant'ı oluşturur
 * 
 * npm run seed:local
 */

const TENANT_CONFIG = {
  name: 'Local Development',
  slug: 'local', // local.saastour360.test için
  category: TenantCategory.RENTACAR as TenantCategory,
  defaultLanguage: 'tr',
  supportEmail: 'dev@local.test',
};

const ADMIN_USER = {
  name: 'Local Admin',
  email: 'admin@local.test',
  password: 'admin123', // Lokal development için basit şifre
  role: TenantUserRole.ADMIN as TenantUserRole,
};

const SITE_SETTINGS = {
  siteName: 'Local Development',
  siteDescription: 'Lokal geliştirme ortamı',
  companyName: 'Local Dev Ltd.',
  companyAddress: 'Local, Development',
  companyEmail: 'info@local.test',
  companyPhone: '+90 555 000 0000',
  companyWebsite: 'http://local.saastour360.test',
  companyTaxNumber: '0000000000',
};

async function seedLocalTenant() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const tenantRepo = AppDataSource.getRepository(Tenant);
    const userRepo = AppDataSource.getRepository(TenantUser);
    const settingsRepo = AppDataSource.getRepository(TenantSettings);
    const currencyRepo = AppDataSource.getRepository(Currency);

    // Check if tenant already exists
    const existingTenant = await tenantRepo.findOne({ 
      where: { slug: TENANT_CONFIG.slug } 
    });

    if (existingTenant) {
      console.log(`✅ Tenant "local" already exists!`);
      console.log(`   Tenant ID: ${existingTenant.id}`);
      console.log(`   Tenant Name: ${existingTenant.name}`);
      await AppDataSource.destroy();
      process.exit(0);
    }

    // Get default currency (TRY or EUR)
    let defaultCurrency = await currencyRepo.findOne({ where: { code: CurrencyCode.TRY } });
    if (!defaultCurrency) {
      defaultCurrency = await currencyRepo.findOne({ where: { code: CurrencyCode.EUR } });
    }

    // 1. Create Tenant
    console.log(`\n📦 Creating local tenant: ${TENANT_CONFIG.name}...`);
    const tenant = tenantRepo.create({
      name: TENANT_CONFIG.name,
      slug: TENANT_CONFIG.slug,
      category: TENANT_CONFIG.category,
      defaultLanguage: TENANT_CONFIG.defaultLanguage,
      supportEmail: TENANT_CONFIG.supportEmail,
      defaultCurrencyId: defaultCurrency?.id || null,
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
    console.log(`   Password: ${ADMIN_USER.password}`);

    // 3. Create Settings (tek satır — category: GENERAL)
    console.log(`\n⚙️  Creating settings (general)...`);
    const generalSettings = settingsRepo.create({
      tenant: savedTenant,
      tenantId: savedTenant.id,
      category: SettingsCategory.GENERAL,
      ...SITE_SETTINGS,
      smtpSecure: true,
    });
    await settingsRepo.save(generalSettings);
    console.log(`✅ Settings created (general)`);

    console.log(`\n✅ Local tenant seed completed successfully!`);
    console.log(`\n📋 Summary:`);
    console.log(`   Tenant ID: ${savedTenant.id}`);
    console.log(`   Tenant Slug: ${savedTenant.slug}`);
    console.log(`   Admin Email: ${ADMIN_USER.email}`);
    console.log(`   Admin Password: ${ADMIN_USER.password}`);
    console.log(`\n🌐 Access URL: http://local.saastour360.test:5001`);

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    await AppDataSource.destroy();
    process.exit(1);
  }
}

seedLocalTenant();
