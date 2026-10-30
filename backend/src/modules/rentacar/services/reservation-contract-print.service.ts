import path from 'path';
import fs from 'fs';
import { AppDataSource } from '../../../config/data-source';
import { Reservation, ReservationType } from '../../shared/entities/reservation.entity';
import { ContractTemplateService } from './contract-template.service';
import { ContractBuilderService } from './contract-builder.service';
import { TenantSettingsService } from '../../shared/services/tenant-settings.service';

/** Şablon klasörü (bu servisin bulunduğu dizine göre templates/) */
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

/**
 * html_template alanı dosya yolu ise (örn. berg-rental-agreement.html) dosyadan oku, değilse inline HTML kabul et.
 */
async function resolveTemplateContent(htmlTemplate: string): Promise<string> {
  const trimmed = htmlTemplate.trim();
  if (!trimmed) return '';

  // Inline HTML: < ile başlıyorsa doğrudan kullan
  if (trimmed.startsWith('<')) {
    return trimmed;
  }

  // Dosya yolu: sadece dosya adına izin ver (path traversal yok)
  const safeName = trimmed.replace(/\\/g, '/').replace(/^\/+/, '').split('/').pop() || '';
  if (!/^[a-zA-Z0-9_.-]+\.html$/.test(safeName)) {
    throw new Error(`Geçersiz şablon yolu: sadece .html dosya adı kullanılabilir (örn. berg-rental-agreement.html)`);
  }

  const filePath = path.join(TEMPLATES_DIR, safeName);
  const dirReal = path.resolve(TEMPLATES_DIR);
  const fileReal = path.resolve(filePath);
  if (!fileReal.startsWith(dirReal + path.sep) && fileReal !== dirReal) {
    throw new Error('Geçersiz şablon yolu');
  }

  try {
    return await fs.promises.readFile(filePath, 'utf-8');
  } catch (err) {
    throw new Error(`Şablon dosyası okunamadı: ${safeName}. Klasör: ${TEMPLATES_DIR}`);
  }
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('tr-TR');
}

function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
}

/**
 * Build placeholder map for rent-a-car contract HTML template.
 * Template uses {{variableName}}; missing data is left as empty string.
 */
export async function getContractPrintHtml(
  reservationId: string,
  tenantId: string
): Promise<string> {
  const reservationRepo = AppDataSource.getRepository(Reservation);
  const reservation = await reservationRepo.findOne({
    where: { id: reservationId, tenantId },
    relations: [
      'tenant',
      'vehiclePlateAssignments',
      'vehiclePlateAssignments.plate',
      'vehiclePlateAssignments.plate.vehicle',
    ],
  });

  if (!reservation) {
    throw new Error('Rezervasyon bulunamadı');
  }
  if (reservation.type !== ReservationType.RENTACAR) {
    throw new Error('Sadece araç kiralama rezervasyonları için sözleşme yazdırılabilir');
  }

  const template = await ContractTemplateService.getDefaultTemplate(tenantId);

  const siteSettings = await TenantSettingsService.getSiteSettings(tenantId);
  const meta = (reservation.metadata || {}) as Record<string, any>;

  const personalInfo = meta.personalInfo || {};
  const driverLicenseInfo = meta.driverLicenseInfo || {};
  const addressInfo = meta.addressInfo || {};

  const assignments = reservation.vehiclePlateAssignments || [];
  const firstAssignment = assignments[0];
  const plate = firstAssignment?.plate;
  const vehicle = plate?.vehicle;
  const vehicleName = vehicle
    ? [vehicle.brandName, vehicle.modelName].filter(Boolean).join(' ') || (vehicle as { name?: string }).name || ''
    : '';
  const plateNumber = plate?.plateNumber ?? '';

  const checkIn = reservation.checkIn;
  const checkOut = reservation.checkOut;
  const durationDays =
    checkIn && checkOut
      ? Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (24 * 60 * 60 * 1000))
      : '';

  const variables: Record<string, string> = {
    // Rezervasyon
    reference: reservation.reference ?? '',
    agreement_number: reservation.reference ?? '',
    seri_no: reservation.reference ?? '',
    customerName: reservation.customerName ?? '',
    customer_email: reservation.customerEmail ?? '',
    customer_phone: reservation.customerPhone ?? '',
    checkIn: formatDate(checkIn),
    checkOut: formatDate(checkOut),
    date_in: formatDate(checkIn),
    date_out: formatDate(checkOut),
    time: checkIn ? formatDateTime(checkIn) : '',
    duration: String(durationDays),
    totalPrice: String(meta.totalPrice ?? ''),
    currencyCode: meta.currencyCode ?? 'TRY',
    gross_total: [meta.totalPrice, meta.currencyCode].filter(Boolean).join(' ') || '',
    brut_toplam: [meta.totalPrice, meta.currencyCode].filter(Boolean).join(' ') || '',

    // Araç
    vehicleName,
    plateNumber,
    plate_no: plateNumber,
    car_code: vehicleName,

    // Şirket (tenant site ayarları)
    companyName: siteSettings?.companyName ?? siteSettings?.siteName ?? '',
    company_name: siteSettings?.companyName ?? siteSettings?.siteName ?? '',
    companyAddress: siteSettings?.companyAddress ?? '',
    company_address: siteSettings?.companyAddress ?? '',
    companyPhone: siteSettings?.companyPhone ?? '',
    company_phone: siteSettings?.companyPhone ?? '',
    company_email: siteSettings?.companyEmail ?? '',
    companyWebsite: siteSettings?.companyWebsite ?? '',
    company_website: siteSettings?.companyWebsite ?? '',
    gsm: siteSettings?.companyPhone ?? '',

    // Müşteri / Sürücü (metadata)
    firstName: personalInfo.firstName ?? '',
    lastName: personalInfo.lastName ?? '',
    surname: personalInfo.lastName ?? '',
    driver_name: [personalInfo.firstName, personalInfo.lastName].filter(Boolean).join(' ') || reservation.customerName,
    name: personalInfo.firstName ?? '',
    adi: personalInfo.firstName ?? '',
    soyadi: personalInfo.lastName ?? '',
    passport_no: personalInfo.identityNumber ?? '',
    identityNumber: personalInfo.identityNumber ?? '',
    tc_no: personalInfo.identityNumber ?? '',
    place_of_birth: personalInfo.dateOfBirth ?? '',
    date_of_birth: personalInfo.dateOfBirth ?? '',
    dogum_yeri_tarih: [personalInfo.dateOfBirth].filter(Boolean).join(' ') || '',
    tel: reservation.customerPhone ?? (personalInfo.phoneCountryCode && personalInfo.phoneNumber ? String(personalInfo.phoneCountryCode) + String(personalInfo.phoneNumber) : ''),
    phone: reservation.customerPhone ?? '',
    email: reservation.customerEmail ?? personalInfo.email ?? '',
    address: addressInfo.address ?? '',
    home_address: addressInfo.address ?? '',
    ev_adresi: addressInfo.address ?? '',
    city: addressInfo.city ?? '',
    postalCode: addressInfo.postalCode ?? '',
    country: addressInfo.country ?? personalInfo.nationality ?? '',

    // Ehliyet
    licence_no: driverLicenseInfo.licenseNumber ?? '',
    licenseNumber: driverLicenseInfo.licenseNumber ?? '',
    ehliyet_no: driverLicenseInfo.licenseNumber ?? '',
    license_issue_date: formatDate(driverLicenseInfo.licenseIssueDate),
    license_expiry_date: formatDate(driverLicenseInfo.licenseExpiryDate),
    license_country: driverLicenseInfo.licenseCountry ?? '',
    issued_by: driverLicenseInfo.licenseIssueDate ? formatDate(driverLicenseInfo.licenseIssueDate) : '',
    verildigi_yer_tarih: [
      driverLicenseInfo.licenseCountry,
      driverLicenseInfo.licenseIssueDate ? formatDate(driverLicenseInfo.licenseIssueDate) : '',
    ]
      .filter(Boolean)
      .join(' - ') || '',

    // Sadece resimdeki alanlar – ekstra veri yok
    hotel_name: meta.hotelName ?? meta.hotel_name ?? '',
    room_nr: meta.roomNr ?? meta.room_nr ?? '',
    return_station: meta.returnStation ?? meta.return_station ?? '',
    reservation_provider: meta.reservationProvider ?? meta.reservation_provider ?? meta.source ?? '',
    vehicle_change: meta.vehicleChange ?? meta.vehicle_change ?? '',
    passport_issued: meta.passportIssued ?? meta.passport_issued ?? '',
    second_driver: meta.secondDriver ?? meta.second_driver ?? '',
    credit_card_owner: meta.creditCardOwner ?? meta.credit_card_owner ?? '',
    card_expiry_ccv: meta.cardExpiryCcv ?? meta.card_expiry_ccv ?? '',
    amount_in_words: meta.amountInWords ?? meta.amount_in_words ?? '',
    paid: meta.paid ?? '',
    contractNumber: reservation.reference ?? '',
  };

  // 1) Şablonda html_template (dosya yolu veya inline HTML) varsa onu kullan
  if (template.htmlTemplate?.trim()) {
    const htmlContent = await resolveTemplateContent(template.htmlTemplate);
    return ContractBuilderService.renderHtmlTemplate(htmlContent, variables);
  }

  // 2) Yoksa Sözleşmeler sayfasında eklenen bölümler (sections) ile HTML oluştur
  const rendered = ContractBuilderService.renderContract({
    template,
    variables,
    optionalBlocks: (template.optionalBlocks || [])
      .filter(b => b.isEnabled)
      .map(b => ({ id: b.id, isEnabled: true })),
  });
  return rendered.html;
}

/**
 * Boş şablon HTML (rezervasyon verisi yok). Sadece şirket bilgileri doldurulur; diğer alanlar boş.
 * Sözleşmeler sayfasında "HTML yazdır" ile boş form yazdırmak için kullanılır.
 */
export async function getEmptyContractPrintHtml(
  tenantId: string,
  templateId?: string
): Promise<string> {
  const template = templateId
    ? await ContractTemplateService.getById(templateId, tenantId)
    : await ContractTemplateService.getDefaultTemplate(tenantId);

  if (!template?.htmlTemplate?.trim()) {
    throw new Error('Bu şablon için yazdırma içeriği tanımlı değil. Şablon düzenleyip HTML/dosya girin.');
  }

  const htmlContent = await resolveTemplateContent(template.htmlTemplate);
  const siteSettings = await TenantSettingsService.getSiteSettings(tenantId);

  const emptyVariables: Record<string, string> = {
    reference: '',
    agreement_number: '',
    seri_no: '',
    customerName: '',
    customer_email: '',
    customer_phone: '',
    checkIn: '',
    checkOut: '',
    date_in: '',
    date_out: '',
    time: '',
    duration: '',
    totalPrice: '',
    currencyCode: 'TRY',
    gross_total: '',
    brut_toplam: '',
    vehicleName: '',
    plateNumber: '',
    plate_no: '',
    car_code: '',
    companyName: siteSettings?.companyName ?? siteSettings?.siteName ?? '',
    company_name: siteSettings?.companyName ?? siteSettings?.siteName ?? '',
    companyAddress: siteSettings?.companyAddress ?? '',
    company_address: siteSettings?.companyAddress ?? '',
    companyPhone: siteSettings?.companyPhone ?? '',
    company_phone: siteSettings?.companyPhone ?? '',
    company_email: siteSettings?.companyEmail ?? '',
    companyWebsite: siteSettings?.companyWebsite ?? '',
    company_website: siteSettings?.companyWebsite ?? '',
    gsm: siteSettings?.companyPhone ?? '',
    firstName: '',
    lastName: '',
    surname: '',
    driver_name: '',
    name: '',
    adi: '',
    soyadi: '',
    passport_no: '',
    identityNumber: '',
    tc_no: '',
    place_of_birth: '',
    date_of_birth: '',
    dogum_yeri_tarih: '',
    tel: '',
    phone: '',
    email: '',
    address: '',
    home_address: '',
    ev_adresi: '',
    city: '',
    postalCode: '',
    country: '',
    licence_no: '',
    licenseNumber: '',
    ehliyet_no: '',
    license_issue_date: '',
    license_expiry_date: '',
    license_country: '',
    issued_by: '',
    verildigi_yer_tarih: '',
    hotel_name: '',
    room_nr: '',
    return_station: '',
    reservation_provider: '',
    vehicle_change: '',
    passport_issued: '',
    second_driver: '',
    credit_card_owner: '',
    card_expiry_ccv: '',
    amount_in_words: '',
    paid: '',
  };

  return ContractBuilderService.renderHtmlTemplate(htmlContent, emptyVariables);
}
