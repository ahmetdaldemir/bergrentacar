import { AppDataSource } from '../config/data-source';
import { EmailTemplate, EmailTemplateType } from '../modules/shared/entities/email-template.entity';
import { Tenant } from '../modules/tenants/entities/tenant.entity';
import { Language } from '../modules/shared/entities/language.entity';
import { IsNull } from 'typeorm';

/**
 * Customer Welcome email template'ini oluştur
 * Kullanım: ts-node src/scripts/seed-customer-welcome-template.ts
 */
const seedCustomerWelcomeTemplate = async () => {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const tenantRepo = AppDataSource.getRepository(Tenant);
    const languageRepo = AppDataSource.getRepository(Language);
    const templateRepo = AppDataSource.getRepository(EmailTemplate);

    // Tüm tenant'ları al
    const tenants = await tenantRepo.find();
    const trLang = await languageRepo.findOne({ where: { code: 'tr' } });
    const enLang = await languageRepo.findOne({ where: { code: 'en' } });

    if (tenants.length === 0) {
      console.log('⚠️  No tenants found. Please create a tenant first.');
      return;
    }

    for (const tenant of tenants) {
      console.log(`\n📧 Processing tenant: ${tenant.name}`);

      // TR template
      if (trLang) {
        const existingTr = await templateRepo.findOne({
          where: {
            tenantId: tenant.id,
            type: EmailTemplateType.CUSTOMER_WELCOME,
            languageId: trLang.id,
          },
        });

        if (!existingTr) {
          const trTemplate = templateRepo.create({
            tenantId: tenant.id,
            languageId: trLang.id,
            type: EmailTemplateType.CUSTOMER_WELCOME,
            name: 'Müşteri Hoş Geldin Email',
            subject: 'Hoş Geldiniz! - Hesabınız Oluşturuldu',
            body: `
<h2>Hoş Geldiniz {{customerName}}!</h2>
<p>Hesabınız başarıyla oluşturulmuştur.</p>

<h3>Giriş Bilgileriniz:</h3>
<ul>
  <li><strong>E-posta:</strong> {{customerEmail}}</li>
  <li><strong>Şifre:</strong> {{password}}</li>
</ul>

<p>İlk girişinizde şifrenizi değiştirmenizi öneririz.</p>

<h3>Kişisel Bilgileriniz:</h3>
<ul>
  <li><strong>Ad Soyad:</strong> {{firstName}} {{lastName}}</li>
  <li><strong>TC Kimlik No / Pasaport:</strong> {{idNumber}}</li>
  <li><strong>Telefon:</strong> {{customerPhone}}</li>
  ${'{{#if birthDate}}'}<li><strong>Doğum Tarihi:</strong> {{birthDate}}</li>${'{{/if}}'}
</ul>

<p>Herhangi bir sorunuz olursa bizimle iletişime geçmekten çekinmeyin.</p>

<p>İyi günler dileriz,<br>
Ekip</p>
            `.trim(),
            isActive: true,
            description: 'Yeni müşteri kaydı yapıldığında gönderilen hoş geldin email\'i',
          });
          await templateRepo.save(trTemplate);
          console.log('  ✅ Turkish template created');
        } else {
          console.log('  ⏭️  Turkish template already exists');
        }
      }

      // EN template
      if (enLang) {
        const existingEn = await templateRepo.findOne({
          where: {
            tenantId: tenant.id,
            type: EmailTemplateType.CUSTOMER_WELCOME,
            languageId: enLang.id,
          },
        });

        if (!existingEn) {
          const enTemplate = templateRepo.create({
            tenantId: tenant.id,
            languageId: enLang.id,
            type: EmailTemplateType.CUSTOMER_WELCOME,
            name: 'Customer Welcome Email',
            subject: 'Welcome! - Your Account Has Been Created',
            body: `
<h2>Welcome {{customerName}}!</h2>
<p>Your account has been successfully created.</p>

<h3>Your Login Credentials:</h3>
<ul>
  <li><strong>Email:</strong> {{customerEmail}}</li>
  <li><strong>Password:</strong> {{password}}</li>
</ul>

<p>We recommend changing your password on your first login.</p>

<h3>Your Personal Information:</h3>
<ul>
  <li><strong>Full Name:</strong> {{firstName}} {{lastName}}</li>
  <li><strong>ID Number / Passport:</strong> {{idNumber}}</li>
  <li><strong>Phone:</strong> {{customerPhone}}</li>
  ${'{{#if birthDate}}'}<li><strong>Date of Birth:</strong> {{birthDate}}</li>${'{{/if}}'}
</ul>

<p>If you have any questions, please don't hesitate to contact us.</p>

<p>Best regards,<br>
Team</p>
            `.trim(),
            isActive: true,
            description: 'Welcome email sent when a new customer is registered',
          });
          await templateRepo.save(enTemplate);
          console.log('  ✅ English template created');
        } else {
          console.log('  ⏭️  English template already exists');
        }
      }

      // Default template (languageId null)
      const existingDefault = await templateRepo.findOne({
        where: {
          tenantId: tenant.id,
          type: EmailTemplateType.CUSTOMER_WELCOME,
          languageId: IsNull(),
        },
      });

      if (!existingDefault) {
        const defaultTemplate = templateRepo.create({
          tenantId: tenant.id,
          languageId: null,
          type: EmailTemplateType.CUSTOMER_WELCOME,
          name: 'Customer Welcome Email (Default)',
          subject: 'Welcome! - Your Account Has Been Created',
          body: `
<h2>Welcome {{customerName}}!</h2>
<p>Your account has been successfully created.</p>

<h3>Your Login Credentials:</h3>
<ul>
  <li><strong>Email:</strong> {{customerEmail}}</li>
  <li><strong>Password:</strong> {{password}}</li>
</ul>

<p>We recommend changing your password on your first login.</p>

<p>If you have any questions, please don't hesitate to contact us.</p>

<p>Best regards,<br>
Team</p>
          `.trim(),
          isActive: true,
          description: 'Default welcome email template (used when no language-specific template is found)',
        });
        await templateRepo.save(defaultTemplate);
        console.log('  ✅ Default template created');
      } else {
        console.log('  ⏭️  Default template already exists');
      }
    }

    console.log('\n✅ Customer Welcome email templates seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding customer welcome templates:', error);
    throw error;
  } finally {
    await AppDataSource.destroy();
  }
};

seedCustomerWelcomeTemplate()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

