import { Reservation, ReservationStatus } from '../modules/shared/entities/reservation.entity';
import { EmailTemplateService } from '../modules/shared/services/email-template.service';
import { EmailTemplateType } from '../modules/shared/entities/email-template.entity';
import { TenantSettingsService } from '../modules/shared/services/tenant-settings.service';
import { EmailLayoutService } from './email-layout.service';
import { VoucherService, absoluteLogoUrl } from './voucher.service';
import { QueueService, EmailJob } from './queue.service';
import nodemailer from 'nodemailer';

// ─── i18n dictionaries ────────────────────────────────────────────────────────
type EmailDict = Record<string, string>;

const EMAIL_I18N: Record<string, EmailDict> = {
  tr: {
    greeting: 'Sayın',
    regards: 'Saygılarımızla',
    // Email titles per template type
    title_confirmation: 'Rezervasyonunuz Alındı',
    title_confirmed: 'Rezervasyonunuz Onaylandı',
    title_rejected: 'Rezervasyonunuz Reddedildi',
    title_cancelled: 'Rezervasyonunuz İptal Edildi',
    title_completed: 'Teşekkürler!',
    title_pending: 'Rezervasyonunuz Beklemede',
    // Status messages
    msg_pending: 'Rezervasyonunuz alınmıştır. Yetkili personellerimiz tarafından incelendikten sonra onay veya red bilgilendirmesi yapılacaktır.',
    msg_confirmed: 'Rezervasyonunuz onaylanmıştır. Ekli voucher\'ı araç tesliminde kimliğinizle birlikte göstermeniz gerekmektedir.',
    msg_rejected: 'Rezervasyonunuz inceleme sonucunda reddedilmiştir. Sorularınız için lütfen bizimle iletişime geçiniz.',
    msg_cancelled: 'Rezervasyonunuz iptal edilmiştir. Sorularınız için lütfen bizimle iletişime geçiniz.',
    msg_completed: 'Rezervasyonunuzu başarıyla tamamladınız. Bizi tercih ettiğiniz için teşekkür ederiz. Tekrar görüşmek dileğiyle!',
    // Labels
    ref_label: 'Rezervasyon No',
    type_label: 'Tür',
    status_label: 'Durum',
    vehicle_label: 'Araç',
    pickup_label: 'Alış Noktası',
    dropoff_label: 'Teslim Noktası',
    checkin_label: 'Alış Tarihi',
    checkout_label: 'Teslim Tarihi',
    days_label: 'Kiralama Süresi',
    vehicle_price_label: 'Araç Ücreti',
    extras_label: 'Ek Hizmet',
    total_label: 'Toplam Tutar',
    payment_label: 'Ödeme',
    tour_label: 'Tur',
    tour_date_label: 'Tur Tarihi',
    passengers_label: 'Katılımcı',
    voucher_note: 'Rezervasyon voucherınız bu e-postaya ek olarak gönderilmiştir. Lütfen yazdırarak yanınızda bulundurunuz.',
    section_reservation: 'REZERVASYON DETAYLARI',
    section_price: 'TUTAR BİLGİSİ',
    approve_btn: 'Rezervasyonu Onayla',
    confirm_reservation_btn: 'Rezervasyonu Onayla',
    cancel_btn: 'Rezervasyonu İptal Et',
    // types / statuses
    type_rentacar: 'Araç Kiralama',
    type_tour: 'Tur Rezervasyonu',
    status_pending: 'Beklemede',
    status_confirmed: 'Onaylandı',
    status_cancelled: 'İptal Edildi',
    status_completed: 'Tamamlandı',
    status_rejected: 'Reddedildi',
    // payment
    cash: 'Nakit', card: 'Kredi Kartı', credit_card: 'Kredi Kartı', bank_transfer: 'Banka Havalesi',
    // day
    day: 'gün',
    from_fallback: 'Rezervasyon',
  },
  en: {
    greeting: 'Dear',
    regards: 'Best regards',
    title_confirmation: 'Reservation Received',
    title_confirmed: 'Reservation Confirmed',
    title_rejected: 'Reservation Rejected',
    title_cancelled: 'Reservation Cancelled',
    title_completed: 'Thank You!',
    title_pending: 'Reservation Pending',
    msg_pending: 'Your reservation has been received. Our team will review it and notify you of approval or rejection shortly.',
    msg_confirmed: 'Your reservation has been confirmed. Please present the attached voucher along with your ID when picking up the vehicle.',
    msg_rejected: 'After careful review, your reservation has been rejected. Please contact us if you have any questions.',
    msg_cancelled: 'Your reservation has been cancelled. Please contact us if you have any questions.',
    msg_completed: 'Your reservation has been completed successfully. Thank you for choosing us — we hope to see you again!',
    ref_label: 'Reservation No',
    type_label: 'Type',
    status_label: 'Status',
    vehicle_label: 'Vehicle',
    pickup_label: 'Pickup Location',
    dropoff_label: 'Return Location',
    checkin_label: 'Pickup Date',
    checkout_label: 'Return Date',
    days_label: 'Rental Duration',
    vehicle_price_label: 'Vehicle Rate',
    extras_label: 'Extras',
    total_label: 'Total Amount',
    payment_label: 'Payment',
    tour_label: 'Tour',
    tour_date_label: 'Tour Date',
    passengers_label: 'Passengers',
    voucher_note: 'Your reservation voucher is attached to this email. Please print it and keep it with you.',
    section_reservation: 'RESERVATION DETAILS',
    section_price: 'PRICE SUMMARY',
    approve_btn: 'Confirm Reservation',
    confirm_reservation_btn: 'Confirm Your Reservation',
    cancel_btn: 'Cancel Reservation',
    type_rentacar: 'Car Rental',
    type_tour: 'Tour Reservation',
    status_pending: 'Pending',
    status_confirmed: 'Confirmed',
    status_cancelled: 'Cancelled',
    status_completed: 'Completed',
    status_rejected: 'Rejected',
    cash: 'Cash', card: 'Credit Card', credit_card: 'Credit Card', bank_transfer: 'Bank Transfer',
    day: 'day(s)',
    from_fallback: 'Reservations',
  },
  de: {
    greeting: 'Sehr geehrte/r',
    regards: 'Mit freundlichen Grüßen',
    title_confirmation: 'Buchung eingegangen',
    title_confirmed: 'Buchung bestätigt',
    title_rejected: 'Buchung abgelehnt',
    title_cancelled: 'Buchung storniert',
    title_completed: 'Vielen Dank!',
    title_pending: 'Buchung ausstehend',
    msg_pending: 'Ihre Buchung ist eingegangen. Unser Team wird sie prüfen und Sie über Bestätigung oder Ablehnung informieren.',
    msg_confirmed: 'Ihre Buchung wurde bestätigt. Bitte legen Sie den beigefügten Voucher mit Ihrem Ausweis bei der Fahrzeugübernahme vor.',
    msg_rejected: 'Nach Prüfung wurde Ihre Buchung leider abgelehnt. Bei Fragen stehen wir Ihnen gerne zur Verfügung.',
    msg_cancelled: 'Ihre Buchung wurde storniert. Bei Fragen stehen wir Ihnen gerne zur Verfügung.',
    msg_completed: 'Ihre Buchung wurde erfolgreich abgeschlossen. Vielen Dank, dass Sie uns gewählt haben!',
    ref_label: 'Buchungsnummer',
    type_label: 'Typ',
    status_label: 'Status',
    vehicle_label: 'Fahrzeug',
    pickup_label: 'Abholort',
    dropoff_label: 'Rückgabeort',
    checkin_label: 'Abholdatum',
    checkout_label: 'Rückgabedatum',
    days_label: 'Mietdauer',
    vehicle_price_label: 'Fahrzeugpreis',
    extras_label: 'Extras',
    total_label: 'Gesamtbetrag',
    payment_label: 'Zahlung',
    tour_label: 'Tour',
    tour_date_label: 'Tourdatum',
    passengers_label: 'Passagiere',
    voucher_note: 'Ihr Buchungsvoucher ist dieser E-Mail beigefügt. Bitte drucken Sie ihn aus und führen Sie ihn mit sich.',
    section_reservation: 'BUCHUNGSDETAILS',
    section_price: 'PREISÜBERSICHT',
    approve_btn: 'Buchung bestätigen',
    confirm_reservation_btn: 'Buchung bestätigen',
    cancel_btn: 'Buchung stornieren',
    type_rentacar: 'Fahrzeugmiete',
    type_tour: 'Tour-Buchung',
    status_pending: 'Ausstehend',
    status_confirmed: 'Bestätigt',
    status_cancelled: 'Storniert',
    status_completed: 'Abgeschlossen',
    status_rejected: 'Abgelehnt',
    cash: 'Bar', card: 'Kreditkarte', credit_card: 'Kreditkarte', bank_transfer: 'Banküberweisung',
    day: 'Tag(e)',
    from_fallback: 'Reservierung',
  },
  fr: {
    greeting: 'Cher/Chère',
    regards: 'Cordialement',
    title_confirmation: 'Réservation reçue',
    title_confirmed: 'Réservation confirmée',
    title_rejected: 'Réservation refusée',
    title_cancelled: 'Réservation annulée',
    title_completed: 'Merci !',
    title_pending: 'Réservation en attente',
    msg_pending: 'Votre réservation a été reçue. Notre équipe va l\'examiner et vous informera de son approbation ou rejet.',
    msg_confirmed: 'Votre réservation a été confirmée. Veuillez présenter le bon joint avec votre pièce d\'identité lors de la prise en charge.',
    msg_rejected: 'Après examen, votre réservation a été refusée. N\'hésitez pas à nous contacter pour toute question.',
    msg_cancelled: 'Votre réservation a été annulée. N\'hésitez pas à nous contacter pour toute question.',
    msg_completed: 'Votre réservation est terminée. Merci de nous avoir choisis — à bientôt !',
    ref_label: 'N° de réservation',
    type_label: 'Type',
    status_label: 'Statut',
    vehicle_label: 'Véhicule',
    pickup_label: 'Lieu de prise en charge',
    dropoff_label: 'Lieu de restitution',
    checkin_label: 'Date de prise en charge',
    checkout_label: 'Date de restitution',
    days_label: 'Durée de location',
    vehicle_price_label: 'Tarif véhicule',
    extras_label: 'Extras',
    total_label: 'Montant total',
    payment_label: 'Paiement',
    tour_label: 'Circuit',
    tour_date_label: 'Date du circuit',
    passengers_label: 'Passagers',
    voucher_note: 'Votre bon de réservation est joint à cet email. Veuillez l\'imprimer et l\'avoir avec vous.',
    section_reservation: 'DÉTAILS DE LA RÉSERVATION',
    section_price: 'RÉCAPITULATIF DES PRIX',
    approve_btn: 'Confirmer la réservation',
    confirm_reservation_btn: 'Confirmer votre réservation',
    cancel_btn: 'Annuler la réservation',
    type_rentacar: 'Location de voiture',
    type_tour: 'Réservation circuit',
    status_pending: 'En attente',
    status_confirmed: 'Confirmée',
    status_cancelled: 'Annulée',
    status_completed: 'Terminée',
    status_rejected: 'Refusée',
    cash: 'Espèces', card: 'Carte de crédit', credit_card: 'Carte de crédit', bank_transfer: 'Virement bancaire',
    day: 'jour(s)',
    from_fallback: 'Réservation',
  },
  ru: {
    greeting: 'Уважаемый/ая',
    regards: 'С уважением',
    title_confirmation: 'Бронирование получено',
    title_confirmed: 'Бронирование подтверждено',
    title_rejected: 'Бронирование отклонено',
    title_cancelled: 'Бронирование отменено',
    title_completed: 'Спасибо!',
    title_pending: 'Бронирование на рассмотрении',
    msg_pending: 'Ваше бронирование получено. Наша команда рассмотрит его и уведомит вас об одобрении или отклонении.',
    msg_confirmed: 'Ваше бронирование подтверждено. Пожалуйста, предъявите прикреплённый ваучер с удостоверением личности при получении автомобиля.',
    msg_rejected: 'После рассмотрения ваше бронирование было отклонено. Пожалуйста, свяжитесь с нами, если у вас есть вопросы.',
    msg_cancelled: 'Ваше бронирование отменено. Пожалуйста, свяжитесь с нами, если у вас есть вопросы.',
    msg_completed: 'Бронирование успешно завершено. Спасибо, что выбрали нас!',
    ref_label: 'Номер бронирования',
    type_label: 'Тип',
    status_label: 'Статус',
    vehicle_label: 'Автомобиль',
    pickup_label: 'Место получения',
    dropoff_label: 'Место возврата',
    checkin_label: 'Дата получения',
    checkout_label: 'Дата возврата',
    days_label: 'Срок аренды',
    vehicle_price_label: 'Стоимость авто',
    extras_label: 'Доп. услуги',
    total_label: 'Итого',
    payment_label: 'Оплата',
    tour_label: 'Тур',
    tour_date_label: 'Дата тура',
    passengers_label: 'Пассажиры',
    voucher_note: 'Ваучер бронирования прикреплён к этому письму. Пожалуйста, распечатайте его и возьмите с собой.',
    section_reservation: 'ДЕТАЛИ БРОНИРОВАНИЯ',
    section_price: 'СТОИМОСТЬ',
    approve_btn: 'Подтвердить бронирование',
    confirm_reservation_btn: 'Подтвердить ваше бронирование',
    cancel_btn: 'Отменить бронирование',
    type_rentacar: 'Аренда авто',
    type_tour: 'Тур',
    status_pending: 'Ожидает',
    status_confirmed: 'Подтверждено',
    status_cancelled: 'Отменено',
    status_completed: 'Завершено',
    status_rejected: 'Отклонено',
    cash: 'Наличные', card: 'Кредитная карта', credit_card: 'Кредитная карта', bank_transfer: 'Банковский перевод',
    day: 'дн.',
    from_fallback: 'Бронирование',
  },
};

function i(lc: string, key: string): string {
  return (EMAIL_I18N[lc] || EMAIL_I18N['en'])[key] || (EMAIL_I18N['en'][key] ?? key);
}

// ─── Date formatter ───────────────────────────────────────────────────────────
function formatDate(date: Date | string | undefined | null, lc = 'en'): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  const localeMap: Record<string, string> = {
    tr: 'tr-TR', en: 'en-US', de: 'de-DE', fr: 'fr-FR', ru: 'ru-RU',
  };
  return d.toLocaleDateString(localeMap[lc] || 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtMoney(amount: number | string | undefined | null, currency: string): string {
  if (amount == null || amount === '') return '-';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '-';
  return `${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

// ─── Status colors ────────────────────────────────────────────────────────────
function statusStyle(status: string): { bg: string; color: string } {
  const map: Record<string, { bg: string; color: string }> = {
    pending:   { bg: '#fffbeb', color: '#d97706' },
    confirmed: { bg: '#ecfdf5', color: '#059669' },
    completed: { bg: '#eff6ff', color: '#2563eb' },
    cancelled: { bg: '#fef2f2', color: '#dc2626' },
    rejected:  { bg: '#f9fafb', color: '#6b7280' },
  };
  return map[status] || map['pending'];
}

// ─── Detail row helper ────────────────────────────────────────────────────────
function dRow(label: string, value: string, bold = false): string {
  return `
    <tr>
      <td style="padding:9px 16px;color:#6b7280;font-size:13px;width:42%;border-bottom:1px solid #f1f5f9;vertical-align:top;">${label}</td>
      <td style="padding:9px 16px;color:${bold ? '#1e3a5f' : '#111827'};font-size:13px;font-weight:${bold ? '700' : '500'};border-bottom:1px solid #f1f5f9;vertical-align:top;">${value}</td>
    </tr>`;
}

// ─── Localized default email body builder ─────────────────────────────────────
function buildDefaultEmailBody(
  reservation: Reservation,
  templateType: EmailTemplateType,
  lc: string,
): string {
  const meta = (reservation.metadata || {}) as Record<string, any>;
  const ref = reservation.reference || reservation.id.substring(0, 8).toUpperCase();
  const isRentacar = reservation.type === 'rentacar';
  const currencyCode = (meta.currencyCode as string) || 'EUR';
  const extrasAmt = parseFloat(String(meta.extrasPrice || 0));

  // Title & message per template type
  let title = i(lc, 'title_confirmation');
  let message = i(lc, 'msg_pending');
  if (templateType === EmailTemplateType.RESERVATION_CONFIRMED) {
    title = i(lc, 'title_confirmed');
    message = i(lc, 'msg_confirmed');
  } else if (templateType === EmailTemplateType.RESERVATION_REJECTED) {
    title = i(lc, 'title_rejected');
    message = i(lc, 'msg_rejected');
  } else if (templateType === EmailTemplateType.RESERVATION_CANCELLED) {
    title = i(lc, 'title_cancelled');
    message = i(lc, 'msg_cancelled');
  } else if (templateType === EmailTemplateType.RESERVATION_COMPLETED) {
    title = i(lc, 'title_completed');
    message = i(lc, 'msg_completed');
  } else if (reservation.status === ReservationStatus.CONFIRMED) {
    title = i(lc, 'title_confirmed');
    message = i(lc, 'msg_confirmed');
  }

  const { bg: statusBg, color: statusColor } = statusStyle(reservation.status);
  const statusLabel = i(lc, `status_${reservation.status}`) || reservation.status;
  const typeLabel = isRentacar ? i(lc, 'type_rentacar') : i(lc, 'type_tour');
  const paymentKey = (meta.paymentMethod as string) || '';
  const paymentLabel = i(lc, paymentKey) || paymentKey || '-';

  // Reservation detail rows
  let detailRows = `
    ${dRow(i(lc, 'ref_label'), `<strong>#${ref}</strong>`, true)}
    ${dRow(i(lc, 'type_label'), typeLabel)}
    ${dRow(i(lc, 'status_label'), `<span style="background:${statusBg};color:${statusColor};padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;">${statusLabel}</span>`)}
  `;

  if (isRentacar) {
    const rentalDays = meta.rentalDays != null ? `${meta.rentalDays} ${i(lc, 'day')}` : '-';
    detailRows += `
      ${dRow(i(lc, 'vehicle_label'), String(meta.vehicleName || '-'))}
      ${dRow(i(lc, 'pickup_label'), String(meta.pickupLocationName || '-'))}
      ${dRow(i(lc, 'checkin_label'), formatDate(reservation.checkIn, lc))}
      ${dRow(i(lc, 'dropoff_label'), String(meta.dropoffLocationName || '-'))}
      ${dRow(i(lc, 'checkout_label'), formatDate(reservation.checkOut, lc))}
      ${dRow(i(lc, 'days_label'), rentalDays)}
    `;
  } else {
    detailRows += `
      ${meta.tourName ? dRow(i(lc, 'tour_label'), String(meta.tourName)) : ''}
      ${dRow(i(lc, 'tour_date_label'), formatDate(reservation.checkIn, lc))}
      ${meta.passengerCount ? dRow(i(lc, 'passengers_label'), String(meta.passengerCount)) : ''}
    `;
  }

  // Price rows (rentacar only)
  let priceSection = '';
  if (isRentacar && (meta.totalPrice || meta.vehiclePrice)) {
    priceSection = `
      <div style="margin:0 0 20px;">
        <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
          <div style="background:#1e3a5f;padding:10px 16px;">
            <span style="color:rgba(255,255,255,.7);font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">${i(lc, 'section_price')}</span>
          </div>
          <table style="width:100%;border-collapse:collapse;">
            ${dRow(i(lc, 'vehicle_price_label'), fmtMoney(meta.vehiclePrice, currencyCode))}
            ${extrasAmt > 0 ? dRow(i(lc, 'extras_label'), fmtMoney(meta.extrasPrice, currencyCode)) : ''}
            ${dRow(i(lc, 'total_label'), fmtMoney(meta.totalPrice, currencyCode), true)}
            ${paymentKey ? dRow(i(lc, 'payment_label'), paymentLabel) : ''}
          </table>
        </div>
      </div>
    `;
  }

  // Voucher note sadece onay mailinde göster (admin onayladığında müşteriye giden mail)
  const showVoucherNote = templateType === EmailTemplateType.RESERVATION_CONFIRMED;
  const voucherNoteHtml = showVoucherNote ? `
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
      <p style="margin:0;color:#1d4ed8;font-size:13px;line-height:1.6;">📎 ${i(lc, 'voucher_note')}</p>
    </div>
  ` : '';

  return `
    <!-- Status banner -->
    <div style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);border-radius:8px;padding:20px 24px;margin-bottom:28px;text-align:center;">
      <div style="color:#fff;font-size:20px;font-weight:800;margin-bottom:6px;">${title}</div>
      <div style="color:rgba(255,255,255,.8);font-size:13px;line-height:1.6;">${message}</div>
    </div>

    <!-- Greeting -->
    <p style="font-size:16px;color:#374151;margin:0 0 24px;">
      ${i(lc, 'greeting')} <strong>{{customerName}}</strong>,
    </p>

    <!-- Reservation details card -->
    <div style="margin:0 0 20px;">
      <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <div style="background:#1e3a5f;padding:10px 16px;">
          <span style="color:rgba(255,255,255,.7);font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">${i(lc, 'section_reservation')}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          ${detailRows}
        </table>
      </div>
    </div>

    ${priceSection}

    <!-- Voucher note -->
    ${voucherNoteHtml}

    <!-- Approval / cancellation buttons (injected via variables) -->
    {{approvalButton}}
    {{cancellationButton}}

    <!-- Signature -->
    <p style="font-size:14px;color:#6b7280;margin:24px 0 0;line-height:1.6;">
      ${i(lc, 'regards')},<br/>
      <strong style="color:#1e3a5f;">{{companyName}}</strong>
    </p>
  `;
}

// ─── Default subject builder ──────────────────────────────────────────────────
function buildDefaultSubject(
  reservation: Reservation,
  templateType: EmailTemplateType,
  lc: string,
): string {
  const ref = reservation.reference || reservation.id.substring(0, 8).toUpperCase();
  let titleKey = 'title_confirmation';
  if (templateType === EmailTemplateType.RESERVATION_CONFIRMED) titleKey = 'title_confirmed';
  else if (templateType === EmailTemplateType.RESERVATION_REJECTED) titleKey = 'title_rejected';
  else if (templateType === EmailTemplateType.RESERVATION_CANCELLED) titleKey = 'title_cancelled';
  else if (templateType === EmailTemplateType.RESERVATION_COMPLETED) titleKey = 'title_completed';
  else if (reservation.status === ReservationStatus.CONFIRMED) titleKey = 'title_confirmed';
  return `${i(lc, titleKey)} · #${ref}`;
}

// ─── Queue helpers ────────────────────────────────────────────────────────────
export const queueReservationEmail = async (
  reservation: Reservation,
  templateType: EmailTemplateType,
  priority: 'normal' | 'high' = 'normal'
): Promise<void> => {
  if (!reservation.customerEmail) {
    console.log(`Reservation ${reservation.id} has no customer email, skipping.`);
    return;
  }

  try {
    let jobType: EmailJob['type'];
    switch (templateType) {
      case EmailTemplateType.RESERVATION_CONFIRMATION: jobType = 'reservation_confirmation'; break;
      case EmailTemplateType.RESERVATION_CONFIRMED:    jobType = 'reservation_confirmation'; break;
      case EmailTemplateType.RESERVATION_REJECTED:     jobType = 'reservation_cancelled';    break;
      case EmailTemplateType.RESERVATION_CANCELLED:    jobType = 'reservation_cancelled';    break;
      case EmailTemplateType.RESERVATION_COMPLETED:    jobType = 'reservation_completed';    break;
      default:                                         jobType = 'reservation_confirmation';
    }

    await QueueService.publishEmailJob({
      type: jobType,
      tenantId: reservation.tenantId,
      data: {
        reservationId: reservation.id,
        email: reservation.customerEmail,
        languageId: reservation.customerLanguageId || undefined,
      },
      priority,
    });
    console.log(`✅ Email queued: ${jobType} → ${reservation.customerEmail}`);
  } catch (error) {
    console.error('Failed to queue reservation email, falling back to direct send:', error);
    await sendReservationEmailDirect(reservation, templateType);
  }
};

// ─── Main public API ──────────────────────────────────────────────────────────
export const sendReservationEmail = async (
  reservation: Reservation,
  templateType: EmailTemplateType
): Promise<void> => {
  const useQueue = process.env.USE_EMAIL_QUEUE !== 'false';
  if (useQueue) return queueReservationEmail(reservation, templateType);
  return sendReservationEmailDirect(reservation, templateType);
};

// ─── Direct send (also used by queue worker) ──────────────────────────────────
export const sendReservationEmailDirect = async (
  reservation: Reservation,
  templateType: EmailTemplateType
): Promise<void> => {
  if (!reservation.tenantId) {
    console.error(`Reservation ${reservation.id} has no tenantId, cannot send email.`);
    return;
  }

  // ── 1. SMTP settings ──────────────────────────────────────────────────────
  const mailSettings = await TenantSettingsService.getMailSettings(reservation.tenantId);
  if (!mailSettings?.smtpHost || !mailSettings.fromEmail) {
    console.warn(`Mail settings not configured for tenant ${reservation.tenantId}.`);
    return;
  }

  // ── 2. Dil: yalnızca rezervasyon customerLanguageId (languageId) ────────────
  const langCode = await VoucherService.getLanguageCode(reservation.customerLanguageId);
  const siteSettings = await TenantSettingsService.getSiteSettings(reservation.tenantId);

  // ── 3. Yalnızca rezervasyon dilindeki şablon (başka dildeki şablon kullanılmaz) ─
  let template = await EmailTemplateService.getByTypeStrictLanguage(
    reservation.tenantId,
    templateType,
    reservation.customerLanguageId || undefined,
  );

  if (!template) {
    console.warn(`No DB template for ${templateType}/${langCode} (languageId=${reservation.customerLanguageId || 'none'}), using built-in i18n body.`);
    template = {
      id: 'default',
      subject: buildDefaultSubject(reservation, templateType, langCode),
      body: buildDefaultEmailBody(reservation, templateType, langCode),
    } as any;
  }

  // ── 4. Build variable map (incl. localized labels & approval buttons) ─────
  const baseUrl = process.env.FRONTEND_URL || process.env.PUBLIC_URL || 'https://saastour360.com';
  const approvalUrl   = `${baseUrl}/public/reservation/${reservation.id}/approve?token=${encodeURIComponent(reservation.id)}`;
  const cancellationUrl = `${baseUrl}/public/reservation/${reservation.id}/cancel?token=${encodeURIComponent(reservation.id)}`;

  const meta = (reservation.metadata || {}) as Record<string, any>;
  const currencyCode = (meta.currencyCode as string) || 'EUR';

  const variables: Record<string, string | number> = {
    // Core reservation
    customerName:         reservation.customerName || '',
    customerEmail:        reservation.customerEmail || '',
    customerPhone:        reservation.customerPhone || '',
    reservationReference: reservation.reference || reservation.id.substring(0, 8).toUpperCase(),
    checkIn:              formatDate(reservation.checkIn, langCode),
    checkOut:             formatDate(reservation.checkOut, langCode),
    reservationType:      reservation.type === 'rentacar' ? i(langCode, 'type_rentacar') : i(langCode, 'type_tour'),
    reservationStatus:    i(langCode, `status_${reservation.status}`) || reservation.status,
    approvalUrl,
    cancellationUrl,
    companyName:          siteSettings?.siteName || '',
    // Localized labels (usable in DB templates via {{labelXxx}})
    labelRef:             i(langCode, 'ref_label'),
    labelStatus:          i(langCode, 'status_label'),
    labelVehicle:         i(langCode, 'vehicle_label'),
    labelPickup:          i(langCode, 'pickup_label'),
    labelDropoff:         i(langCode, 'dropoff_label'),
    labelCheckin:         i(langCode, 'checkin_label'),
    labelCheckout:        i(langCode, 'checkout_label'),
    labelDays:            i(langCode, 'days_label'),
    labelTotal:           i(langCode, 'total_label'),
    labelPayment:         i(langCode, 'payment_label'),
    voucherNote:          i(langCode, 'voucher_note'),
  };

  variables.approvalButton = '';
  variables.cancellationButton = '';

  if (templateType === EmailTemplateType.RESERVATION_CONFIRMED) {
    variables.approvalButton = `
      <div style="text-align:center;margin:28px 0;">
        <a href="${approvalUrl}"
           style="display:inline-block;padding:14px 32px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:.2px;">
          ✓ ${i(langCode, 'confirm_reservation_btn')}
        </a>
      </div>`;
  }

  // Rentacar-specific variables
  if (reservation.type === 'rentacar') {
    variables.vehicleName          = String(meta.vehicleName || '');
    variables.pickupLocationName   = String(meta.pickupLocationName || '');
    variables.dropoffLocationName  = String(meta.dropoffLocationName || '');
    variables.rentalDays           = Number(meta.rentalDays || 0);
    variables.vehiclePrice         = fmtMoney(meta.vehiclePrice, currencyCode);
    variables.extrasPrice          = fmtMoney(meta.extrasPrice, currencyCode);
    variables.totalPrice           = fmtMoney(meta.totalPrice, currencyCode);
    variables.currencyCode         = currencyCode;
    variables.paymentMethod        = i(langCode, (meta.paymentMethod as string) || '') || String(meta.paymentMethod || '');
  }

  // ── 5. Replace template variables ─────────────────────────────────────────
  const subject      = EmailTemplateService.replaceVariables(template!.subject, variables);
  const templateBody = EmailTemplateService.replaceVariables(template!.body, variables);

  // ── 6. Generate voucher PDF attachment ───────────────────────────────────
  let voucherBuffer: Buffer | null = null;
  const voucherFilename = `voucher-${variables.reservationReference}.pdf`;
  try {
    voucherBuffer = await VoucherService.generateVoucherPdf(reservation, langCode, siteSettings);
  } catch (err) {
    console.warn('Voucher PDF üretilemedi, ek olmadan gönderilecek:', (err as Error).message);
  }

  // ── 7. Wrap body in professional email layout ─────────────────────────────
  const htmlBody = EmailLayoutService.wrapContent(templateBody, siteSettings, langCode);

  // ── 8. Send mail ──────────────────────────────────────────────────────────
  const smtpPort = mailSettings.smtpPort || 587;
  // Port 465 = doğrudan SSL; 587 / 25 = STARTTLS (secure: false + requireTLS: true)
  // DB'deki smtp_secure değeri defalarca yanlış kaydedilebilir; port'a göre güvenilir algılama yapalım.
  const useSecure = smtpPort === 465;

  const transporter = nodemailer.createTransport({
    host:       mailSettings.smtpHost,
    port:       smtpPort,
    secure:     useSecure,
    requireTLS: !useSecure && smtpPort === 587,
    auth: { user: mailSettings.smtpUser, pass: mailSettings.smtpPassword },
    tls:  { rejectUnauthorized: false },
  });

  // ── 8b. Resolve CC addresses from tenant settings ─────────────────────────
  const ccList: string[] = Array.isArray(mailSettings.ccEmails)
    ? mailSettings.ccEmails.filter((e) => e && e.includes('@'))
    : [];

  try {
    await transporter.sendMail({
      from:    `"${mailSettings.fromName || siteSettings?.siteName || i(langCode, 'from_fallback')}" <${mailSettings.fromEmail}>`,
      to:      reservation.customerEmail!,
      ...(ccList.length > 0 ? { cc: ccList.join(', ') } : {}),
      subject,
      html:    htmlBody,
      attachments: voucherBuffer
        ? [{ filename: voucherFilename, content: voucherBuffer, contentType: 'application/pdf' }]
        : [],
    });
    const ccInfo = ccList.length > 0 ? ` | CC: ${ccList.join(', ')}` : '';
    console.log(`✅ Email (${templateType}, lang=${langCode}) sent to ${reservation.customerEmail}${voucherBuffer ? ` [+PDF: ${voucherFilename}]` : ' [no attachment]'}${ccInfo}`);
  } catch (error) {
    console.error(`❌ Failed to send email (${templateType}) for ${reservation.id}:`, (error as Error).message);
    throw error;
  }
};

// ─── Convenience wrappers ─────────────────────────────────────────────────────
export const sendReservationConfirmationEmail = async (reservation: Reservation): Promise<void> => {
  if (reservation.status !== ReservationStatus.CONFIRMED) return;
  await sendReservationEmail(reservation, EmailTemplateType.RESERVATION_CONFIRMATION);
};

export const sendReservationCancelledEmail = async (reservation: Reservation): Promise<void> => {
  if (reservation.status !== ReservationStatus.CANCELLED) return;
  await sendReservationEmail(reservation, EmailTemplateType.RESERVATION_CANCELLED);
};

export const sendReservationCompletedEmail = async (reservation: Reservation): Promise<void> => {
  if (reservation.status !== ReservationStatus.COMPLETED) return;
  await sendReservationEmail(reservation, EmailTemplateType.RESERVATION_COMPLETED);
};
