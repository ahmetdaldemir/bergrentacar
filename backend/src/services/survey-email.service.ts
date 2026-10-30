import { SurveyService } from '../modules/shared/services/survey.service';
import { Reservation, ReservationStatus } from '../modules/shared/entities/reservation.entity';
import { AppDataSource } from '../config/data-source';
import { TenantSettingsService } from '../modules/shared/services/tenant-settings.service';
import nodemailer from 'nodemailer';

/**
 * Rezervasyon tamamlandığında otomatik anket maili gönderir
 */
export const sendSurveyEmailForReservation = async (reservation: Reservation) => {
  if (reservation.status !== ReservationStatus.COMPLETED) {
    return; // Sadece tamamlanmış rezervasyonlar için
  }

  if (!reservation.checkOut) {
    return; // checkOut tarihi olmayan rezervasyonlar için gönderme
  }

  try {
    // Rezervasyonun müşteri diline göre anket bul
    const languageId = reservation.customerLanguageId || undefined;
    
    // Tenant için aktif ve otomatik gönderim açık anketleri al (müşteri diline göre)
    const surveys = await SurveyService.getActiveAutoSendSurveys(reservation.tenantId, languageId);

    if (surveys.length === 0) {
      console.log(`No surveys found for tenant ${reservation.tenantId} with language ${languageId || 'any'}`);
      return; // Anket yoksa çık
    }

    // Mail ayarlarını al
    const mailSettings = await TenantSettingsService.getMailSettings(reservation.tenantId);

    if (!mailSettings || !mailSettings.smtpHost || !mailSettings.fromEmail) {
      console.warn(`Mail settings not configured for tenant ${reservation.tenantId}`);
      return;
    }

    // SMTP transporter oluştur
    // Port ve secure ayarını otomatik belirle
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

    // Her anket için mail gönder (genelde tek anket olur ama esneklik için)
    for (const survey of surveys) {
      if (!survey.questions || survey.questions.length === 0) {
        continue; // Soru yoksa atla
      }

      // sendAfterDays'e göre kontrol et
      const sendDate = new Date(reservation.checkOut);
      sendDate.setDate(sendDate.getDate() + (survey.sendAfterDays || 1));

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      sendDate.setHours(0, 0, 0, 0);

      // Eğer gönderim tarihi henüz gelmediyse, scheduled job'a bırak (şimdilik hemen gönder)
      // TODO: Scheduled job sistemi eklendiğinde burada kontrol yapılacak

      // Anket linki oluştur (frontend'de anket cevaplama sayfası)
      // TODO: Frontend'de anket cevaplama sayfası oluşturulduğunda bu URL'i güncelleyin
      const frontendUrl = process.env.FRONTEND_URL || process.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:9001';
      const surveyUrl = `${frontendUrl}/survey/${survey.id}?reservation=${reservation.id}`;

      // E-posta şablonu
      const emailSubject = survey.emailSubject || `Anket: ${survey.title}`;
      const emailBody = survey.emailTemplate || getDefaultEmailTemplate(survey, reservation, surveyUrl);

      // Mail gönder
      await transporter.sendMail({
        from: `"${mailSettings.fromName || 'Anket Sistemi'}" <${mailSettings.fromEmail}>`,
        to: reservation.customerEmail,
        subject: emailSubject,
        html: emailBody,
      });

      console.log(`Survey email sent to ${reservation.customerEmail} for reservation ${reservation.id}`);
    }
  } catch (error) {
    console.error('Failed to send survey email:', error);
    // Hata durumunda exception fırlatmıyoruz, çünkü rezervasyon işlemi etkilenmemeli
  }
};

/**
 * Varsayılan e-posta şablonu
 */
function getDefaultEmailTemplate(survey: any, reservation: any, surveyUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .button { display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Anket</h1>
        </div>
        <div class="content">
          <p>Sayın ${reservation.customerName},</p>
          <p>Rezervasyonunuzu tamamladığınız için teşekkür ederiz.</p>
          <p>Deneyiminizi iyileştirmek için aşağıdaki ankete katılmanızı rica ederiz:</p>
          <h2>${survey.title}</h2>
          ${survey.description ? `<p>${survey.description}</p>` : ''}
          <div style="text-align: center;">
            <a href="${surveyUrl}" class="button">Anketi Doldur</a>
          </div>
          <p>Yukarıdaki butona tıklayarak veya aşağıdaki linki kullanarak ankete katılabilirsiniz:</p>
          <p><a href="${surveyUrl}">${surveyUrl}</a></p>
        </div>
        <div class="footer">
          <p>Bu e-posta otomatik olarak gönderilmiştir. Lütfen bu e-postaya yanıt vermeyin.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

