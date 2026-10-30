import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { AppDataSource } from '../config/data-source';
import { Reservation } from '../modules/shared/entities/reservation.entity';
import { Language } from '../modules/shared/entities/language.entity';
import { TenantSettings } from '../modules/shared/entities/tenant-settings.entity';

// ─── URL helpers ──────────────────────────────────────────────────────────────
export function absoluteLogoUrl(raw: string | undefined | null, base: string): string {
  if (!raw) return '';
  const clean = raw.split('\t')[0].trim();
  if (!clean) return '';
  if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
  const b = base.replace(/\/$/, '');
  return `${b}${clean.startsWith('/') ? clean : '/' + clean}`;
}

let warnedMissingVoucherFonts = false;

/** PDFKit varsayılan Helvetica Türkçe desteklemez; Noto Sans TTF gömülür. */
function resolveVoucherFontDirs(): string[] {
  return [
    path.join(__dirname, '../assets/fonts'),
    path.join(__dirname, '../../assets/fonts'),
    path.join(process.cwd(), 'dist', 'assets', 'fonts'),
    path.join(process.cwd(), 'src', 'assets', 'fonts'),
  ];
}

function tryReadVoucherFonts(): { regular: Buffer; bold: Buffer } | null {
  for (const dir of resolveVoucherFontDirs()) {
    const regular = path.join(dir, 'NotoSans-Regular.ttf');
    const bold = path.join(dir, 'NotoSans-Bold.ttf');
    if (!fs.existsSync(regular) || !fs.existsSync(bold)) continue;
    try {
      return { regular: fs.readFileSync(regular), bold: fs.readFileSync(bold) };
    } catch {
      /* devam */
    }
  }
  if (process.env.NODE_ENV === 'production' && !warnedMissingVoucherFonts) {
    warnedMissingVoucherFonts = true;
    console.warn(
      'voucher PDF: Noto Sans bulunamadı (ör. dist/assets/fonts). Docker build’de src/assets/fonts kopyalandı mı? Türkçe bozulabilir.',
    );
  }
  return null;
}

function fetchBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.setTimeout(6000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

/** PDF/email viewer uyumluluğu: sadece JPEG veya PNG kabul et (siyah kutu sorununu azaltır). */
function isEmbeddableImage(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 12) return false;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return true;
  return false;
}

// ─── i18n ─────────────────────────────────────────────────────────────────────
type Dict = Record<string, string>;
const T: Record<string, Dict> = {
  tr: {
    voucher_title: 'REZERVASYON VOUCHER',
    ref_no: 'Rezervasyon No',
    status: 'Durum',
    customer_section: 'MÜŞTERİ BİLGİLERİ',
    full_name: 'Ad Soyad',
    email: 'E-posta',
    phone: 'Telefon',
    nationality: 'Uyruk',
    id_number: 'Kimlik No',
    license_no: 'Ehliyet No',
    reservation_section: 'REZERVASYON DETAYLARI',
    vehicle: 'Araç',
    fuel_type: 'Yakıt',
    transmission: 'Vites',
    pickup_location: 'Alış Noktası',
    dropoff_location: 'Teslim Noktası',
    pickup_date: 'Alış Tarihi ve Saati',
    dropoff_date: 'Teslim Tarihi ve Saati',
    rental_days: 'Kiralama Süresi',
    day: 'gün',
    price_section: 'FİYAT DETAYI',
    vehicle_price: 'Araç Ücreti',
    extras_price: 'Ek Hizmetler',
    delivery_fee: 'Teslimat Ücreti',
    drop_fee: 'Bırakma Ücreti',
    discount: 'İndirim',
    total: 'TOPLAM TUTAR',
    payment: 'Ödeme Yöntemi',
    extras_section: 'EK HİZMETLER',
    note_title: 'ÖNEMLİ NOTLAR',
    note_text: 'Bu voucher\'ı araç tesliminde geçerli kimliğinizle birlikte gösteriniz. Rezervasyon saatinden 30 dakika önce hazır olunuz.',
    generated: 'Oluşturulma Tarihi',
    issued_for: 'Düzenleme',
    tour_section: 'TUR DETAYLARI',
    tour_name: 'Tur Adı',
    tour_date: 'Tur Tarihi',
    passengers: 'Katılımcı Sayısı',
    pending:   'Beklemede',
    confirmed: 'Onaylandı',
    cancelled: 'İptal Edildi',
    completed: 'Tamamlandı',
    rejected:  'Reddedildi',
    cash: 'Nakit', card: 'Kredi Kartı', credit_card: 'Kredi Kartı',
    bank_transfer: 'Banka Havalesi', online: 'Online Ödeme', other: 'Diğer',
    manual: 'Diğer',
    gasoline: 'Benzin', diesel: 'Dizel', electric: 'Elektrik', hybrid: 'Hibrit',
    automatic: 'Otomatik', manual_trans: 'Manuel',
    page: 'Sayfa',
  },
  en: {
    voucher_title: 'RESERVATION VOUCHER',
    ref_no: 'Reservation No',
    status: 'Status',
    customer_section: 'CUSTOMER INFORMATION',
    full_name: 'Full Name',
    email: 'Email Address',
    phone: 'Phone Number',
    nationality: 'Nationality',
    id_number: 'ID / Passport No',
    license_no: 'Driver License No',
    reservation_section: 'RESERVATION DETAILS',
    vehicle: 'Vehicle',
    fuel_type: 'Fuel Type',
    transmission: 'Transmission',
    pickup_location: 'Pickup Location',
    dropoff_location: 'Return Location',
    pickup_date: 'Pickup Date & Time',
    dropoff_date: 'Return Date & Time',
    rental_days: 'Rental Duration',
    day: 'day(s)',
    price_section: 'PRICE BREAKDOWN',
    vehicle_price: 'Vehicle Rate',
    extras_price: 'Extra Services',
    delivery_fee: 'Delivery Fee',
    drop_fee: 'Drop-off Fee',
    discount: 'Discount',
    total: 'TOTAL AMOUNT',
    payment: 'Payment Method',
    extras_section: 'EXTRA SERVICES',
    note_title: 'IMPORTANT NOTES',
    note_text: 'Please present this voucher along with your valid ID at the time of vehicle pickup. Please be ready 30 minutes before your reservation time.',
    generated: 'Issue Date',
    issued_for: 'Issued for',
    tour_section: 'TOUR DETAILS',
    tour_name: 'Tour Name',
    tour_date: 'Tour Date',
    passengers: 'Number of Passengers',
    pending:   'Pending',
    confirmed: 'Confirmed',
    cancelled: 'Cancelled',
    completed: 'Completed',
    rejected:  'Rejected',
    cash: 'Cash', card: 'Credit Card', credit_card: 'Credit Card',
    bank_transfer: 'Bank Transfer', online: 'Online Payment', other: 'Other',
    manual: 'Other',
    gasoline: 'Gasoline', diesel: 'Diesel', electric: 'Electric', hybrid: 'Hybrid',
    automatic: 'Automatic', manual_trans: 'Manual',
    page: 'Page',
  },
  de: {
    voucher_title: 'BUCHUNGSBESTÄTIGUNG',
    ref_no: 'Buchungsnummer',
    status: 'Status',
    customer_section: 'KUNDENDATEN',
    full_name: 'Name',
    email: 'E-Mail',
    phone: 'Telefon',
    nationality: 'Nationalität',
    id_number: 'Ausweis-Nr.',
    license_no: 'Führerschein-Nr.',
    reservation_section: 'BUCHUNGSDETAILS',
    vehicle: 'Fahrzeug',
    fuel_type: 'Kraftstoff',
    transmission: 'Getriebe',
    pickup_location: 'Abholort',
    dropoff_location: 'Rückgabeort',
    pickup_date: 'Abholdatum & -uhrzeit',
    dropoff_date: 'Rückgabedatum & -uhrzeit',
    rental_days: 'Mietdauer',
    day: 'Tag(e)',
    price_section: 'PREISÜBERSICHT',
    vehicle_price: 'Fahrzeugpreis',
    extras_price: 'Zusatzleistungen',
    delivery_fee: 'Liefergebühr',
    drop_fee: 'Rückgabegebühr',
    discount: 'Rabatt',
    total: 'GESAMTBETRAG',
    payment: 'Zahlungsart',
    extras_section: 'ZUSATZLEISTUNGEN',
    note_title: 'WICHTIGE HINWEISE',
    note_text: 'Bitte legen Sie diesen Voucher mit Ihrem gültigen Ausweis bei der Fahrzeugübernahme vor. Erscheinen Sie bitte 30 Minuten vor der Reservierungszeit.',
    generated: 'Erstellungsdatum',
    issued_for: 'Ausgestellt für',
    tour_section: 'TOURDETAILS',
    tour_name: 'Tourname',
    tour_date: 'Tourdatum',
    passengers: 'Passagieranzahl',
    pending:   'Ausstehend',
    confirmed: 'Bestätigt',
    cancelled: 'Storniert',
    completed: 'Abgeschlossen',
    rejected:  'Abgelehnt',
    cash: 'Bar', card: 'Kreditkarte', credit_card: 'Kreditkarte',
    bank_transfer: 'Banküberweisung', online: 'Online-Zahlung', other: 'Sonstiges',
    manual: 'Sonstiges',
    gasoline: 'Benzin', diesel: 'Diesel', electric: 'Elektro', hybrid: 'Hybrid',
    automatic: 'Automatik', manual_trans: 'Schaltgetriebe',
    page: 'Seite',
  },
  fr: {
    voucher_title: 'BON DE RÉSERVATION',
    ref_no: 'N° de réservation',
    status: 'Statut',
    customer_section: 'INFORMATIONS CLIENT',
    full_name: 'Nom complet',
    email: 'Adresse e-mail',
    phone: 'Numéro de téléphone',
    nationality: 'Nationalité',
    id_number: 'N° de pièce d\'identité',
    license_no: 'N° de permis de conduire',
    reservation_section: 'DÉTAILS DE LA RÉSERVATION',
    vehicle: 'Véhicule',
    fuel_type: 'Carburant',
    transmission: 'Transmission',
    pickup_location: 'Lieu de prise en charge',
    dropoff_location: 'Lieu de restitution',
    pickup_date: 'Date et heure de prise en charge',
    dropoff_date: 'Date et heure de restitution',
    rental_days: 'Durée de location',
    day: 'jour(s)',
    price_section: 'DÉTAIL DES PRIX',
    vehicle_price: 'Tarif véhicule',
    extras_price: 'Services supplémentaires',
    delivery_fee: 'Frais de livraison',
    drop_fee: 'Frais de restitution',
    discount: 'Réduction',
    total: 'MONTANT TOTAL',
    payment: 'Mode de paiement',
    extras_section: 'SERVICES SUPPLÉMENTAIRES',
    note_title: 'NOTES IMPORTANTES',
    note_text: 'Veuillez présenter ce bon avec votre pièce d\'identité valide lors de la prise en charge. Soyez prêt 30 minutes avant votre heure de réservation.',
    generated: 'Date d\'émission',
    issued_for: 'Émis pour',
    tour_section: 'DÉTAILS DU CIRCUIT',
    tour_name: 'Nom du circuit',
    tour_date: 'Date du circuit',
    passengers: 'Nombre de passagers',
    pending:   'En attente',
    confirmed: 'Confirmée',
    cancelled: 'Annulée',
    completed: 'Terminée',
    rejected:  'Refusée',
    cash: 'Espèces', card: 'Carte bancaire', credit_card: 'Carte bancaire',
    bank_transfer: 'Virement', online: 'Paiement en ligne', other: 'Autre',
    manual: 'Autre',
    gasoline: 'Essence', diesel: 'Diesel', electric: 'Électrique', hybrid: 'Hybride',
    automatic: 'Automatique', manual_trans: 'Manuelle',
    page: 'Page',
  },
  ru: {
    voucher_title: 'ВАУЧЕР БРОНИРОВАНИЯ',
    ref_no: 'Номер бронирования',
    status: 'Статус',
    customer_section: 'ДАННЫЕ КЛИЕНТА',
    full_name: 'ФИО',
    email: 'Адрес электронной почты',
    phone: 'Номер телефона',
    nationality: 'Национальность',
    id_number: 'Номер документа',
    license_no: 'Номер водительского удостоверения',
    reservation_section: 'ДЕТАЛИ БРОНИРОВАНИЯ',
    vehicle: 'Автомобиль',
    fuel_type: 'Тип топлива',
    transmission: 'Коробка передач',
    pickup_location: 'Место получения',
    dropoff_location: 'Место возврата',
    pickup_date: 'Дата и время получения',
    dropoff_date: 'Дата и время возврата',
    rental_days: 'Срок аренды',
    day: 'дн.',
    price_section: 'СТОИМОСТЬ',
    vehicle_price: 'Стоимость авто',
    extras_price: 'Дополнительные услуги',
    delivery_fee: 'Плата за доставку',
    drop_fee: 'Плата за возврат',
    discount: 'Скидка',
    total: 'ИТОГО',
    payment: 'Способ оплаты',
    extras_section: 'ДОПОЛНИТЕЛЬНЫЕ УСЛУГИ',
    note_title: 'ВАЖНЫЕ ПРИМЕЧАНИЯ',
    note_text: 'Предъявите этот ваучер вместе с действительным документом, удостоверяющим личность, при получении автомобиля. Пожалуйста, будьте готовы за 30 минут до времени бронирования.',
    generated: 'Дата выдачи',
    issued_for: 'Выдан для',
    tour_section: 'ДЕТАЛИ ТУРА',
    tour_name: 'Название тура',
    tour_date: 'Дата тура',
    passengers: 'Количество пассажиров',
    pending:   'Ожидает',
    confirmed: 'Подтверждено',
    cancelled: 'Отменено',
    completed: 'Завершено',
    rejected:  'Отклонено',
    cash: 'Наличные', card: 'Кредитная карта', credit_card: 'Кредитная карта',
    bank_transfer: 'Банковский перевод', online: 'Онлайн-оплата', other: 'Другое',
    manual: 'Другое',
    gasoline: 'Бензин', diesel: 'Дизель', electric: 'Электро', hybrid: 'Гибрид',
    automatic: 'Автомат', manual_trans: 'Механика',
    page: 'Стр.',
  },
};

function t(lc: string, key: string): string {
  return (T[lc] || T['en'])[key] || (T['en'][key] ?? key);
}

function fmtDate(date: Date | string | undefined | null, lc: string): string {
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

// ─── Color palette ────────────────────────────────────────────────────────────
type RGB = [number, number, number];

const C = {
  brand:      [30, 58, 95]   as RGB,   // #1e3a5f
  accent:     [37, 99, 235]  as RGB,   // #2563eb
  accentL:    [219, 234, 254] as RGB,  // #dbeafe
  green:      [5, 150, 105]  as RGB,   // confirmed
  greenL:     [209, 250, 229] as RGB,
  amber:      [217, 119, 6]  as RGB,   // pending
  amberL:     [254, 243, 199] as RGB,
  red:        [220, 38, 38]  as RGB,   // cancelled/rejected
  redL:       [254, 226, 226] as RGB,
  blue:       [37, 99, 235]  as RGB,   // completed
  blueL:      [219, 234, 254] as RGB,
  grey:       [107, 114, 128] as RGB,
  greyL:      [243, 244, 246] as RGB,
  white:      [255, 255, 255] as RGB,
  text:       [17, 24, 39]   as RGB,
  textLight:  [75, 85, 99]   as RGB,
  border:     [226, 232, 240] as RGB,
  bg:         [248, 250, 252] as RGB,
  yellowBg:   [255, 251, 235] as RGB,
  yellowBd:   [253, 230, 138] as RGB,
  yellowTxt:  [120, 53, 15]  as RGB,
};

/**
 * PDFKit `fillColor` / `strokeColor` için 3 elemanlı dizi: **0–255** RGB beklenir;
 * kütüphane içeride `/255` uygular. Eskiden burada /255 yapılıyordu → çift bölünme,
 * tüm renkler ~0’a iniyor ve sayfa tam siyah görünüyordu.
 */
function r(c: RGB): [number, number, number] {
  return [c[0], c[1], c[2]];
}

function statusPalette(status: string): { bg: RGB; text: RGB; dot: RGB } {
  const map: Record<string, { bg: RGB; text: RGB; dot: RGB }> = {
    confirmed: { bg: C.greenL,  text: [6, 95, 70]    as RGB, dot: C.green  },
    pending:   { bg: C.amberL,  text: [146, 64, 14]  as RGB, dot: C.amber  },
    cancelled: { bg: C.redL,    text: [153, 27, 27]  as RGB, dot: C.red    },
    rejected:  { bg: C.greyL,   text: [55, 65, 81]   as RGB, dot: C.grey   },
    completed: { bg: C.blueL,   text: [29, 78, 216]  as RGB, dot: C.blue   },
  };
  return map[status] || map['pending'];
}

// ─── Main Service ─────────────────────────────────────────────────────────────
export class VoucherService {
  static async getLanguageCode(languageId?: string | null): Promise<string> {
    if (!languageId) return 'en';
    try {
      const lang = await AppDataSource.getRepository(Language).findOne({ where: { id: languageId } });
      return lang?.code?.toLowerCase().split('-')[0] || 'en';
    } catch {
      return 'en';
    }
  }

  static async generateVoucherPdf(
    reservation: Reservation,
    langCode: string,
    siteSettings: TenantSettings | null,
  ): Promise<Buffer> {
    const lc = langCode.toLowerCase().split('-')[0];
    const meta = (reservation.metadata || {}) as Record<string, any>;
    const ref  = reservation.reference || reservation.id.substring(0, 8).toUpperCase();
    const isRentacar = reservation.type === 'rentacar';

    const currencyCode: string = (meta.currencyCode as string) || 'EUR';
    const paymentKey: string   = (meta.paymentMethod  as string) || '';
    const paymentLabel         = t(lc, paymentKey) || paymentKey || '-';

    const baseUrl       = process.env.FRONTEND_URL || process.env.PUBLIC_URL || 'https://saastour360.com';
    const logoAbsUrl    = absoluteLogoUrl(siteSettings?.logoUrl, baseUrl);
    const companyName   = (siteSettings as any)?.companyName || siteSettings?.siteName || 'Company';
    const companyPhone  = (siteSettings as any)?.companyPhone  || '';
    const companyEmail  = (siteSettings as any)?.companyEmail  || siteSettings?.fromEmail || '';
    const companyAddr   = (siteSettings as any)?.companyAddress || '';
    const companyWeb    = (siteSettings as any)?.companyWebsite || '';
    const companyTax    = (siteSettings as any)?.companyTaxNumber || '';

    // Personal info from metadata
    const personal       = meta.personalInfo     as Record<string, string> | undefined;
    const driverLicense  = meta.driverLicenseInfo as Record<string, string> | undefined;

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0,
        info: {
          Title:   `${t(lc, 'voucher_title')} #${ref}`,
          Author:  companyName,
          Subject: `Reservation ${ref}`,
          Creator: 'SaaS Tour',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const voucherFonts = tryReadVoucherFonts();
      if (voucherFonts) {
        doc.registerFont('Voucher', voucherFonts.regular);
        doc.registerFont('Voucher-Bold', voucherFonts.bold);
      }
      const fontBody = voucherFonts ? 'Voucher' : 'Helvetica';
      const fontBold = voucherFonts ? 'Voucher-Bold' : 'Helvetica-Bold';

      const W  = doc.page.width;   // 595.28
      const H  = doc.page.height;  // 841.89
      const ML = 40;               // margin left/right
      const CW = W - ML * 2;      // content width = 515

      // ─── helpers ──────────────────────────────────────────────────────────
      let curY = 0;

      const moveY = (delta: number) => { curY += delta; };

      const hRule = (x: number, w: number, col: RGB = C.border, lw = 0.5) => {
        doc.moveTo(x, curY).lineTo(x + w, curY)
          .strokeColor(r(col)).lineWidth(lw).stroke();
      };

      // Two-column key-value row
      const KV = (label: string, value: string, opts?: { bold?: boolean; color?: RGB }) => {
        const valColor = opts?.color || C.text;
        doc.fillColor(r(C.grey)).fontSize(9).font(fontBody)
          .text(label, ML, curY, { width: 185, lineBreak: false });
        doc.fillColor(r(valColor)).fontSize(9)
          .font(opts?.bold ? fontBold : fontBody)
          .text(value || '—', ML + 190, curY, { width: CW - 190 });
        moveY(15);
        hRule(ML, CW);
        moveY(5);
      };

      // Section header bar
      const sectionBar = (title: string) => {
        moveY(6);
        doc.rect(ML, curY, CW, 20).fillColor(r(C.brand)).fill();
        doc.fillColor(r(C.white)).fontSize(8).font(fontBold)
          .text(title, ML + 10, curY + 6, { width: CW - 20, characterSpacing: 1 });
        moveY(28);
      };

      // Rounded rect helper
      const roundRect = (x: number, y: number, w: number, h: number, radius: number, fillC: RGB, strokeC?: RGB, lw = 1) => {
        doc.roundedRect(x, y, w, h, radius);
        if (strokeC) {
          doc.fillColor(r(fillC)).fill()
            .roundedRect(x, y, w, h, radius)
            .strokeColor(r(strokeC)).lineWidth(lw).stroke();
        } else {
          doc.fillColor(r(fillC)).fill();
        }
      };

      const drawDocument = (logoBuffer?: Buffer) => {
        // Önce tam sayfa beyaz — bazı görüntüleyicilerde (özellikle mobil / e-posta) boş sayfa siyah görünüyordu
        doc.rect(0, 0, W, H).fillColor(r(C.white)).fill();

        // ═══════════════════════════════════════════════════════════════════
        // HEADER (130px tall)
        // ═══════════════════════════════════════════════════════════════════
        const HEADER_H = 130;

        // Solid header (opacity/stripe kaldırıldı — bazı e-posta PDF önizleyicilerinde siyah kutu sorununa yol açıyordu)
        doc.rect(0, 0, W, HEADER_H).fillColor(r(C.brand)).fill();

        // ── Logo zone (left) ──────────────────────────────────────────────
        const LOGO_ZONE_W = 220;
        let logoBottomY   = HEADER_H;

        if (logoBuffer && isEmbeddableImage(logoBuffer)) {
          try {
            doc.image(logoBuffer, ML, 20, { fit: [LOGO_ZONE_W - 10, 70] });
            const imgH = 70; // approximate
            logoBottomY = 20 + imgH;
          } catch { /* fallback: logo olmadan devam et */ }
        }

        // Company name below logo (or as logo if no image)
        const companyFontSize = companyName.length > 20 ? 11 : 14;
        if (!logoBuffer) {
          doc.fillColor(r(C.white)).fontSize(companyFontSize + 4).font(fontBold)
            .text(companyName, ML, 28, { width: LOGO_ZONE_W });
          logoBottomY = 28 + 26;
        }
        doc.fillColor(r([191, 219, 254] as RGB)).fontSize(9).font(fontBody)
          .text(companyWeb || companyEmail || '', ML, logoBottomY + 4, { width: LOGO_ZONE_W });

        // ── Voucher badge (right) ─────────────────────────────────────────
        const BADGE_W = 190;
        const BADGE_X = W - ML - BADGE_W;
        const BADGE_Y = 18;
        const BADGE_H = 94;

        // Badge background (opacity yok — e-posta PDF önizleyicisi uyumluluğu)
        doc.roundedRect(BADGE_X, BADGE_Y, BADGE_W, BADGE_H, 8)
          .fillColor(r([255, 255, 255] as RGB)).fill();
        doc.roundedRect(BADGE_X, BADGE_Y, BADGE_W, BADGE_H, 8)
          .strokeColor(r([226, 232, 240] as RGB)).lineWidth(1).stroke();

        // Voucher title (badge beyaz arka plan üzerinde koyu metin)
        doc.fillColor(r(C.textLight)).fontSize(7.5).font(fontBold)
          .text(t(lc, 'voucher_title'), BADGE_X, BADGE_Y + 10, { width: BADGE_W, align: 'center', characterSpacing: 1.5 });

        // Ref number — tek satır. width + LineWrapper kullanılırsa PDFKit tirede kırıyor; lineBreak:false etkisiz.
        const refText = `#${ref}`;
        doc.font(fontBold);
        let refFs = 22;
        const refMaxW = BADGE_W - 16;
        while (refFs >= 9) {
          doc.fontSize(refFs);
          if (doc.widthOfString(refText) <= refMaxW) break;
          refFs -= 1;
        }
        const refW = doc.widthOfString(refText);
        const refX = BADGE_X + (BADGE_W - refW) / 2;
        doc.fillColor(r(C.brand)).fontSize(refFs).text(refText, refX, BADGE_Y + 24);

        // Divider inside badge
        doc.moveTo(BADGE_X + 14, BADGE_Y + 55).lineTo(BADGE_X + BADGE_W - 14, BADGE_Y + 55)
          .strokeColor(r(C.border)).lineWidth(0.5).stroke();

        // Issue date
        const now = new Date();
        const nowStr = now.toLocaleDateString(lc === 'tr' ? 'tr-TR' : lc === 'de' ? 'de-DE' : lc === 'fr' ? 'fr-FR' : lc === 'ru' ? 'ru-RU' : 'en-US', {
          year: 'numeric', month: 'short', day: 'numeric',
        });
        doc.fillColor(r(C.textLight)).fontSize(8).font(fontBody)
          .text(`${t(lc, 'generated')}: ${nowStr}`, BADGE_X, BADGE_Y + 62, { width: BADGE_W, align: 'center' });

        curY = HEADER_H;

        // ═══════════════════════════════════════════════════════════════════
        // STATUS BAR
        // ═══════════════════════════════════════════════════════════════════
        const STATUS_H = 32;
        const pal = statusPalette(reservation.status);

        doc.rect(0, curY, W, STATUS_H).fillColor(r(pal.bg)).fill();

        // Status dot
        const dotX = ML + 8;
        const dotY = curY + STATUS_H / 2;
        doc.circle(dotX, dotY, 5).fillColor(r(pal.dot)).fill();

        const statusLabel = t(lc, reservation.status).toUpperCase();
        doc.fillColor(r(pal.text)).fontSize(10).font(fontBold)
          .text(statusLabel, ML + 20, curY + 10, { lineBreak: false });

        // Company name on right of status bar
        doc.fillColor(r(pal.text)).fontSize(9).font(fontBody)
          .text(companyName, ML + 20 + 160, curY + 10, { width: CW - 200, align: 'right' });

        curY += STATUS_H;

        // Thin accent line
        doc.rect(0, curY, W, 3).fillColor(r(C.accent)).fill();
        curY += 3;

        // ═══════════════════════════════════════════════════════════════════
        // CONTENT AREA — Two columns
        // ═══════════════════════════════════════════════════════════════════
        curY += 14;

        const COL1_X = ML;
        const COL2_X = ML + Math.round(CW * 0.52) + 8;
        const COL1_W = Math.round(CW * 0.52);
        const COL2_W = CW - COL1_W - 8;

        const startY = curY;
        let col1Y = startY;
        let col2Y = startY;

        // ── COLUMN 1: Customer + Reservation ─────────────────────────────

        // Customer info card
        const drawCard = (x: number, y: number, w: number, title: string, rows: Array<[string, string]>): number => {
          const ROW_H = 22;
          const cardH = 28 + rows.length * ROW_H + 6;

          roundRect(x, y, w, cardH, 6, C.bg, C.border);

          // Tek roundedRect — rect+roundedRect birleşik path bazı PDF motorlarında tüm sayfayı siyah dolduruyordu
          doc.roundedRect(x, y, w, 26, 6).fillColor(r(C.brand)).fill();

          doc.fillColor(r(C.white)).fontSize(8).font(fontBold)
            .text(title, x + 10, y + 9, { width: w - 20, characterSpacing: 0.8 });

          let rowY = y + 32;
          rows.forEach(([label, value]) => {
            doc.fillColor(r(C.grey)).fontSize(8.5).font(fontBody)
              .text(label, x + 10, rowY, { width: 100, lineBreak: false });
            doc.fillColor(r(C.text)).fontSize(8.5).font(fontBody)
              .text(value || '—', x + 115, rowY, { width: w - 125 });
            rowY += ROW_H;
            if (rowY < y + cardH - 4) {
              doc.moveTo(x + 10, rowY - 4).lineTo(x + w - 10, rowY - 4)
                .strokeColor(r(C.border)).lineWidth(0.4).stroke();
            }
          });

          return y + cardH;
        };

        // Customer rows
        const customerRows: Array<[string, string]> = [
          [t(lc, 'full_name'), reservation.customerName || '—'],
          [t(lc, 'email'),     reservation.customerEmail || '—'],
          [t(lc, 'phone'),     reservation.customerPhone || '—'],
        ];
        if (personal?.nationality) customerRows.push([t(lc, 'nationality'), personal.nationality]);
        if (personal?.identityNumber) customerRows.push([t(lc, 'id_number'), personal.identityNumber]);
        if (driverLicense?.licenseNumber && isRentacar) customerRows.push([t(lc, 'license_no'), driverLicense.licenseNumber]);

        col1Y = drawCard(COL1_X, col1Y, COL1_W, t(lc, 'customer_section'), customerRows) + 10;

        // Reservation / vehicle details card
        const resRows: Array<[string, string]> = [];
        if (isRentacar) {
          if (meta.vehicleName) resRows.push([t(lc, 'vehicle'), String(meta.vehicleName)]);
          if (meta.fuelType)    resRows.push([t(lc, 'fuel_type'), t(lc, String(meta.fuelType).toLowerCase())]);
          if (meta.transmission) resRows.push([t(lc, 'transmission'), t(lc, String(meta.transmission).toLowerCase()) || String(meta.transmission)]);
          resRows.push([t(lc, 'pickup_location'), String(meta.pickupLocationName || '—')]);
          resRows.push([t(lc, 'pickup_date'), fmtDate(reservation.checkIn, lc)]);
          resRows.push([t(lc, 'dropoff_location'), String(meta.dropoffLocationName || '—')]);
          resRows.push([t(lc, 'dropoff_date'), fmtDate(reservation.checkOut, lc)]);
          const days = meta.rentalDays != null ? `${meta.rentalDays} ${t(lc, 'day')}` : '—';
          resRows.push([t(lc, 'rental_days'), days]);
        } else {
          if (meta.tourName) resRows.push([t(lc, 'tour_name'), String(meta.tourName)]);
          resRows.push([t(lc, 'tour_date'), fmtDate(reservation.checkIn, lc)]);
          if (meta.passengerCount) resRows.push([t(lc, 'passengers'), String(meta.passengerCount)]);
        }

        col1Y = drawCard(COL1_X, col1Y, COL1_W,
          isRentacar ? t(lc, 'reservation_section') : t(lc, 'tour_section'),
          resRows) + 10;

        // ── COLUMN 2: Price summary card ──────────────────────────────────
        const priceRows: Array<[string, string]> = [];
        if (isRentacar && (meta.totalPrice || meta.vehiclePrice)) {
          if (meta.vehiclePrice)  priceRows.push([t(lc, 'vehicle_price'), fmtMoney(meta.vehiclePrice, currencyCode)]);
          if (meta.extrasPrice && parseFloat(String(meta.extrasPrice)) > 0)
            priceRows.push([t(lc, 'extras_price'), fmtMoney(meta.extrasPrice, currencyCode)]);
          if (meta.deliveryFee && parseFloat(String(meta.deliveryFee)) > 0)
            priceRows.push([t(lc, 'delivery_fee'), fmtMoney(meta.deliveryFee, currencyCode)]);
          if (meta.dropFee && parseFloat(String(meta.dropFee)) > 0)
            priceRows.push([t(lc, 'drop_fee'), fmtMoney(meta.dropFee, currencyCode)]);
          if (meta.campaignDiscount?.discountAmount > 0)
            priceRows.push([t(lc, 'discount'), `- ${fmtMoney(meta.campaignDiscount.discountAmount, currencyCode)}`]);
          if (meta.discountCodeDiscount?.discountAmount > 0)
            priceRows.push([t(lc, 'discount'), `- ${fmtMoney(meta.discountCodeDiscount.discountAmount, currencyCode)}`]);
          if (paymentKey) priceRows.push([t(lc, 'payment'), paymentLabel]);
        } else if (!isRentacar && meta.totalPrice) {
          if (paymentKey) priceRows.push([t(lc, 'payment'), paymentLabel]);
        }

        // Price card
        if (priceRows.length > 0 || meta.totalPrice) {
          const PRICE_CARD_HEADER_H = 26;
          const PRICE_ROW_H = 22;
          const TOTAL_AREA_H = 36;
          const pCardH = PRICE_CARD_HEADER_H + priceRows.length * PRICE_ROW_H + TOTAL_AREA_H + 10;

          roundRect(COL2_X, col2Y, COL2_W, pCardH, 6, C.bg, C.border);
          doc.roundedRect(COL2_X, col2Y, COL2_W, PRICE_CARD_HEADER_H, 6).fillColor(r(C.brand)).fill();

          doc.fillColor(r(C.white)).fontSize(8).font(fontBold)
            .text(t(lc, 'price_section'), COL2_X + 10, col2Y + 9, { width: COL2_W - 20, characterSpacing: 0.8 });

          let pRowY = col2Y + PRICE_CARD_HEADER_H + 6;
          priceRows.forEach(([label, value]) => {
            doc.fillColor(r(C.grey)).fontSize(8.5).font(fontBody)
              .text(label, COL2_X + 10, pRowY, { width: 80, lineBreak: false });
            doc.fillColor(r(C.text)).fontSize(8.5).font(fontBold)
              .text(value, COL2_X + 94, pRowY, { width: COL2_W - 104, align: 'right' });
            pRowY += PRICE_ROW_H;
            doc.moveTo(COL2_X + 10, pRowY - 4).lineTo(COL2_X + COL2_W - 10, pRowY - 4)
              .strokeColor(r(C.border)).lineWidth(0.4).stroke();
          });

          // Total highlight
          const totalY = col2Y + pCardH - TOTAL_AREA_H;
          doc.rect(COL2_X, totalY, COL2_W, TOTAL_AREA_H)
            .fillColor(r(C.accent)).fill();
          // Fix top corners square, bottom rounded
          doc.rect(COL2_X, totalY, COL2_W, 10).fillColor(r(C.accent)).fill();

          doc.fillColor(r(C.white)).fontSize(8).font(fontBold)
            .text(t(lc, 'total'), COL2_X + 10, totalY + 8, { width: COL2_W - 20 * 2, lineBreak: false });
          doc.fillColor(r(C.white)).fontSize(13).font(fontBold)
            .text(fmtMoney(meta.totalPrice, currencyCode), COL2_X + 10, totalY + 16, { width: COL2_W - 20, align: 'right' });

          col2Y += pCardH + 10;
        }

        // Extras card (if rentacar and has extras)
        const extras = Array.isArray(meta.extras) ? meta.extras as Array<{ name: string; quantity: number; price: number }> : [];
        const validExtras = extras.filter(e => e.name && e.quantity > 0);
        if (validExtras.length > 0 && isRentacar) {
          const extRows: Array<[string, string]> = validExtras.map(e =>
            [`${e.name} x${e.quantity}`, fmtMoney(e.price * e.quantity, currencyCode)]
          );
          col2Y = drawCard(COL2_X, col2Y, COL2_W, t(lc, 'extras_section'), extRows) + 10;
        }

        // Sync Y to max of both columns
        curY = Math.max(col1Y, col2Y) + 6;

        // ═══════════════════════════════════════════════════════════════════
        // IMPORTANT NOTES BOX
        // ═══════════════════════════════════════════════════════════════════
        const noteText = t(lc, 'note_text');
        const noteLines = Math.ceil(noteText.length / 85);
        const NOTE_H = 22 + noteLines * 13 + 12;

        roundRect(ML, curY, CW, NOTE_H, 6, C.yellowBg, C.yellowBd);

        // Emoji kullanma — PDF’te güvenilir değil
        doc.fillColor(r(C.amber)).fontSize(9).font(fontBold)
          .text(t(lc, 'note_title'), ML + 12, curY + 9);
        doc.fillColor(r(C.yellowTxt)).fontSize(8.5).font(fontBody)
          .text(noteText, ML + 12, curY + 22, { width: CW - 24 });

        curY += NOTE_H + 14;

        // ═══════════════════════════════════════════════════════════════════
        // COMPANY INFO STRIP (if enough info)
        // ═══════════════════════════════════════════════════════════════════
        if (companyPhone || companyEmail || companyAddr) {
          roundRect(ML, curY, CW, 28, 4, C.bg, C.border);

          const parts: string[] = [];
          if (companyPhone)  parts.push(`Tel: ${companyPhone}`);
          if (companyEmail)  parts.push(`Email: ${companyEmail}`);
          if (companyAddr)   parts.push(`Addr: ${companyAddr}`);
          if (companyTax)    parts.push(`Tax: ${companyTax}`);

          doc.fillColor(r(C.grey)).fontSize(8).font(fontBody)
            .text(parts.join('    '), ML + 12, curY + 10, { width: CW - 24, align: 'center' });
          curY += 40;
        }

        // ═══════════════════════════════════════════════════════════════════
        // FOOTER
        // ═══════════════════════════════════════════════════════════════════
        const FOOTER_H = 44;
        const footerY  = H - FOOTER_H;

        doc.rect(0, footerY, W, FOOTER_H).fillColor(r(C.brand)).fill();
        // Top border line
        doc.rect(0, footerY, W, 3).fillColor(r(C.accent)).fill();

        // Left: company name
        doc.fillColor(r(C.white)).fontSize(10).font(fontBold)
          .text(companyName, ML, footerY + 14, { lineBreak: false });

        // Center: ref number
        doc.fillColor(r([147, 197, 253] as RGB)).fontSize(9).font(fontBody)
          .text(`${t(lc, 'ref_no')}: #${ref}`, 0, footerY + 16, { width: W, align: 'center' });

        // Right: page
        doc.fillColor(r([148, 163, 184] as RGB)).fontSize(8).font(fontBody)
          .text(`${t(lc, 'page')} 1`, W - ML - 40, footerY + 17, { width: 40, align: 'right' });

        doc.end();
      };

      // Fetch logo and draw
      if (logoAbsUrl) {
        fetchBuffer(logoAbsUrl)
          .then(buf => drawDocument(buf))
          .catch(() => drawDocument());
      } else {
        drawDocument();
      }
    });
  }
}
