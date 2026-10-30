/**
 * Backup Event Handlers
 * 
 * Database backup event'lerini dinler ve email bildirimleri gönderir.
 */

import { EventBus, EventTypes, DomainEvent } from '../event-bus';
import { logger } from '../../utils/logger';
import { loadEnv } from '../../config/env';
import nodemailer from 'nodemailer';

interface BackupEventData {
  filename: string;
  size: number;
  downloadUrl?: string;
  error?: string;
  duration?: number;
}

const BACKUP_NOTIFICATION_EMAIL = 'ahmetdaldemir@gmail.com';

/**
 * Send email using global SMTP settings (for system notifications)
 */
async function sendSystemEmail(to: string, subject: string, html: string): Promise<boolean> {
  const env = loadEnv();
  
  // Check if SMTP is configured
  if (!env.smtp?.host || !env.smtp?.user) {
    logger.warn('[BackupHandler] SMTP not configured, skipping email notification');
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port || 587,
      secure: env.smtp.secure || false,
      auth: {
        user: env.smtp.user,
        pass: env.smtp.pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    await transporter.sendMail({
      from: env.smtp.from || env.smtp.user,
      to,
      subject,
      html,
    });

    return true;
  } catch (error) {
    logger.error('[BackupHandler] Failed to send email', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Backup event handler'larını kaydet
 */
export function registerBackupEventHandlers(): void {
  const env = loadEnv();

  // Backup başladığında
  EventBus.on<BackupEventData>(
    EventTypes.BACKUP_STARTED,
    async (event: DomainEvent<BackupEventData>) => {
      logger.info(`[BackupHandler] Backup started`, {
        correlationId: event.correlationId,
      });
    }
  );

  // Backup tamamlandığında
  EventBus.on<BackupEventData>(
    EventTypes.BACKUP_COMPLETED,
    async (event: DomainEvent<BackupEventData>) => {
      const { data } = event;
      
      logger.info(`[BackupHandler] Backup completed: ${data.filename}`, {
        size: data.size,
        correlationId: event.correlationId,
      });

      // Email bildirimi gönder
      try {
        const sizeMB = (data.size / (1024 * 1024)).toFixed(2);
        const downloadLink = data.downloadUrl || `${env.app.baseUrl}/api/backups/download/${data.filename}`;
        
        const emailSent = await sendSystemEmail(
          BACKUP_NOTIFICATION_EMAIL,
          `✅ Database Backup Tamamlandı - ${new Date().toLocaleDateString('tr-TR')}`,
          `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
    .info-box { background: white; padding: 15px; margin: 15px 0; border-radius: 4px; border-left: 4px solid #4CAF50; }
    .download-btn { display: inline-block; background: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 15px; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🗄️ Database Backup</h1>
      <p>Yedekleme Başarıyla Tamamlandı</p>
    </div>
    <div class="content">
      <div class="info-box">
        <strong>📁 Dosya:</strong> ${data.filename}<br>
        <strong>📊 Boyut:</strong> ${sizeMB} MB<br>
        <strong>📅 Tarih:</strong> ${new Date().toLocaleString('tr-TR')}<br>
        <strong>⏱️ Süre:</strong> ${data.duration ? `${(data.duration / 1000).toFixed(1)} saniye` : 'N/A'}
      </div>
      
      <p>Yedek dosyasını indirmek için aşağıdaki butona tıklayın:</p>
      
      <a href="${downloadLink}" class="download-btn">📥 Yedek Dosyasını İndir</a>
      
      <p style="margin-top: 20px; color: #666; font-size: 13px;">
        <strong>Not:</strong> Bu link 24 saat geçerlidir. Eski yedekler 7 gün sonra otomatik silinir.
      </p>
    </div>
    <div class="footer">
      <p>SaaS Tour 360 - Otomatik Yedekleme Sistemi</p>
    </div>
  </div>
</body>
</html>
          `
        );
        
        if (emailSent) {
          logger.info(`[BackupHandler] Backup notification email sent to ${BACKUP_NOTIFICATION_EMAIL}`);
        }
      } catch (error) {
        logger.error(`[BackupHandler] Failed to send backup notification email`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );

  // Backup başarısız olduğunda
  EventBus.on<BackupEventData>(
    EventTypes.BACKUP_FAILED,
    async (event: DomainEvent<BackupEventData>) => {
      const { data } = event;
      
      logger.error(`[BackupHandler] Backup failed`, {
        error: data.error,
        correlationId: event.correlationId,
      });

      // Hata bildirimi gönder
      try {
        const emailSent = await sendSystemEmail(
          BACKUP_NOTIFICATION_EMAIL,
          `❌ Database Backup BAŞARISIZ - ${new Date().toLocaleDateString('tr-TR')}`,
          `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f44336; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
    .error-box { background: #ffebee; padding: 15px; margin: 15px 0; border-radius: 4px; border-left: 4px solid #f44336; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Database Backup Hatası</h1>
      <p>Yedekleme Başarısız Oldu</p>
    </div>
    <div class="content">
      <div class="error-box">
        <strong>🔴 Hata:</strong><br>
        <code>${data.error || 'Bilinmeyen hata'}</code>
      </div>
      
      <p><strong>📅 Tarih:</strong> ${new Date().toLocaleString('tr-TR')}</p>
      
      <p style="margin-top: 20px;">
        Lütfen sunucu loglarını kontrol edin ve gerekli müdahaleyi yapın.
      </p>
    </div>
    <div class="footer">
      <p>SaaS Tour 360 - Otomatik Yedekleme Sistemi</p>
    </div>
  </div>
</body>
</html>
          `
        );
        
        if (emailSent) {
          logger.info(`[BackupHandler] Backup failure notification sent to ${BACKUP_NOTIFICATION_EMAIL}`);
        }
      } catch (error) {
        logger.error(`[BackupHandler] Failed to send backup failure notification`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );

  logger.info('[BackupHandler] Backup event handlers registered');
}
