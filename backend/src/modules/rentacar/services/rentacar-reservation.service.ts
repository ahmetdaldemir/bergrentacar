import { Repository, In, Between, MoreThan } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { Reservation, ReservationStatus, ReservationType } from '../../shared/entities/reservation.entity';
import { Vehicle } from '../entities/vehicle.entity';
import { VehicleReservationAssignment } from '../entities/vehicle-reservation-assignment.entity';
import { Location } from '../entities/location.entity';
import { Extra } from '../entities/extra.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { TenantLanguageService } from '../../tenants/services/tenant-language.service';
import { Customer, CustomerIdType } from '../../shared/entities/customer.entity';
import { CustomerService } from '../../shared/services/customer.service';
import { sendReservationEmail } from '../../../services/reservation-email.service';
import { EmailTemplateType } from '../../shared/entities/email-template.entity';
import { sendMail } from '../../../services/mail.service';
import { notifyTenantPanelRefresh } from '../../../services/tenant-panel-socket.service';
import crypto from 'crypto';

export type CreateRentacarReservationInput = {
  tenantId: string;
  vehicleId: string;
  pickupLocationId: string;
  dropoffLocationId: string;
  pickupDate: string;
  dropoffDate: string;
  pickupTime: string;
  dropoffTime: string;
  rentalDays: number;
  extras: Array<{
    id: string;
    quantity: number;
  }>;
  vehiclePrice: number;
  extrasPrice: number;
  totalPrice: number;
  currencyCode: string;
  /** Panel: mevcut müşteri ID (verilirse personalInfo/driverLicenseInfo/addressInfo müşteriden doldurulur) */
  customerId?: string;
  /** Global indirim kodu (api/discount-codes ile aynı sistem) */
  discountCode?: string;
  personalInfo?: {
    firstName: string;
    lastName: string;
    nationality: string;
    identityNumber: string;
    dateOfBirth: string;
    phoneCountryCode: string;
    phoneNumber: string;
    email: string;
  };
  driverLicenseInfo?: {
    licenseNumber: string;
    licenseIssueDate: string;
    licenseExpiryDate: string;
    licenseCountry: string;
  };
  addressInfo?: {
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  paymentMethod: string;
  personalDataConsent?: boolean;
  commercialElectronicConsent?: boolean;
  rentalConditionsConsent?: boolean;
  /** Rezervasyon / e-posta dili (tenant aktif dillerinden biri olmalı) */
  languageId?: string | null;
  /** Hangi web sitesi / kanaldan geldiği (max 255 karakter) */
  bookingSourceSite?: string | null;
};

function normalizeBookingSourceSite(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  if (!t) return null;
  return t.length > 255 ? t.slice(0, 255) : t;
}

/** Rezervasyon metadata + e-posta için marka/model görünen adı (plaka atanmadan önce de kullanılır). */
function formatRentacarVehicleDisplayName(vehicle: {
  brand?: { name?: string } | null;
  model?: { name?: string } | null;
  brandName?: string | null;
  modelName?: string | null;
}): string {
  const brand = vehicle.brand?.name ?? vehicle.brandName ?? '';
  const model = vehicle.model?.name ?? vehicle.modelName ?? '';
  const core = [brand, model]
    .map((s) => String(s).trim())
    .filter((s) => s.length > 0)
    .join(' ');
  return core || 'Araç';
}

export class RentacarReservationService {
  private static reservationRepo(): Repository<Reservation> {
    return AppDataSource.getRepository(Reservation);
  }

  private static vehicleRepo(): Repository<Vehicle> {
    return AppDataSource.getRepository(Vehicle);
  }

  private static locationRepo(): Repository<Location> {
    return AppDataSource.getRepository(Location);
  }

  private static extraRepo(): Repository<Extra> {
    return AppDataSource.getRepository(Extra);
  }

  private static tenantRepo(): Repository<Tenant> {
    return AppDataSource.getRepository(Tenant);
  }

  /**
   * Generate unique reservation reference
   */
  private static generateReference(): string {
    const prefix = 'RAC';
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Generate random password
   */
  private static generateRandomPassword(): string {
    return crypto.randomBytes(12).toString('base64').slice(0, 16);
  }

  /**
   * Find or create customer by email
   */
  private static async findOrCreateCustomer(
    tenantId: string,
    email: string,
    firstName: string,
    lastName: string,
    personalInfo: CreateRentacarReservationInput['personalInfo'],
    driverLicenseInfo?: CreateRentacarReservationInput['driverLicenseInfo'],
    addressInfo?: CreateRentacarReservationInput['addressInfo']
  ): Promise<{ customer: Customer | null }> {
    // Check if customer exists by email
    const customerRepo = AppDataSource.getRepository(Customer);
    const existingCustomer = await customerRepo.findOne({
      where: { email, tenantId },
    });

    if (existingCustomer) {
      return { customer: existingCustomer };
    }

    if (!personalInfo) {
      return { customer: null };
    }

    // Create new customer
    try {
      const newCustomer = await CustomerService.create({
        tenantId,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        email,
        mobilePhone: personalInfo.phoneNumber ? `${personalInfo.phoneCountryCode}${personalInfo.phoneNumber}` : undefined,
        birthDate: personalInfo.dateOfBirth ? new Date(personalInfo.dateOfBirth) : undefined,
        country: personalInfo.nationality,
        idNumber: personalInfo.identityNumber,
        idType: personalInfo.identityNumber ? (personalInfo.identityNumber.length === 11 ? CustomerIdType.TC : CustomerIdType.PASSPORT) : undefined,
        licenseNumber: driverLicenseInfo?.licenseNumber,
        licenseIssueDate: driverLicenseInfo?.licenseIssueDate ? new Date(driverLicenseInfo.licenseIssueDate) : undefined,
        homeAddress: addressInfo?.address,
        isActive: true,
        isBlacklisted: false,
      });

      return { customer: newCustomer };
    } catch (error) {
      console.error('Failed to create customer:', error);
      // Continue without customer creation if it fails
      return { customer: null };
    }
  }

  /**
   * Create rentacar reservation
   * Panel: customerId verilirse müşteri bilgileri CRM müşterisinden doldurulur.
   */
  static async create(input: CreateRentacarReservationInput): Promise<Reservation> {
    // Panel akışı: customerId varsa müşteriyi yükle ve personalInfo/driverLicenseInfo/addressInfo doldur
    if (input.customerId) {
      const panelCustomer = await CustomerService.getById(input.customerId, input.tenantId);
      if (!panelCustomer) {
        throw new Error('Customer not found');
      }
      const phone = (panelCustomer.mobilePhone || panelCustomer.homePhone || '').trim();
      const phoneCountryCode = phone.startsWith('+') ? phone.split(/\s/)[0] || '+90' : '+90';
      const phoneNumber = phone.replace(/^\+\d+\s*/, '').trim() || phone;
      input.personalInfo = {
        firstName: panelCustomer.firstName || '',
        lastName: panelCustomer.lastName || '',
        nationality: panelCustomer.country || 'TR',
        identityNumber: panelCustomer.idNumber || '',
        dateOfBirth: panelCustomer.birthDate ? new Date(panelCustomer.birthDate).toISOString().split('T')[0] : '',
        phoneCountryCode,
        phoneNumber,
        email: panelCustomer.email || '',
      };
      input.driverLicenseInfo = {
        licenseNumber: panelCustomer.licenseNumber || '',
        licenseIssueDate: panelCustomer.licenseIssueDate ? new Date(panelCustomer.licenseIssueDate).toISOString().split('T')[0] : '',
        licenseExpiryDate: '',
        licenseCountry: panelCustomer.country || 'TR',
      };
      input.addressInfo = {
        address: panelCustomer.homeAddress || panelCustomer.workAddress || '',
        city: '',
        postalCode: '',
        country: panelCustomer.country || 'TR',
      };
      input.personalDataConsent = true;
      input.commercialElectronicConsent = true;
      input.rentalConditionsConsent = true;
    }
    if (!input.personalInfo || !input.driverLicenseInfo || !input.addressInfo) {
      throw new Error('personalInfo, driverLicenseInfo and addressInfo are required when customerId is not provided');
    }
    const personalInfo = input.personalInfo;
    const driverLicenseInfo = input.driverLicenseInfo;
    const addressInfo = input.addressInfo;

    // Validate tenant
    const tenant = await this.tenantRepo().findOne({ where: { id: input.tenantId } });
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Validate vehicle
    const vehicle = await this.vehicleRepo().findOne({
      where: { id: input.vehicleId, tenantId: input.tenantId },
      relations: ['category', 'brand', 'model'],
    });
    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    // Validate locations
    // Try to find pickup location by rentacar_locations.id first
    let pickupLocation = await this.locationRepo().findOne({
      where: { id: input.pickupLocationId, tenantId: input.tenantId },
      relations: ['location'],
    });
    
    // If not found, try to find by master location ID (locationId)
    if (!pickupLocation) {
      pickupLocation = await this.locationRepo().findOne({
        where: { locationId: input.pickupLocationId, tenantId: input.tenantId },
        relations: ['location'],
      });
    }
    
    // If still not found, check with soft-deleted included (by id)
    if (!pickupLocation) {
      pickupLocation = await this.locationRepo().findOne({
        where: { id: input.pickupLocationId, tenantId: input.tenantId },
        relations: ['location'],
        withDeleted: true,
      });
    }
    
    // If still not found, check with soft-deleted included (by locationId)
    if (!pickupLocation) {
      pickupLocation = await this.locationRepo().findOne({
        where: { locationId: input.pickupLocationId, tenantId: input.tenantId },
        relations: ['location'],
        withDeleted: true,
      });
    }
    
    if (!pickupLocation) {
      throw new Error(`Pickup location not found for tenant ${input.tenantId}. Searched by id: ${input.pickupLocationId} and locationId: ${input.pickupLocationId}. Make sure the location exists in rentacar_locations table for this tenant.`);
    }
    
    if (pickupLocation.deletedAt) {
      throw new Error(`Pickup location is deleted (id: ${pickupLocation.id})`);
    }

    // Try to find dropoff location by rentacar_locations.id first
    let dropoffLocation = await this.locationRepo().findOne({
      where: { id: input.dropoffLocationId, tenantId: input.tenantId },
      relations: ['location'],
    });
    
    // If not found, try to find by master location ID (locationId)
    if (!dropoffLocation) {
      dropoffLocation = await this.locationRepo().findOne({
        where: { locationId: input.dropoffLocationId, tenantId: input.tenantId },
        relations: ['location'],
      });
    }
    
    // If still not found, check with soft-deleted included (by id)
    if (!dropoffLocation) {
      dropoffLocation = await this.locationRepo().findOne({
        where: { id: input.dropoffLocationId, tenantId: input.tenantId },
        relations: ['location'],
        withDeleted: true,
      });
    }
    
    // If still not found, check with soft-deleted included (by locationId)
    if (!dropoffLocation) {
      dropoffLocation = await this.locationRepo().findOne({
        where: { locationId: input.dropoffLocationId, tenantId: input.tenantId },
        relations: ['location'],
        withDeleted: true,
      });
    }
    
    if (!dropoffLocation) {
      throw new Error(`Dropoff location not found for tenant ${input.tenantId}. Searched by id: ${input.dropoffLocationId} and locationId: ${input.dropoffLocationId}. Make sure the location exists in rentacar_locations table for this tenant.`);
    }
    
    if (dropoffLocation.deletedAt) {
      throw new Error(`Dropoff location is deleted (id: ${dropoffLocation.id})`);
    }

    // Validate extras
    const extraIds = input.extras.map(e => e.id);
    const extras = await this.extraRepo().find({
      where: { 
        id: In(extraIds), 
        tenantId: input.tenantId 
      },
    });
    if (extras.length !== extraIds.length) {
      throw new Error(`Some extras not found. Requested: ${extraIds.length}, Found: ${extras.length}`);
    }

    // Find or create customer by email
    const { customer } = await this.findOrCreateCustomer(
      input.tenantId,
      personalInfo.email,
      personalInfo.firstName,
      personalInfo.lastName,
      personalInfo,
      driverLicenseInfo,
      addressInfo
    );

    // Generate reference
    const reference = this.generateReference();

    // Prepare pickup and dropoff dates with times
    const [pickupHours, pickupMinutes] = input.pickupTime.split(':').map(Number);
    const [dropoffHours, dropoffMinutes] = input.dropoffTime.split(':').map(Number);
    
    const pickupDate = new Date(input.pickupDate);
    pickupDate.setHours(pickupHours, pickupMinutes, 0, 0);
    
    const dropoffDate = new Date(input.dropoffDate);
    dropoffDate.setHours(dropoffHours, dropoffMinutes, 0, 0);

    // Apply campaign discount if applicable
    let campaignDiscount = null;
    let finalVehiclePrice = input.vehiclePrice;
    
    try {
      const { CampaignService } = await import('./campaign.service');
      const campaignDiscountResult = await CampaignService.getCampaignDiscount(
        {
          tenantId: input.tenantId,
          pickupLocationId: pickupLocation.id,
          vehicleId: input.vehicleId,
          vehicleCategoryId: vehicle.categoryId || null,
          rentalDays: input.rentalDays,
          pickupDate: pickupDate,
        },
        input.vehiclePrice
      );

      if (campaignDiscountResult) {
        campaignDiscount = {
          campaignId: campaignDiscountResult.campaignId,
          campaignName: campaignDiscountResult.campaignName,
          discountType: campaignDiscountResult.discountType,
          discountPercent: campaignDiscountResult.discountPercent,
          discountAmount: campaignDiscountResult.discountAmount,
        };
        finalVehiclePrice = campaignDiscountResult.finalPrice;
      }
    } catch (error) {
      // If campaign service fails, continue without discount
      console.error('Error applying campaign discount:', error);
    }

    // Calculate total price after campaign discount
    const totalAfterCampaign = input.totalPrice - (input.vehiclePrice - finalVehiclePrice);
    let finalTotalPrice = totalAfterCampaign;
    let discountCodeDiscount: { code: string; discountAmount: number } | null = null;

    // Apply global discount code if provided
    if (input.discountCode?.trim()) {
      try {
        const { TransferDiscountCodeService } = await import('../../transfer/services/transfer-discount-code.service');
        const validation = await TransferDiscountCodeService.validate({
          tenantId: input.tenantId,
          code: input.discountCode.trim(),
          orderTotal: totalAfterCampaign,
          customerEmail: personalInfo.email,
        });
        if (validation.valid && validation.discountAmount != null && validation.discountAmount > 0) {
          discountCodeDiscount = { code: input.discountCode.trim(), discountAmount: validation.discountAmount };
          finalTotalPrice = Math.max(0, totalAfterCampaign - validation.discountAmount);
        } else {
          throw new Error(validation.error || 'Geçersiz indirim kodu');
        }
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'İndirim kodu uygulanamadı');
      }
    }

    let resolvedLanguageId: string | null = null;
    if (input.languageId) {
      const active = await TenantLanguageService.isLanguageActive(input.tenantId, input.languageId);
      if (active) resolvedLanguageId = input.languageId;
    }
    if (!resolvedLanguageId) {
      resolvedLanguageId = await TenantLanguageService.getDefaultLanguageId(input.tenantId);
    }

    // Create reservation metadata
    const metadata = {
      languageId: resolvedLanguageId,
      vehicleId: input.vehicleId,
      vehicleName: formatRentacarVehicleDisplayName(vehicle),
      pickupLocationId: input.pickupLocationId,
      pickupLocationName: pickupLocation.location?.name || 'Unknown',
      dropoffLocationId: input.dropoffLocationId,
      dropoffLocationName: dropoffLocation.location?.name || 'Unknown',
      rentalDays: input.rentalDays,
      extras: input.extras.map(extra => {
        const extraData = extras.find(e => e.id === extra.id);
        return {
          id: extra.id,
          name: extraData?.name || 'Unknown',
          quantity: extra.quantity,
          price: extraData?.price || 0,
        };
      }),
      vehiclePrice: finalVehiclePrice, // Use price after campaign discount
      baseVehiclePrice: input.vehiclePrice, // Store original price before discount
      extrasPrice: input.extrasPrice,
      totalPrice: finalTotalPrice, // Final price after campaign and/or discount code
      baseTotalPrice: input.totalPrice, // Original total before discounts
      currencyCode: input.currencyCode,
      campaignDiscount: campaignDiscount,
      discountCodeDiscount: discountCodeDiscount, // Global discount code (api/discount-codes)
      paymentMethod: input.paymentMethod,
      personalInfo,
      driverLicenseInfo,
      addressInfo,
      personalDataConsent: input.personalDataConsent,
      commercialElectronicConsent: input.commercialElectronicConsent,
      rentalConditionsConsent: input.rentalConditionsConsent,
      customerId: customer?.id || null,
    };

    // Create reservation
    const reservation = this.reservationRepo().create({
      tenantId: input.tenantId,
      reference,
      type: ReservationType.RENTACAR,
      status: ReservationStatus.PENDING,
      customerName: `${personalInfo.firstName} ${personalInfo.lastName}`,
      customerEmail: personalInfo.email,
      customerPhone: `${personalInfo.phoneCountryCode}${personalInfo.phoneNumber}`,
      customerLanguageId: resolvedLanguageId ?? undefined,
      checkIn: pickupDate,
      checkOut: dropoffDate,
      metadata,
      bookingSourceSite: normalizeBookingSourceSite(input.bookingSourceSite),
    });

    const savedReservation = await this.reservationRepo().save(reservation);

    // Redeem discount code after reservation is created (global discount-codes)
    if (discountCodeDiscount) {
      try {
        const { TransferDiscountCodeService } = await import('../../transfer/services/transfer-discount-code.service');
        await TransferDiscountCodeService.redeem({
          tenantId: input.tenantId,
          code: discountCodeDiscount.code,
          orderTotal: totalAfterCampaign,
          customerEmail: personalInfo.email,
          transferRequestId: savedReservation.id, // Link usage to this reservation (reused field for rentacar)
        });
      } catch (err) {
        console.error('Error redeeming discount code after rentacar reservation:', err);
        // Reservation already created; discount was validated earlier
      }
    }

    // Send confirmation email (async, don't wait)
    sendReservationEmail(savedReservation, EmailTemplateType.RESERVATION_CONFIRMATION).catch(
      (error) => {
        console.error(`Error sending confirmation email for reservation ${savedReservation.id}:`, error);
      }
    );

    notifyTenantPanelRefresh(savedReservation.tenantId, { reason: 'reservation' });
    return savedReservation;
  }

  // ── Reservation assignment helper ────────────────────────────────────────────
  private static assignmentRepo(): Repository<VehicleReservationAssignment> {
    return AppDataSource.getRepository(VehicleReservationAssignment);
  }

  /**
   * Admin: Approve a PENDING reservation → CONFIRMED + send confirmation email with voucher
   */
  static async approve(id: string, tenantId: string): Promise<Reservation> {
    const repo = this.reservationRepo();
    const reservation = await repo.findOne({ where: { id, tenantId }, relations: ['customerLanguage'] });

    if (!reservation) throw new Error('Reservation not found');
    if (reservation.status !== ReservationStatus.PENDING) {
      throw new Error('Yalnızca bekleyen rezervasyonlar onaylanabilir');
    }

    reservation.status = ReservationStatus.CONFIRMED;
    const saved = await repo.save(reservation);

    // Send confirmation email with PDF voucher (async)
    sendReservationEmail(saved, EmailTemplateType.RESERVATION_CONFIRMED).catch((err) =>
      console.error(`Approval email error for ${saved.id}:`, err)
    );

    notifyTenantPanelRefresh(tenantId, { reason: 'reservation' });
    return saved;
  }

  /**
   * Admin: Reject a PENDING reservation → REJECTED + send rejection email
   */
  static async reject(id: string, tenantId: string, reason?: string): Promise<Reservation> {
    const repo = this.reservationRepo();
    const reservation = await repo.findOne({ where: { id, tenantId }, relations: ['customerLanguage'] });

    if (!reservation) throw new Error('Reservation not found');
    if (reservation.status !== ReservationStatus.PENDING) {
      throw new Error('Yalnızca bekleyen rezervasyonlar reddedilebilir');
    }

    reservation.status = ReservationStatus.REJECTED;
    if (reason) reservation.notes = reason;
    const saved = await repo.save(reservation);

    // Send rejection email (async)
    sendReservationEmail(saved, EmailTemplateType.RESERVATION_REJECTED).catch((err) =>
      console.error(`Rejection email error for ${saved.id}:`, err)
    );

    notifyTenantPanelRefresh(tenantId, { reason: 'reservation' });
    return saved;
  }

  /**
   * Admin or customer: Cancel a reservation
   * - PENDING: can always cancel
   * - CONFIRMED: only if >24 hours before checkIn
   * - REJECTED / CANCELLED / COMPLETED: cannot cancel
   * On cancel: free plate assignments
   */
  static async cancel(id: string, tenantId: string): Promise<Reservation> {
    const repo = this.reservationRepo();
    const reservation = await repo.findOne({ where: { id, tenantId }, relations: ['customerLanguage'] });

    if (!reservation) throw new Error('Reservation not found');

    if (reservation.status === ReservationStatus.CANCELLED) {
      throw new Error('Rezervasyon zaten iptal edilmiş');
    }
    if (reservation.status === ReservationStatus.REJECTED) {
      throw new Error('Reddedilen rezervasyonlar iptal edilemez');
    }
    if (reservation.status === ReservationStatus.COMPLETED) {
      throw new Error('Tamamlanan rezervasyonlar iptal edilemez');
    }

    // 24-hour rule for confirmed reservations
    if (reservation.status === ReservationStatus.CONFIRMED && reservation.checkIn) {
      const hoursUntilPickup = (new Date(reservation.checkIn).getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntilPickup < 24) {
        throw new Error('Onaylanmış rezervasyonlar alış saatinden en az 24 saat önce iptal edilebilir');
      }
    }

    reservation.status = ReservationStatus.CANCELLED;
    const saved = await repo.save(reservation);

    // Free plate assignments
    await this.assignmentRepo().delete({ reservationId: id });

    // Send cancellation email (async)
    sendReservationEmail(saved, EmailTemplateType.RESERVATION_CANCELLED).catch((err) =>
      console.error(`Cancellation email error for ${saved.id}:`, err)
    );

    notifyTenantPanelRefresh(tenantId, { reason: 'reservation' });
    return saved;
  }

  /**
   * Get notification data:
   * - New reservations (PENDING, created in last 10 minutes)
   * - Upcoming departures (CONFIRMED, checkIn within next 4 hours)
   */
  static async getNotifications(tenantId: string): Promise<{
    newReservations: Reservation[];
    upcomingDepartures: Reservation[];
  }> {
    const repo = this.reservationRepo();

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const now = new Date();
    const fourHoursLater = new Date(Date.now() + 4 * 60 * 60 * 1000);

    const [newReservations, upcomingDepartures] = await Promise.all([
      repo.find({
        where: { tenantId, type: ReservationType.RENTACAR, status: ReservationStatus.PENDING },
        order: { createdAt: 'DESC' },
      }).then(list => list.filter(r => new Date((r as any).createdAt) >= tenMinutesAgo)),

      repo.find({
        where: {
          tenantId,
          type: ReservationType.RENTACAR,
          status: ReservationStatus.CONFIRMED,
        },
        order: { checkIn: 'ASC' },
      }).then(list =>
        list.filter(r => r.checkIn && new Date(r.checkIn) >= now && new Date(r.checkIn) <= fourHoursLater)
      ),
    ]);

    return { newReservations, upcomingDepartures };
  }

  /**
   * Update rentacar reservation with price recalculation
   */
  static async updateReservation(
    id: string,
    tenantId: string,
    input: Partial<CreateRentacarReservationInput> & { recalculatePrice?: boolean }
  ): Promise<Reservation> {
    const reservation = await this.reservationRepo().findOne({
      where: { id, tenantId },
      relations: ['customerLanguage'],
    });

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    if (reservation.type !== ReservationType.RENTACAR) {
      throw new Error('Reservation is not a rentacar reservation');
    }

    // If recalculatePrice is true, recalculate all prices
    if (input.recalculatePrice) {
      // Get current metadata or use input data
      const currentMetadata = reservation.metadata as any;
      const vehicleId = input.vehicleId || currentMetadata?.vehicleId;
      const pickupLocationId = input.pickupLocationId || currentMetadata?.pickupLocationId;
      const dropoffLocationId = input.dropoffLocationId || currentMetadata?.dropoffLocationId;
      const pickupDate = input.pickupDate || (reservation.checkIn ? new Date(reservation.checkIn).toISOString().split('T')[0] : '');
      const dropoffDate = input.dropoffDate || (reservation.checkOut ? new Date(reservation.checkOut).toISOString().split('T')[0] : '');
      const pickupTime = input.pickupTime || (reservation.checkIn ? `${String(new Date(reservation.checkIn).getHours()).padStart(2, '0')}:${String(new Date(reservation.checkIn).getMinutes()).padStart(2, '0')}` : '09:00');
      const dropoffTime = input.dropoffTime || (reservation.checkOut ? `${String(new Date(reservation.checkOut).getHours()).padStart(2, '0')}:${String(new Date(reservation.checkOut).getMinutes()).padStart(2, '0')}` : '09:00');
      const currencyCode = input.currencyCode || currentMetadata?.currencyCode || 'TRY';

      if (!vehicleId || !pickupLocationId || !dropoffLocationId || !pickupDate || !dropoffDate) {
        throw new Error('Missing required fields for price recalculation');
      }

      // Use VehicleService to search and get pricing
      const { VehicleService } = await import('./vehicle.service');
      const searchResult = await VehicleService.searchVehicles({
        tenantId,
        pickupLocationId,
        dropoffLocationId,
        pickupDate,
        dropoffDate,
        pickupTime,
        dropoffTime,
      });

      const vehicle = searchResult.vehicles.find(v => v.id === vehicleId);
      if (!vehicle) {
        throw new Error('Vehicle not found or not available for the selected dates');
      }

      // Extract campaign discount from search result (campaignDiscount is added in VehicleService.searchVehicles)
      const campaignDiscount = (vehicle as any).campaignDiscount || null;

      // Calculate rental days
      const pickup = new Date(pickupDate);
      const dropoff = new Date(dropoffDate);
      const rentalDays = Math.ceil((dropoff.getTime() - pickup.getTime()) / (1000 * 60 * 60 * 24));

      // Calculate extras price
      const extraIds = input.extras?.map(e => e.id) || currentMetadata?.extras?.map((e: any) => e.id) || [];
      const extras = await this.extraRepo().find({
        where: { id: In(extraIds), tenantId },
      });

      let extrasPrice = 0;
      extras.forEach(extra => {
        const quantity = input.extras?.find(e => e.id === extra.id)?.quantity || 
                        currentMetadata?.extras?.find((e: any) => e.id === extra.id)?.quantity || 1;
        const salesType = extra.salesType?.toLowerCase() || 'per_rental';
        if (salesType === 'daily') {
          extrasPrice += Number(extra.price) * rentalDays * quantity;
        } else {
          extrasPrice += Number(extra.price) * quantity;
        }
      });

      // Get delivery and drop fees from locations
      const pickupLocation = await this.locationRepo().findOne({
        where: { id: pickupLocationId, tenantId },
        relations: ['location'],
      });
      const dropoffLocation = await this.locationRepo().findOne({
        where: { id: dropoffLocationId, tenantId },
        relations: ['location'],
      });

      let deliveryFee = 0;
      let dropFee = 0;

      if (pickupLocation) {
        // Check if master location has a parent
        if (pickupLocation.location?.parentId) {
          // Find rentacar location by master location parent ID
          const parentRentacarLocation = await this.locationRepo().findOne({
            where: { locationId: pickupLocation.location.parentId, tenantId },
            relations: ['location'],
          });
          deliveryFee = Number(parentRentacarLocation?.deliveryFee || 0);
        } else {
          deliveryFee = Number(pickupLocation.deliveryFee || 0);
        }
      }

      if (dropoffLocation && pickupLocationId !== dropoffLocationId) {
        // Check if master location has a parent
        if (dropoffLocation.location?.parentId) {
          // Find rentacar location by master location parent ID
          const parentRentacarLocation = await this.locationRepo().findOne({
            where: { locationId: dropoffLocation.location.parentId, tenantId },
            relations: ['location'],
          });
          dropFee = Number(parentRentacarLocation?.dropFee || 0);
        } else {
          dropFee = Number(dropoffLocation.dropFee || 0);
        }
      }

      // Calculate total price
      // Note: vehicle.totalPrice already includes campaign discount (from searchVehicles)
      const vehiclePrice = vehicle.totalPrice;
      const baseVehiclePrice = vehiclePrice + (campaignDiscount ? campaignDiscount.discountAmount : 0);
      const totalPrice = vehiclePrice + extrasPrice + deliveryFee + dropFee;

      // Update metadata with new prices
      const updatedMetadata = {
        ...currentMetadata,
        vehicleId,
        vehicleName: formatRentacarVehicleDisplayName(vehicle),
        pickupLocationId,
        pickupLocationName: pickupLocation?.location?.name || currentMetadata?.pickupLocationName,
        dropoffLocationId,
        dropoffLocationName: dropoffLocation?.location?.name || currentMetadata?.dropoffLocationName,
        rentalDays,
        extras: extras.map(extra => {
          const quantity = input.extras?.find(e => e.id === extra.id)?.quantity || 
                          currentMetadata?.extras?.find((e: any) => e.id === extra.id)?.quantity || 1;
          return {
            id: extra.id,
            name: extra.name,
            quantity,
            price: extra.price,
          };
        }),
        vehiclePrice, // Price after campaign discount
        baseVehiclePrice: baseVehiclePrice, // Original price before discount
        extrasPrice,
        totalPrice,
        currencyCode,
        deliveryFee,
        dropFee,
        dailyPrice: vehicle.dailyPrice,
        source: (input as any).source || currentMetadata?.source,
        campaignDiscount: campaignDiscount ? {
          campaignId: campaignDiscount.campaignId,
          campaignName: campaignDiscount.campaignName,
          discountType: 'percentage', // From campaignDiscount.discountType if available
          discountPercent: campaignDiscount.discountPercent,
          discountAmount: campaignDiscount.discountAmount,
        } : null,
      };

      // Update checkIn and checkOut dates
      const [pickupHours, pickupMinutes] = pickupTime.split(':').map(Number);
      const [dropoffHours, dropoffMinutes] = dropoffTime.split(':').map(Number);
      
      const pickupDateTime = new Date(pickupDate);
      pickupDateTime.setHours(pickupHours, pickupMinutes, 0, 0);
      
      const dropoffDateTime = new Date(dropoffDate);
      dropoffDateTime.setHours(dropoffHours, dropoffMinutes, 0, 0);

      reservation.metadata = updatedMetadata;
      reservation.checkIn = pickupDateTime;
      reservation.checkOut = dropoffDateTime;

      // Update other fields if provided
      if (input.paymentMethod) {
        (updatedMetadata as any).paymentMethod = input.paymentMethod;
      }
    } else {
      // Normal update without price recalculation
      if (input.pickupDate && input.pickupTime) {
        const [hours, minutes] = input.pickupTime.split(':').map(Number);
        const pickupDate = new Date(input.pickupDate);
        pickupDate.setHours(hours, minutes, 0, 0);
        reservation.checkIn = pickupDate;
      }
      if (input.dropoffDate && input.dropoffTime) {
        const [hours, minutes] = input.dropoffTime.split(':').map(Number);
        const dropoffDate = new Date(input.dropoffDate);
        dropoffDate.setHours(hours, minutes, 0, 0);
        reservation.checkOut = dropoffDate;
      }
      if ((input as any).metadata) {
        reservation.metadata = { ...(reservation.metadata as any), ...(input as any).metadata };
      }
    }

    const saved = await this.reservationRepo().save(reservation);
    notifyTenantPanelRefresh(tenantId, { reason: 'reservation' });
    return saved;
  }
}

