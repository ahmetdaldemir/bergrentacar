import { Response } from 'express';
import { asyncHandler } from '../../../utils/errors';
import { TenantSettingsService } from '../../shared/services/tenant-settings.service';
import { EmailTemplateService } from '../../shared/services/email-template.service';
import { EmailTemplateType } from '../../shared/entities/email-template.entity';
import { EmailLayoutService } from '../../../services/email-layout.service';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import nodemailer from 'nodemailer';

export class EmailTestController {
  /**
   * Test email gönder (welcome template kullanarak)
   */
  static sendTestEmail = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { email } = req.body;
    const tenantId = req.auth?.tenantId;

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Tenant ID not found in request',
        },
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email address is required',
        },
      });
    }

    try {
      // Mail ayarlarını kontrol et
      const mailSettings = await TenantSettingsService.getMailSettings(tenantId);
      if (!mailSettings || !mailSettings.smtpHost || !mailSettings.fromEmail) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'CONFIGURATION_ERROR',
            message: 'Mail settings not configured. Please configure SMTP settings first.',
          },
        });
      }

      // Email template'i al (default language ile)
      const template = await EmailTemplateService.getByType(
        tenantId,
        EmailTemplateType.CUSTOMER_WELCOME,
        undefined // Default language
      );

      if (!template) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Customer welcome email template not found. Please create the template first.',
          },
        });
      }

      // Site settings'i al (logo ve adres bilgileri için)
      const siteSettings = await TenantSettingsService.getSiteSettings(tenantId);

      // Test için değişkenler
      const variables = {
        customerName: 'Test Kullanıcı',
        customerEmail: email,
        customerPhone: '+90 555 123 4567',
        password: 'TEST123456', // Test şifresi
        idNumber: '12345678901',
        firstName: 'Test',
        lastName: 'Kullanıcı',
        birthDate: '01.01.1990',
        birthPlace: 'İstanbul',
        gender: 'male',
        country: 'TR',
        licenseNumber: 'A12345678',
        licenseClass: 'B',
      };

      // Şablon değişkenlerini değiştir
      const subject = EmailTemplateService.replaceVariables(template.subject, variables);
      const templateBody = EmailTemplateService.replaceVariables(template.body, variables);

      // Layout ile sarmala (logo ve footer bilgileriyle)
      const htmlBody = EmailLayoutService.wrapContent(templateBody, siteSettings);

      // SMTP transporter oluştur
      // Port ve secure ayarını otomatik belirle
      const smtpPort = mailSettings.smtpPort || 587;
      // Port 465 ise SSL kullan (secure: true), diğer durumlarda STARTTLS kullan (secure: false)
      const useSecure = mailSettings.smtpSecure !== undefined 
        ? mailSettings.smtpSecure 
        : smtpPort === 465;
      
      const transporter = nodemailer.createTransport({
        host: mailSettings.smtpHost,
        port: smtpPort,
        secure: useSecure,
        requireTLS: !useSecure && smtpPort === 587, // Port 587 için STARTTLS zorunlu
        auth: {
          user: mailSettings.smtpUser,
          pass: mailSettings.smtpPassword,
        },
        tls: {
          // SSL sertifika doğrulamasını atla (development için)
          rejectUnauthorized: false,
        },
      });

      // Test email'i gönder
      await transporter.sendMail({
        from: `"${mailSettings.fromName || 'Test'}" <${mailSettings.fromEmail}>`,
        to: email,
        subject: `[TEST] ${subject}`,
        html: htmlBody,
      });

      res.json({
        success: true,
        message: 'Test email sent successfully',
        data: {
          to: email,
          subject: `[TEST] ${subject}`,
          sentAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error sending test email:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to send test email',
          details: (error as Error).message,
        },
      });
    }
  });
}

