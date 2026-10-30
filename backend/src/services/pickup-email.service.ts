import { Reservation } from '../modules/shared/entities/reservation.entity';
import { RentalPickup } from '../modules/rentacar/entities/rental-pickup.entity';
import { RentalInspectionMedia } from '../modules/rentacar/entities/rental-inspection-media.entity';
import { EmailTemplateService } from '../modules/shared/services/email-template.service';
import { EmailTemplateType } from '../modules/shared/entities/email-template.entity';
import { TenantSettingsService } from '../modules/shared/services/tenant-settings.service';
import { EmailLayoutService } from './email-layout.service';
import { QueueService, EmailJob } from './queue.service';
import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs/promises';

/**
 * Pickup email'ini kuyruğa ekle
 */
export const queuePickupEmail = async (
  reservation: Reservation,
  pickup: RentalPickup,
  photos: RentalInspectionMedia[],
  priority: 'normal' | 'high' = 'normal'
): Promise<void> => {
  if (!reservation.customerEmail) {
    console.log(`Reservation ${reservation.id} has no customer email, skipping pickup email.`);
    return;
  }

  try {
    await QueueService.publishEmailJob({
      type: 'vehicle_pickup',
      tenantId: reservation.tenantId,
      data: {
        reservationId: reservation.id,
        pickupId: pickup.id,
        email: reservation.customerEmail,
        languageId: reservation.customerLanguageId || undefined,
      },
      priority,
    });
    console.log(`✅ Pickup email queued for ${reservation.customerEmail}`);
  } catch (error) {
    console.error('Failed to queue pickup email:', error);
    // Fallback: Direkt gönder
    await sendPickupEmailDirect(reservation, pickup, photos);
  }
};

/**
 * Pickup email gönder
 */
export const sendPickupEmail = async (
  reservation: Reservation,
  pickup: RentalPickup,
  photos: RentalInspectionMedia[]
): Promise<void> => {
  const useQueue = process.env.USE_EMAIL_QUEUE !== 'false';
  if (useQueue) {
    await queuePickupEmail(reservation, pickup, photos);
    return;
  }
  return sendPickupEmailDirect(reservation, pickup, photos);
};

/**
 * Direkt pickup email gönder (worker tarafından kullanılır)
 */
export const sendPickupEmailDirect = async (
  reservation: Reservation,
  pickup: RentalPickup,
  photos: RentalInspectionMedia[]
): Promise<void> => {
  if (!reservation.tenantId) {
    console.error(`Reservation ${reservation.id} has no tenantId, cannot send pickup email.`);
    return;
  }

  if (!reservation.customerEmail) {
    console.log(`Reservation ${reservation.id} has no customer email, skipping pickup email.`);
    return;
  }

  // Mail ayarlarını al
  const mailSettings = await TenantSettingsService.getMailSettings(reservation.tenantId);
  if (!mailSettings || !mailSettings.smtpHost || !mailSettings.fromEmail) {
    console.warn(`Mail settings not configured for tenant ${reservation.tenantId}, cannot send pickup email.`);
    return;
  }

  // Müşteri diline göre şablonu al
  let template = await EmailTemplateService.getByType(
    reservation.tenantId,
    EmailTemplateType.VEHICLE_PICKUP,
    reservation.customerLanguageId || undefined
  );

  // If no template found, use default template
  if (!template) {
    console.warn(`No pickup email template found for tenant ${reservation.tenantId}, using default template`);
    template = {
      id: 'default',
      subject: getDefaultPickupEmailSubject(reservation),
      body: getDefaultPickupEmailBody(reservation, pickup, photos),
    } as any;
  }

  if (!template) {
    console.error(`Could not create default pickup template for reservation ${reservation.id}`);
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
    tls: {
      rejectUnauthorized: false,
    },
  });

  // Rezervasyon değişkenlerini hazırla
  const metadata = reservation.metadata || {};
  
  const variables: Record<string, string | number> = {
    customerName: reservation.customerName || '',
    customerEmail: reservation.customerEmail || '',
    customerPhone: reservation.customerPhone || '',
    reservationReference: reservation.reference || reservation.id.substring(0, 8).toUpperCase(),
    checkIn: reservation.checkIn ? formatDate(reservation.checkIn) : '',
    checkOut: reservation.checkOut ? formatDate(reservation.checkOut) : '',
    vehicleName: (metadata.vehicleName as string) || '',
    vehiclePlate: (metadata.vehiclePlate as string) || '',
    pickupLocationName: (metadata.pickupLocationName as string) || '',
    dropoffLocationName: (metadata.dropoffLocationName as string) || '',
    odometerKm: pickup.odometerKm ? pickup.odometerKm.toString() : '0',
    fuelLevel: formatFuelLevel(pickup.fuelLevel || ''),
    pickupDate: pickup.completedAt ? formatDate(pickup.completedAt) : formatDate(new Date()),
    pickupTime: pickup.completedAt ? formatTime(pickup.completedAt) : formatTime(new Date()),
  };

  // Fotoğrafları HTML'e ekle
  const photosHtml = generatePhotosHtml(photos);
  variables.photosHtml = photosHtml;

  // Şablon değişkenlerini değiştir
  const subject = EmailTemplateService.replaceVariables(template.subject, variables);
  let templateBody = EmailTemplateService.replaceVariables(template.body, variables);

  // Fotoğrafları template body'ye ekle (eğer {{photosHtml}} yoksa)
  if (!templateBody.includes('{{photosHtml}}') && photos.length > 0) {
    templateBody += photosHtml;
  } else {
    templateBody = templateBody.replace('{{photosHtml}}', photosHtml);
  }

  // Site settings'i al
  const siteSettings = await TenantSettingsService.getSiteSettings(reservation.tenantId);

  // Layout ile sarmala
  const htmlBody = EmailLayoutService.wrapContent(templateBody, siteSettings);

  // Fotoğrafları attachment olarak ekle (opsiyonel - bazı email client'lar inline image'ları desteklemez)
  const attachments: Array<{
    filename: string;
    path?: string;
    cid?: string;
    href?: string;
  }> = [];
  
  // Fotoğrafları attachment olarak ekle (URL'den indirip ekle)
  // Not: Bu işlem zaman alabilir, production'da async yapılmalı
  try {
    for (const photo of photos.slice(0, 8)) { // Max 8 fotoğraf
      if (photo.mediaUrl) {
        // URL'den dosya indir (local file ise direkt kullan)
        if (photo.mediaUrl.startsWith('http')) {
          // Remote URL - attachment olarak ekle (bazı email client'lar remote URL'leri göstermez)
          attachments.push({
            filename: `pickup-photo-${photo.slotIndex}.jpg`,
            path: photo.mediaUrl,
            cid: `pickup-photo-${photo.slotIndex}`, // Content ID for inline images
          });
        } else {
          // Local file path
          const filePath = path.join(process.cwd(), photo.mediaUrl);
          try {
            await fs.access(filePath);
            attachments.push({
              filename: `pickup-photo-${photo.slotIndex}.jpg`,
              path: filePath,
              cid: `pickup-photo-${photo.slotIndex}`,
            });
          } catch (error) {
            console.warn(`Could not access file ${filePath}, skipping attachment`);
          }
        }
      }
    }
  } catch (error) {
    console.warn('Error preparing photo attachments:', error);
  }

  // Mail gönder
  try {
    await transporter.sendMail({
      from: `"${mailSettings.fromName || 'Rezervasyon Sistemi'}" <${mailSettings.fromEmail}>`,
      to: reservation.customerEmail,
      subject,
      html: htmlBody,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    console.log(`✅ Pickup email sent to ${reservation.customerEmail} for reservation ${reservation.id}`);
  } catch (error) {
    console.error(`❌ Failed to send pickup email for reservation ${reservation.id}:`, (error as Error).message);
    throw error;
  }
};

/**
 * Fotoğrafları HTML formatına çevir
 */
function generatePhotosHtml(photos: RentalInspectionMedia[]): string {
  if (photos.length === 0) {
    return '';
  }

  // Fotoğrafları slot index'e göre sırala
  const sortedPhotos = [...photos].sort((a, b) => a.slotIndex - b.slotIndex);

  const photoItems = sortedPhotos.map((photo, index) => {
    const slotNames: Record<number, string> = {
      1: 'Ön Görünüm',
      2: 'Arka Görünüm',
      3: 'Sol Yan',
      4: 'Sağ Yan',
      5: 'Ön İç',
      6: 'Arka İç',
      7: 'Motor',
      8: 'Bagaj',
    };

    const slotName = slotNames[photo.slotIndex] || `Fotoğraf ${photo.slotIndex}`;
    
    // URL'den veya CID'den görsel göster
    const imageSrc = photo.mediaUrl.startsWith('http') 
      ? photo.mediaUrl 
      : `cid:pickup-photo-${photo.slotIndex}`;

    return `
      <div style="margin-bottom: 20px; text-align: center;">
        <h3 style="font-size: 14px; color: #333; margin-bottom: 10px; font-weight: 600;">${slotName}</h3>
        <img 
          src="${imageSrc}" 
          alt="${slotName}" 
          style="max-width: 100%; height: auto; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"
        />
      </div>
    `;
  }).join('');

  return `
    <div style="margin: 30px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
      <h2 style="font-size: 18px; color: #111827; margin-bottom: 20px; font-weight: 600; text-align: center;">
        Araç Çıkış Fotoğrafları
      </h2>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
        ${photoItems}
      </div>
      <p style="margin-top: 20px; font-size: 12px; color: #6b7280; text-align: center;">
        Bu fotoğraflar araç çıkış anında çekilmiştir. Lütfen dikkatlice inceleyiniz.
      </p>
    </div>
  `;
}

/**
 * Default pickup email subject
 */
function getDefaultPickupEmailSubject(reservation: Reservation): string {
  return `Araç Çıkış Bilgileri - Rezervasyon ${reservation.reference || reservation.id.substring(0, 8).toUpperCase()}`;
}

/**
 * Default pickup email body
 */
function getDefaultPickupEmailBody(
  reservation: Reservation,
  pickup: RentalPickup,
  photos: RentalInspectionMedia[]
): string {
  const metadata = reservation.metadata || {};
  const vehicleName = (metadata.vehicleName as string) || 'Araç';
  const vehiclePlate = (metadata.vehiclePlate as string) || '';
  const pickupLocation = (metadata.pickupLocationName as string) || '';

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #111827; font-size: 24px; margin-bottom: 20px;">Araç Çıkış İşlemi Tamamlandı</h2>
      
      <p>Sayın <strong>${reservation.customerName}</strong>,</p>
      
      <p>Rezervasyon numaranız <strong>${reservation.reference || reservation.id.substring(0, 8).toUpperCase()}</strong> için araç çıkış işlemi başarıyla tamamlanmıştır.</p>
      
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #111827; font-size: 18px; margin-bottom: 15px;">Çıkış Bilgileri</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; width: 40%;"><strong>Araç:</strong></td>
            <td style="padding: 8px 0; color: #111827;">${vehicleName} ${vehiclePlate ? `(${vehiclePlate})` : ''}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;"><strong>Çıkış Lokasyonu:</strong></td>
            <td style="padding: 8px 0; color: #111827;">${pickupLocation || 'Belirtilmemiş'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;"><strong>Kilometre:</strong></td>
            <td style="padding: 8px 0; color: #111827;">${pickup.odometerKm || 0} km</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;"><strong>Yakıt Seviyesi:</strong></td>
            <td style="padding: 8px 0; color: #111827;">${formatFuelLevel(pickup.fuelLevel || '')}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;"><strong>Çıkış Tarihi:</strong></td>
            <td style="padding: 8px 0; color: #111827;">${pickup.completedAt ? formatDate(pickup.completedAt) : formatDate(new Date())}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;"><strong>Çıkış Saati:</strong></td>
            <td style="padding: 8px 0; color: #111827;">${pickup.completedAt ? formatTime(pickup.completedAt) : formatTime(new Date())}</td>
          </tr>
        </table>
      </div>
      
      <p style="margin-top: 20px;">Aşağıda araç çıkış anında çekilen fotoğrafları görebilirsiniz. Lütfen bu fotoğrafları dikkatlice inceleyiniz.</p>
      
      <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
        Herhangi bir sorunuz veya sorununuz varsa lütfen bizimle iletişime geçin.
      </p>
      
      <p style="margin-top: 20px;">İyi yolculuklar dileriz!</p>
    </div>
  `;
}

// Helper functions
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFuelLevel(level: string): string {
  const levelMap: Record<string, string> = {
    full: 'Dolu',
    '3/4': '3/4',
    '1/2': 'Yarım',
    '1/4': '1/4',
    empty: 'Boş',
  };
  return levelMap[level] || level;
}

