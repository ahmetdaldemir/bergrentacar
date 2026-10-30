import { TransferReservation } from '../modules/transfer/entities/transfer-reservation.entity';
import { TransferDriver } from '../modules/transfer/entities/transfer-driver.entity';
import { sendMail } from './mail.service';
import { SMSService } from './sms.service';
import { WhatsAppService } from './whatsapp.service';
import { logger } from '../utils/logger';

/**
 * Send driver assignment notifications (Email, SMS, WhatsApp)
 */
export async function sendDriverAssignmentNotifications(
  reservation: TransferReservation,
  driver: TransferDriver
): Promise<void> {
  const notifications: Promise<any>[] = [];

  // Format reservation details for messages
  const transferDate = new Date(reservation.transferDate).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const transferTime = reservation.transferTime;

  const pickupLocation = reservation.pickupPlaceName || reservation.pickupAddress || 'Belirtilmemiş';
  const dropoffLocation = reservation.dropoffPlaceName || reservation.dropoffAddress || 'Belirtilmemiş';

  // Email notification
  if (driver.email) {
    const emailPromise = sendMail({
      tenantId: reservation.tenantId,
      to: driver.email,
      subject: `Transfer Rezervasyonu Atandı - ${reservation.reference}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Transfer Rezervasyonu Atandı</h2>
          <p>Sayın ${driver.name},</p>
          <p>Size yeni bir transfer rezervasyonu atanmıştır:</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Rezervasyon Detayları</h3>
            <p><strong>Rezervasyon No:</strong> ${reservation.reference}</p>
            <p><strong>Tarih:</strong> ${transferDate}</p>
            <p><strong>Saat:</strong> ${transferTime}</p>
            <p><strong>Alış Yeri:</strong> ${pickupLocation}</p>
            <p><strong>Bırakış Yeri:</strong> ${dropoffLocation}</p>
            <p><strong>Yolcu:</strong> ${reservation.passengerName}</p>
            <p><strong>Telefon:</strong> ${reservation.passengerPhone}</p>
            <p><strong>Yolcu Sayısı:</strong> ${reservation.passengerCount}</p>
            <p><strong>Bagaj Sayısı:</strong> ${reservation.luggageCount || 0}</p>
            ${reservation.flightNumber ? `<p><strong>Uçuş No:</strong> ${reservation.flightNumber}</p>` : ''}
            ${reservation.customerNotes ? `<p><strong>Notlar:</strong> ${reservation.customerNotes}</p>` : ''}
          </div>
          
          <p>Lütfen rezervasyon detaylarını kontrol edin ve zamanında hazır olun.</p>
          <p>İyi çalışmalar dileriz.</p>
        </div>
      `,
    }).catch((error) => {
      logger.error(`Failed to send driver assignment email to ${driver.email}`, error);
      return { success: false, error };
    });

    notifications.push(emailPromise);
  }

  // SMS notification
  if (driver.phone) {
    const smsMessage = `Transfer Rezervasyonu Atandı\n\nRezervasyon: ${reservation.reference}\nTarih: ${transferDate} ${transferTime}\nAlış: ${pickupLocation}\nBırakış: ${dropoffLocation}\nYolcu: ${reservation.passengerName} (${reservation.passengerPhone})\n\nLütfen detayları kontrol edin.`;
    
    const smsPromise = SMSService.sendSMS({
      tenantId: reservation.tenantId,
      to: driver.phone,
      message: smsMessage,
    }).catch((error) => {
      logger.error(`Failed to send driver assignment SMS to ${driver.phone}`, error);
      return { success: false, error };
    });

    notifications.push(smsPromise);
  }

  // WhatsApp notification
  if (driver.phone) {
    const whatsappMessage = `🚗 *Transfer Rezervasyonu Atandı*\n\n📋 *Rezervasyon:* ${reservation.reference}\n📅 *Tarih:* ${transferDate} ${transferTime}\n📍 *Alış Yeri:* ${pickupLocation}\n📍 *Bırakış Yeri:* ${dropoffLocation}\n👤 *Yolcu:* ${reservation.passengerName}\n📞 *Telefon:* ${reservation.passengerPhone}\n👥 *Yolcu Sayısı:* ${reservation.passengerCount}\n🧳 *Bagaj:* ${reservation.luggageCount || 0}${reservation.flightNumber ? `\n✈️ *Uçuş No:* ${reservation.flightNumber}` : ''}${reservation.customerNotes ? `\n📝 *Notlar:* ${reservation.customerNotes}` : ''}\n\nLütfen rezervasyon detaylarını kontrol edin ve zamanında hazır olun.`;
    
    const whatsappPromise = WhatsAppService.sendWhatsApp({
      tenantId: reservation.tenantId,
      to: driver.phone,
      message: whatsappMessage,
    }).catch((error) => {
      logger.error(`Failed to send driver assignment WhatsApp to ${driver.phone}`, error);
      return { success: false, error };
    });

    notifications.push(whatsappPromise);
  }

  // Send all notifications in parallel
  await Promise.allSettled(notifications);

  logger.info(`Driver assignment notifications sent for reservation ${reservation.reference} to driver ${driver.name}`, {
    reservationId: reservation.id,
    driverId: driver.id,
    emailSent: !!driver.email,
    smsSent: !!driver.phone,
    whatsappSent: !!driver.phone,
  });
}

