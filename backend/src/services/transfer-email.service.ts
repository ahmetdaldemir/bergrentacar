import { TransferReservation, TransferReservationStatus } from '../modules/transfer/entities/transfer-reservation.entity';
import { EmailTemplateService } from '../modules/shared/services/email-template.service';
import { EmailTemplateType } from '../modules/shared/entities/email-template.entity';
import { TenantSettingsService } from '../modules/shared/services/tenant-settings.service';
import { EmailLayoutService } from './email-layout.service';
import { QueueService, EmailJob } from './queue.service';
import nodemailer from 'nodemailer';

/**
 * Transfer rezervasyon email'ini kuyruğa ekle
 */
export const queueTransferReservationEmail = async (
  reservation: TransferReservation,
  templateType: EmailTemplateType,
  priority: 'normal' | 'high' = 'normal'
): Promise<void> => {
  if (!reservation.passengerEmail) {
    console.log(`Transfer reservation ${reservation.id} has no passenger email, skipping email.`);
    return;
  }

  try {
    let jobType: EmailJob['type'];
    switch (templateType) {
      case EmailTemplateType.RESERVATION_CONFIRMATION:
        jobType = 'reservation_confirmation';
        break;
      case EmailTemplateType.RESERVATION_CANCELLED:
        jobType = 'reservation_cancelled';
        break;
      case EmailTemplateType.RESERVATION_COMPLETED:
        jobType = 'reservation_completed';
        break;
      default:
        jobType = 'reservation_confirmation';
    }

    await QueueService.publishEmailJob({
      type: jobType,
      tenantId: reservation.tenantId,
      data: {
        reservationId: reservation.id,
        email: reservation.passengerEmail,
        languageId: undefined, // Transfer rezervasyonlarda dil desteği eklenebilir
        isTransferReservation: true, // Transfer rezervasyon olduğunu belirt
      },
      priority,
    });
    console.log(`✅ Transfer reservation email queued: ${jobType} for ${reservation.passengerEmail}`);
  } catch (error) {
    console.error('Failed to queue transfer reservation email:', error);
    // Fallback: Direkt gönder (kuyruk yoksa)
    await sendTransferReservationEmailDirect(reservation, templateType);
  }
};

/**
 * Transfer rezervasyon durumuna göre uygun e-posta şablonunu kullanarak mail gönderir
 */
export const sendTransferReservationEmail = async (
  reservation: TransferReservation,
  templateType: EmailTemplateType
): Promise<void> => {
  // Kuyruk sistemi varsa kuyruğa ekle, yoksa direkt gönder
  const useQueue = process.env.USE_EMAIL_QUEUE !== 'false';
  if (useQueue) {
    return queueTransferReservationEmail(reservation, templateType);
  }
  return sendTransferReservationEmailDirect(reservation, templateType);
};

/**
 * Direkt email gönder (worker tarafından kullanılır)
 */
export const sendTransferReservationEmailDirect = async (
  reservation: TransferReservation,
  templateType: EmailTemplateType
): Promise<void> => {
  if (!reservation.tenantId) {
    console.error(`Transfer reservation ${reservation.id} has no tenantId, cannot send email.`);
    return;
  }

  if (!reservation.passengerEmail) {
    console.error(`Transfer reservation ${reservation.id} has no passenger email, cannot send email.`);
    return;
  }

  // Mail ayarlarını al
  const mailSettings = await TenantSettingsService.getMailSettings(reservation.tenantId);
  if (!mailSettings || !mailSettings.smtpHost || !mailSettings.fromEmail) {
    console.warn(`Mail settings not configured for tenant ${reservation.tenantId}, cannot send email.`);
    return;
  }

  // Şablonu al (dil desteği eklenebilir)
  let template = await EmailTemplateService.getByType(
    reservation.tenantId,
    templateType,
    undefined
  );

  // If no template found, use default template
  if (!template) {
    console.warn(`No email template found for type ${templateType} and tenant ${reservation.tenantId}, using default template`);
    template = {
      id: 'default',
      subject: getDefaultEmailSubject(reservation, templateType),
      body: getDefaultEmailBody(reservation, templateType),
    } as any;
  }

  // Ensure template is not null (TypeScript check)
  if (!template) {
    console.error(`Could not create default template for transfer reservation ${reservation.id}`);
    return;
  }

  // SMTP transporter oluştur
  const smtpPort = mailSettings.smtpPort || 587;
  const useSecure = mailSettings.smtpSecure !== undefined 
    ? mailSettings.smtpSecure 
    : smtpPort === 465;
  
  const transporter = nodemailer.createTransport({
    host: mailSettings.smtpHost,
    port: smtpPort,
    secure: useSecure,
    requireTLS: !useSecure && smtpPort === 587,
    auth: {
      user: mailSettings.smtpUser,
      pass: mailSettings.smtpPassword,
    },
  });

  // Email değişkenlerini hazırla
  const variables: Record<string, any> = {
    customerName: reservation.passengerName,
    reservationReference: reservation.reference,
    reservationDate: reservation.transferDate ? new Date(reservation.transferDate).toLocaleDateString('tr-TR') : '',
    reservationTime: reservation.transferTime || '',
    totalPrice: reservation.totalPrice || 0,
    currencyCode: reservation.currencyCode || 'EUR',
    pickupLocation: reservation.pickupPlaceName || reservation.pickupAddress || '',
    dropoffLocation: reservation.dropoffPlaceName || reservation.dropoffAddress || '',
    vehicleName: reservation.vehicle?.name || '',
    passengerCount: reservation.passengerCount || 1,
    status: getStatusLabel(reservation.status),
  };

  // Şablon değişkenlerini değiştir
  const subject = EmailTemplateService.replaceVariables(template.subject, variables);
  const templateBody = EmailTemplateService.replaceVariables(template.body, variables);

  // Site settings'i al (logo ve adres bilgileri için)
  const siteSettings = await TenantSettingsService.getSiteSettings(reservation.tenantId);

  // Layout ile sarmala (logo ve footer bilgileriyle)
  const htmlBody = EmailLayoutService.wrapContent(templateBody, siteSettings);

  // Mail gönder
  try {
    await transporter.sendMail({
      from: `"${mailSettings.fromName || 'Transfer Rezervasyon Sistemi'}" <${mailSettings.fromEmail}>`,
      to: reservation.passengerEmail,
      subject,
      html: htmlBody,
    });

    console.log(`✅ Transfer reservation email (${templateType}) sent to ${reservation.passengerEmail} for reservation ${reservation.reference}`);
  } catch (error) {
    console.error(`❌ Failed to send transfer reservation email (${templateType}) for reservation ${reservation.reference}:`, (error as Error).message);
    throw error;
  }
};

/**
 * Default email subject
 */
function getDefaultEmailSubject(reservation: TransferReservation, templateType: EmailTemplateType): string {
  switch (templateType) {
    case EmailTemplateType.RESERVATION_CONFIRMATION:
      return `Transfer Rezervasyon Onayı - ${reservation.reference}`;
    case EmailTemplateType.RESERVATION_CANCELLED:
      return `Transfer Rezervasyon İptali - ${reservation.reference}`;
    case EmailTemplateType.RESERVATION_COMPLETED:
      return `Transfer Rezervasyon Tamamlandı - ${reservation.reference}`;
    default:
      return `Transfer Rezervasyon Bilgilendirme - ${reservation.reference}`;
  }
}

/**
 * Default email body
 */
function getDefaultEmailBody(reservation: TransferReservation, templateType: EmailTemplateType): string {
  const pickupLocation = reservation.pickupPlaceName || reservation.pickupAddress || '';
  const dropoffLocation = reservation.dropoffPlaceName || reservation.dropoffAddress || '';
  const transferDate = reservation.transferDate ? new Date(reservation.transferDate).toLocaleDateString('tr-TR') : '';
  
  let body = `
    <h2>Merhaba ${reservation.passengerName},</h2>
    <p>Transfer rezervasyonunuz hakkında bilgilendirme:</p>
    <ul>
      <li><strong>Referans No:</strong> ${reservation.reference}</li>
      <li><strong>Tarih:</strong> ${transferDate}</li>
      <li><strong>Saat:</strong> ${reservation.transferTime || ''}</li>
      <li><strong>Alış Yeri:</strong> ${pickupLocation}</li>
      <li><strong>Bırakış Yeri:</strong> ${dropoffLocation}</li>
      <li><strong>Araç:</strong> ${reservation.vehicle?.name || ''}</li>
      <li><strong>Yolcu Sayısı:</strong> ${reservation.passengerCount || 1}</li>
      <li><strong>Toplam Tutar:</strong> ${reservation.totalPrice || 0} ${reservation.currencyCode || 'EUR'}</li>
    </ul>
  `;

  switch (templateType) {
    case EmailTemplateType.RESERVATION_CONFIRMATION:
      body += '<p>Rezervasyonunuz onaylanmıştır. Transfer gününde belirtilen saatte hazır olunuz.</p>';
      break;
    case EmailTemplateType.RESERVATION_CANCELLED:
      body += '<p>Rezervasyonunuz iptal edilmiştir.</p>';
      break;
    case EmailTemplateType.RESERVATION_COMPLETED:
      body += '<p>Transferiniz tamamlanmıştır. Bizi tercih ettiğiniz için teşekkür ederiz.</p>';
      break;
  }

  return body;
}

/**
 * Durum etiketini al
 */
function getStatusLabel(status: TransferReservationStatus): string {
  const labels: Record<TransferReservationStatus, string> = {
    [TransferReservationStatus.PENDING]: 'Beklemede',
    [TransferReservationStatus.CONFIRMED]: 'Onaylandı',
    [TransferReservationStatus.IN_PROGRESS]: 'Devam Ediyor',
    [TransferReservationStatus.COMPLETED]: 'Tamamlandı',
    [TransferReservationStatus.CANCELLED]: 'İptal Edildi',
  };
  return labels[status] || status;
}

