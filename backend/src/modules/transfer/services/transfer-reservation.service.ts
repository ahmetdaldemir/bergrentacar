import { Repository, Like, MoreThanOrEqual, LessThanOrEqual, Brackets } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { TransferReservation, TransferReservationStatus } from '../entities/transfer-reservation.entity';
import { TransferPricingService } from './transfer-pricing.service';
import { CustomerService } from '../../shared/services/customer.service';
import { TenantSettingsService } from '../../shared/services/tenant-settings.service';
import { GoogleMapsService } from '../../../services/google-maps.service';
import { ValidationError, NotFoundError } from '../../../utils/errors';
import { FinancePaymentMethod } from '../../finance/entities/finance-transaction.entity';
import { TransferStripeDriverService } from './transfer-stripe-driver.service';
import { TransferRoute } from '../entities/transfer-route.entity';
import { CurrencyService } from '../../shared/services/currency.service';
import { VehicleTrackingService } from '../../rentacar/services/vehicle-tracking.service';

export type CreateTransferReservationInput = {
  tenantId: string;
  routeId?: string; // Optional for backward compatibility
  vehicleId: string;
  driverId?: string;
  passengerName: string;
  passengerEmail: string;
  passengerPhone: string;
  passengerCount: number;
  luggageCount?: number;
  transferDate: string; // ISO date string
  transferTime: string; // HH:mm
  pickupAddress?: string;
  dropoffAddress?: string;
  pickupPlaceName?: string;
  dropoffPlaceName?: string;
  // Google Maps place IDs (new method)
  pickupPlaceId?: string;
  dropoffPlaceId?: string;
  pickupLat?: string;
  pickupLng?: string;
  dropoffLat?: string;
  dropoffLng?: string;
  flightNumber?: string;
  flightArrivalTime?: string;
  flightDepartureTime?: string;
  isRoundTrip?: boolean;
  extraServices?: Record<string, any>;
  notes?: string;
  customerNotes?: string;
};

export type UpdateTransferReservationInput = Partial<CreateTransferReservationInput> & {
  status?: TransferReservationStatus;
  driverId?: string | null;
  paymentStatus?: string;
  paymentMethod?: string;
  /** pending | office | driver */
  paymentCollectionBy?: string;
};

export type TransferReservationFilters = {
  tenantId: string;
  status?: TransferReservationStatus;
  vehicleId?: string;
  routeId?: string;
  driverId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type TransferReservationSearchFilters = {
  tenantId: string;
  search?: string; // Search in passenger name, email, phone, reference, flight number
  status?: TransferReservationStatus;
  vehicleId?: string;
  /** transfer_vehicles.type — vip | shuttle | premium | luxury */
  vehicleType?: string;
  routeId?: string;
  driverId?: string;
  dateFrom?: string;
  dateTo?: string;
  isRoundTrip?: boolean;
  paymentStatus?: string;
  page?: number;
  limit?: number;
  sortBy?: 'transferDate' | 'createdAt' | 'totalPrice' | 'reference';
  sortOrder?: 'ASC' | 'DESC';
};

export type TransferReservationSearchResult = {
  data: TransferReservation[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export class TransferReservationService {
  private static reservationRepo(): Repository<TransferReservation> {
    return AppDataSource.getRepository(TransferReservation);
  }

  /**
   * Generate unique reservation reference (TRF-YYYY-XXXXX)
   */
  private static async generateReference(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.reservationRepo().count({
      where: {
        reference: Like(`TRF-${year}-%`),
      },
    });
    const sequence = String(count + 1).padStart(5, '0');
    return `TRF-${year}-${sequence}`;
  }

  static async list(filters: TransferReservationFilters): Promise<TransferReservation[]> {
    const where: any = { tenantId: filters.tenantId };

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.vehicleId) {
      where.vehicleId = filters.vehicleId;
    }
    if (filters.routeId) {
      where.routeId = filters.routeId;
    }
    if (filters.driverId) {
      where.driverId = filters.driverId;
    }
    if (filters.dateFrom || filters.dateTo) {
      where.transferDate = {};
      if (filters.dateFrom) {
        where.transferDate = MoreThanOrEqual(new Date(filters.dateFrom));
      }
      if (filters.dateTo) {
        where.transferDate = LessThanOrEqual(new Date(filters.dateTo));
      }
    }

    return this.reservationRepo().find({
      where,
      relations: ['vehicle', 'returnVehicle', 'route', 'route.points', 'driver'],
      order: { transferDate: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Advanced search with pagination and sorting
   */
  static async search(filters: TransferReservationSearchFilters): Promise<TransferReservationSearchResult> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filters.sortBy ?? 'transferDate';
    const sortOrder = filters.sortOrder ?? 'DESC';

    const queryBuilder = this.reservationRepo()
      .createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.vehicle', 'vehicle')
      .leftJoinAndSelect('reservation.route', 'route')
      .leftJoinAndSelect('route.points', 'points')
      .leftJoinAndSelect('reservation.driver', 'driver')
      .where('reservation.tenantId = :tenantId', { tenantId: filters.tenantId });

    // Text search in multiple fields
    if (filters.search) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('LOWER(reservation.passengerName) LIKE LOWER(:search)', {
            search: `%${filters.search}%`,
          })
            .orWhere('LOWER(reservation.passengerEmail) LIKE LOWER(:search)', {
              search: `%${filters.search}%`,
            })
            .orWhere('LOWER(reservation.passengerPhone) LIKE LOWER(:search)', {
              search: `%${filters.search}%`,
            })
            .orWhere('LOWER(reservation.reference) LIKE LOWER(:search)', {
              search: `%${filters.search}%`,
            })
            .orWhere('LOWER(reservation.flightNumber) LIKE LOWER(:search)', {
              search: `%${filters.search}%`,
            });
        })
      );
    }

    // Status filter
    if (filters.status) {
      queryBuilder.andWhere('reservation.status = :status', { status: filters.status });
    }

    // Vehicle filter
    if (filters.vehicleId) {
      queryBuilder.andWhere('reservation.vehicleId = :vehicleId', { vehicleId: filters.vehicleId });
    }

    if (filters.vehicleType) {
      queryBuilder.andWhere('vehicle.type = :vehicleType', { vehicleType: filters.vehicleType });
    }

    // Route filter
    if (filters.routeId) {
      queryBuilder.andWhere('reservation.routeId = :routeId', { routeId: filters.routeId });
    }

    // Driver filter
    if (filters.driverId) {
      queryBuilder.andWhere('reservation.driverId = :driverId', { driverId: filters.driverId });
    }

    // Date range filter
    if (filters.dateFrom) {
      queryBuilder.andWhere('reservation.transferDate >= :dateFrom', {
        dateFrom: new Date(filters.dateFrom),
      });
    }
    if (filters.dateTo) {
      queryBuilder.andWhere('reservation.transferDate <= :dateTo', {
        dateTo: new Date(filters.dateTo),
      });
    }

    // Round trip filter
    if (filters.isRoundTrip !== undefined) {
      queryBuilder.andWhere('reservation.isRoundTrip = :isRoundTrip', {
        isRoundTrip: filters.isRoundTrip,
      });
    }

    // Payment status filter
    if (filters.paymentStatus) {
      queryBuilder.andWhere('reservation.paymentStatus = :paymentStatus', {
        paymentStatus: filters.paymentStatus,
      });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply sorting
    queryBuilder.orderBy(`reservation.${sortBy}`, sortOrder);

    // Apply pagination
    queryBuilder.skip(skip).take(limit);

    // Execute query
    const data = await queryBuilder.getMany();

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getById(id: string, tenantId: string): Promise<TransferReservation | null> {
    return this.reservationRepo().findOne({
      where: { id, tenantId },
      relations: ['vehicle', 'returnVehicle', 'route', 'route.points', 'driver'],
    });
  }

  static async getByReference(reference: string, tenantId: string): Promise<TransferReservation | null> {
    return this.reservationRepo().findOne({
      where: { reference, tenantId },
      relations: ['vehicle', 'returnVehicle', 'route', 'route.points', 'driver'],
    });
  }

  static async create(input: CreateTransferReservationInput): Promise<TransferReservation> {
    // Check if it's night rate (22:00 - 06:00)
    const [hours] = input.transferTime.split(':').map(Number);
    const isNightRate = hours >= 22 || hours < 6;

    // Get route to get distance (only if routeId is provided - legacy support)
    let route: any = null;
    if (input.routeId) {
      route = await AppDataSource.getRepository(require('../entities/transfer-route.entity').TransferRoute).findOne({
        where: { id: input.routeId },
      });

      if (!route) {
        throw new Error('Route not found');
      }
    }

    // Check if this is a popular route with fixed price
    // First try with pickup/dropoff place IDs (new method)
    const { TransferPopularRouteService } = await import('./transfer-popular-route.service');
    let popularRoutePrice: { price: number; currencyCode: string; isFixed: boolean } | null = null;
    
    if (input.pickupPlaceId && input.dropoffPlaceId) {
      try {
        popularRoutePrice = await TransferPopularRouteService.getPrice(
          input.pickupPlaceId,
          input.dropoffPlaceId,
          input.vehicleId,
          input.tenantId,
          input.passengerCount
        );
      } catch (error) {
        // If not found, try legacy method with routeId
        if (input.routeId) {
          const legacyPrice = await TransferPopularRouteService.getFixedPrice(
            input.routeId,
            input.vehicleId,
            input.tenantId
          );
          if (legacyPrice) {
            popularRoutePrice = {
              price: legacyPrice.fixedPrice,
              currencyCode: legacyPrice.currencyCode,
              isFixed: true,
            };
          }
        }
      }
    } else if (input.routeId) {
      // Legacy method
      const legacyPrice = await TransferPopularRouteService.getFixedPrice(
        input.routeId,
        input.vehicleId,
        input.tenantId
      );
      if (legacyPrice) {
        popularRoutePrice = {
          price: legacyPrice.fixedPrice,
          currencyCode: legacyPrice.currencyCode,
          isFixed: true,
        };
      }
    }

    let basePrice: number;
    let extraServicePrice: number;
    let totalPrice: number;
    let currencyCode: string;

    if (popularRoutePrice) {
      // Use price from popular route (fixed or calculated)
      basePrice = popularRoutePrice.price;
      extraServicePrice = 0; // Popular routes don't support extra services pricing (can be added later)
      totalPrice = popularRoutePrice.price;
      currencyCode = popularRoutePrice.currencyCode;
    } else {
      // Use dynamic pricing (distance-based)
      // If route exists, use route distance, otherwise calculate from Google Maps
      let distanceKm: number;
      
      if (route && route.distance) {
        distanceKm = Number(route.distance);
      } else if (input.pickupLat && input.pickupLng && input.dropoffLat && input.dropoffLng) {
        const mapsKey = await TenantSettingsService.requireGoogleMapsApiKey(input.tenantId);
        const distanceResult = await GoogleMapsService.calculateDistance(
          { lat: parseFloat(input.pickupLat), lng: parseFloat(input.pickupLng) },
          { lat: parseFloat(input.dropoffLat), lng: parseFloat(input.dropoffLng) },
          { apiKey: mapsKey },
        );
        distanceKm = Math.round(distanceResult.distanceMeters / 1000);
      } else {
        throw new Error('Route distance not set and Google Maps coordinates not provided. Please provide routeId with distance or pickup/dropoff coordinates.');
      }

      const priceBreakdown = await TransferPricingService.calculatePrice({
        tenantId: input.tenantId,
        vehicleId: input.vehicleId,
        distanceKm,
        passengerCount: input.passengerCount,
        extraServices: input.extraServices,
      });

      basePrice = priceBreakdown.baseCalculation;
      extraServicePrice = priceBreakdown.extraServicePrice;
      totalPrice = priceBreakdown.totalPrice;
      currencyCode = priceBreakdown.currencyCode;
    }

    const reference = await this.generateReference();

    const reservation = this.reservationRepo().create({
      ...input,
      reference,
      status: TransferReservationStatus.PENDING,
      luggageCount: input.luggageCount ?? 0,
      basePrice,
      extraServicePrice,
      totalPrice,
      currencyCode,
      isRoundTrip: input.isRoundTrip ?? false,
      isNightRate,
      extraServices: input.extraServices,
      paymentStatus: 'pending',
      transferDate: new Date(input.transferDate),
      flightArrivalTime: input.flightArrivalTime ? new Date(input.flightArrivalTime) : undefined,
      flightDepartureTime: input.flightDepartureTime ? new Date(input.flightDepartureTime) : undefined,
    });

    const saved = await this.reservationRepo().save(reservation);

    try {
      await CustomerService.ensureCustomerFromTransferBooking({
        tenantId: input.tenantId,
        email: input.passengerEmail,
        passengerName: input.passengerName,
        passengerPhone: input.passengerPhone,
      });
    } catch (err) {
      console.error('TransferReservationService.create: ensure customer failed:', err);
    }

    return saved;
  }

  static async update(id: string, tenantId: string, input: UpdateTransferReservationInput): Promise<TransferReservation> {
    const reservation = await this.getById(id, tenantId);
    if (!reservation) {
      throw new Error('Transfer reservation not found');
    }

    // If route, vehicle, or passenger count changed, recalculate price
    if (input.routeId || input.vehicleId || input.passengerCount || input.isRoundTrip !== undefined || input.extraServices) {
      const routeId = input.routeId ?? reservation.routeId;
      const vehicleId = input.vehicleId ?? reservation.vehicleId;
      const passengerCount = input.passengerCount ?? reservation.passengerCount;
      const isRoundTrip = input.isRoundTrip ?? reservation.isRoundTrip;
      const extraServices = input.extraServices ?? reservation.extraServices;

      const transferTime = input.transferTime ?? reservation.transferTime;
      const [hours] = transferTime.split(':').map(Number);
      const isNightRate = hours >= 22 || hours < 6;

      const pickupLat = input.pickupLat ?? reservation.pickupLat;
      const pickupLng = input.pickupLng ?? reservation.pickupLng;
      const dropoffLat = input.dropoffLat ?? reservation.dropoffLat;
      const dropoffLng = input.dropoffLng ?? reservation.dropoffLng;

      let distanceKm: number;
      if (routeId) {
        const route = await AppDataSource.getRepository(TransferRoute).findOne({
          where: { id: routeId },
        });
        if (!route?.distance) {
          throw new ValidationError('Güzergah bulunamadı veya mesafe tanımlı değil');
        }
        distanceKm = Number(route.distance);
      } else {
        const stored = reservation.distanceKm != null ? Number(reservation.distanceKm) : NaN;
        if (Number.isFinite(stored) && stored > 0) {
          distanceKm = stored;
        } else if (pickupLat && pickupLng && dropoffLat && dropoffLng) {
          const mapsKey = await TenantSettingsService.getGoogleMapsApiKey(tenantId);
          if (!mapsKey) {
            throw new ValidationError('Mesafe hesabı için Google Maps API anahtarı gerekli (ayarlar)');
          }
          const dr = await GoogleMapsService.calculateDistanceCoordsWithFallback(
            { lat: parseFloat(pickupLat), lng: parseFloat(pickupLng) },
            { lat: parseFloat(dropoffLat), lng: parseFloat(dropoffLng) },
            { apiKey: mapsKey }
          );
          distanceKm = Math.max(1, Math.round(dr.distanceMeters / 1000));
        } else {
          throw new ValidationError(
            'Bu rezervasyonda güzergah yok; koordinat/mesafe olmadan araç veya yolcu değişikliğinde fiyat güncellenemez'
          );
        }
      }

      const priceBreakdown = await TransferPricingService.calculatePrice({
        tenantId,
        vehicleId,
        distanceKm,
        passengerCount,
        extraServices,
      });

      Object.assign(reservation, {
        ...input,
        basePrice: priceBreakdown.baseCalculation,
        extraServicePrice: priceBreakdown.extraServicePrice,
        totalPrice: priceBreakdown.totalPrice,
        isNightRate,
        distanceKm,
      });
    } else {
      Object.assign(reservation, input);
    }

    // Handle date updates
    if (input.transferDate) {
      reservation.transferDate = new Date(input.transferDate);
    }
    if (input.flightArrivalTime) {
      reservation.flightArrivalTime = new Date(input.flightArrivalTime);
    }
    if (input.flightDepartureTime) {
      reservation.flightDepartureTime = new Date(input.flightDepartureTime);
    }

    return this.reservationRepo().save(reservation);
  }

  static async updateStatus(
    id: string,
    tenantId: string,
    status: TransferReservationStatus
  ): Promise<TransferReservation> {
    const reservation = await this.getById(id, tenantId);
    if (!reservation) {
      throw new Error('Transfer reservation not found');
    }

    const oldStatus = reservation.status;
    reservation.status = status;
    const updatedReservation = await this.reservationRepo().save(reservation);

    // Muhasebe kaydı (asenkron, ana işlemi bloklama)
    if (oldStatus !== status) {
      import('../../finance/services/reservation-finance.service')
        .then(({ ReservationFinanceService }) =>
          ReservationFinanceService.recordForTransferReservation(updatedReservation)
        )
        .catch((err) => console.error('ReservationFinanceService (transfer) error:', err));
    }

    // Email gönder (durum değişikliğinde)
    if (oldStatus !== status && reservation.passengerEmail) {
      try {
        const { sendTransferReservationEmail } = await import('../../../services/transfer-email.service');
        const { EmailTemplateType } = await import('../../shared/entities/email-template.entity');
        
        let templateType = EmailTemplateType.RESERVATION_CONFIRMATION;
        if (status === TransferReservationStatus.CANCELLED) {
          templateType = EmailTemplateType.RESERVATION_CANCELLED;
        } else if (status === TransferReservationStatus.COMPLETED) {
          templateType = EmailTemplateType.RESERVATION_COMPLETED;
        } else if (status === TransferReservationStatus.CONFIRMED) {
          templateType = EmailTemplateType.RESERVATION_CONFIRMATION;
        }

        // Reload with relations for email
        const reservationWithRelations = await this.reservationRepo().findOne({
          where: { id: updatedReservation.id },
          relations: ['vehicle'],
        });

        if (reservationWithRelations) {
          await sendTransferReservationEmail(reservationWithRelations, templateType);
        }
      } catch (error) {
        console.error('Failed to send transfer reservation status email:', error);
        // Email hatası rezervasyon güncellemesini engellemez
      }
    }

    return updatedReservation;
  }

  /**
   * Assign driver to reservation and send notifications
   */
  static async assignDriver(
    id: string,
    tenantId: string,
    driverId: string | null
  ): Promise<TransferReservation> {
    const reservation = await this.getById(id, tenantId);
    if (!reservation) {
      throw new Error('Transfer reservation not found');
    }

    const oldDriverId = reservation.driverId;
    reservation.driverId = driverId;

    // Load driver if assigned
    let driver = null;
    if (driverId) {
      const { TransferDriverService } = await import('./transfer-driver.service');
      driver = await TransferDriverService.getById(driverId, tenantId);
      if (!driver) {
        throw new Error('Transfer driver not found');
      }
    }

    const updatedReservation = await this.reservationRepo().save(reservation);

    // Send notifications to driver if assigned
    if (driverId && driver && oldDriverId !== driverId) {
      try {
        const { sendDriverAssignmentNotifications } = await import('../../../services/transfer-driver-notification.service');
        await sendDriverAssignmentNotifications(updatedReservation, driver);
      } catch (error) {
        console.error('Failed to send driver assignment notifications:', error);
        // Notification hatası atamayı engellemez
      }
    }

    return updatedReservation;
  }

  static async assignVehicle(id: string, tenantId: string, vehicleId: string): Promise<TransferReservation> {
    return this.update(id, tenantId, { vehicleId });
  }

  private static readonly DRIVER_MONEY_EPS = 0.02;

  private static roundMoney(n: number): number {
    return Math.round(n * 100) / 100;
  }

  private static async computeDriverCollectionDelta(
    reservation: TransferReservation,
    inputAmount: number,
    inputCurrencyCode: string
  ): Promise<{ converted: number; remaining: number; total: number; collected: number }> {
    const total = this.roundMoney(Number(reservation.totalPrice));
    const collected = this.roundMoney(Number(reservation.driverCashCollectedTotal ?? 0));
    const resCur = (reservation.currencyCode || 'EUR').slice(0, 3);
    const currency = (inputCurrencyCode || resCur).slice(0, 3);
    const converted = await CurrencyService.convertAmount(inputAmount, currency, resCur);
    const remaining = this.roundMoney(total - collected);
    return { converted, remaining, total, collected };
  }

  private static assertDriverCollectionAllowed(
    reservation: TransferReservation,
    converted: number,
    remaining: number
  ): void {
    if (remaining <= this.DRIVER_MONEY_EPS) {
      throw new ValidationError('Bu rezervasyon için tahsilat tutarı tamamlanmıştır.');
    }
    if (reservation.paymentCollectionBy === 'office') {
      throw new ValidationError('Bu rezervasyon ofis tahsilatı ile tanımlı.');
    }
    if (
      reservation.paymentStatus === 'paid' &&
      reservation.paymentCollectionBy !== 'driver' &&
      reservation.paymentCollectionBy !== 'pending'
    ) {
      throw new ValidationError('Bu rezervasyon ofis/online ödeme ile tamamlanmış; şoför tahsilatı yapılamaz.');
    }
    if (converted > remaining + this.DRIVER_MONEY_EPS) {
      const cur = reservation.currencyCode || 'EUR';
      throw new ValidationError(
        `En fazla ${remaining.toFixed(2)} ${cur} tahsil edilebilir (kalan tutar). Kur ile rezervasyon para birimine çevrildiğinde girilen tutar ${this.roundMoney(converted).toFixed(2)} ${cur} oluyor.`
      );
    }
  }

  /**
   * Stripe PaymentIntent tutarı, kalan tahsilatı aşmamalı (kur çevrimi rezervasyon para biriminde).
   */
  static async assertDriverPaymentAmountWithinRemaining(
    tenantId: string,
    reservationId: string,
    amount: number,
    currencyCode: string
  ): Promise<void> {
    const reservation = await this.getById(reservationId, tenantId);
    if (!reservation) throw new NotFoundError('Transfer reservation', reservationId);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ValidationError('Geçerli bir tutar girin');
    }
    const currency = (currencyCode || reservation.currencyCode || 'TRY').slice(0, 3);
    const delta = await this.computeDriverCollectionDelta(reservation, amount, currency);
    this.assertDriverCollectionAllowed(reservation, delta.converted, delta.remaining);
  }

  /** Nakit / havale / fiziki kart — şoför tahsilat kaydı */
  static async confirmDriverPayment(
    id: string,
    tenantId: string,
    input: { amount: number; currencyCode: string; paymentMethod: 'cash' | 'bank_transfer' | 'credit_card' }
  ): Promise<TransferReservation> {
    const reservation = await this.getById(id, tenantId);
    if (!reservation) throw new NotFoundError('Transfer reservation', id);
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new ValidationError('Geçerli bir tutar girin');
    }
    const currency = (input.currencyCode || reservation.currencyCode || 'TRY').slice(0, 3);
    const delta = await this.computeDriverCollectionDelta(reservation, input.amount, currency);
    this.assertDriverCollectionAllowed(reservation, delta.converted, delta.remaining);

    const newCollected = this.roundMoney(delta.collected + delta.converted);
    const pm = input.paymentMethod;
    reservation.paymentMethod =
      pm === 'bank_transfer' ? 'bank_transfer' : pm === 'credit_card' ? 'credit_card' : 'cash';
    reservation.paymentCollectionBy = 'driver';
    reservation.driverCashConfirmedAt = new Date();
    reservation.driverCashAmount = input.amount;
    reservation.driverCashCurrency = currency;
    reservation.driverCashCollectedTotal = newCollected;
    reservation.paymentStatus =
      newCollected >= delta.total - this.DRIVER_MONEY_EPS ? 'paid' : 'pending';

    await this.reservationRepo().save(reservation);

    const financeMethod =
      pm === 'cash'
        ? FinancePaymentMethod.CASH
        : pm === 'bank_transfer'
          ? FinancePaymentMethod.TRANSFER
          : FinancePaymentMethod.CARD;

    const { ReservationFinanceService } = await import('../../finance/services/reservation-finance.service');
    await ReservationFinanceService.recordDriverPaymentConfirmation(
      reservation,
      input.amount,
      currency,
      financeMethod,
      { convertedInReservationCurrency: delta.converted }
    );
    const reloaded = await this.getById(id, tenantId);
    if (!reloaded) throw new NotFoundError('Transfer reservation', id);
    return reloaded;
  }

  static async confirmDriverCash(
    id: string,
    tenantId: string,
    input: { amount: number; currencyCode: string }
  ): Promise<TransferReservation> {
    return this.confirmDriverPayment(id, tenantId, {
      amount: input.amount,
      currencyCode: input.currencyCode,
      paymentMethod: 'cash',
    });
  }

  /** Stripe başarılı ödeme sonrası tahsilat; tam tahsilatta transfer tamamlandı */
  static async completeDriverStripePayment(
    id: string,
    tenantId: string,
    paymentIntentId: string
  ): Promise<TransferReservation> {
    const { amount, currency } = await TransferStripeDriverService.assertPaymentSucceeded(
      tenantId,
      id,
      paymentIntentId
    );
    const reservation = await this.getById(id, tenantId);
    if (!reservation) throw new NotFoundError('Transfer reservation', id);

    const delta = await this.computeDriverCollectionDelta(reservation, amount, currency);
    this.assertDriverCollectionAllowed(reservation, delta.converted, delta.remaining);

    const newCollected = this.roundMoney(delta.collected + delta.converted);
    reservation.paymentMethod = 'credit_card';
    reservation.paymentCollectionBy = 'driver';
    reservation.driverCashConfirmedAt = new Date();
    reservation.driverCashAmount = amount;
    reservation.driverCashCurrency = currency;
    reservation.driverCashCollectedTotal = newCollected;
    reservation.paymentStatus =
      newCollected >= delta.total - this.DRIVER_MONEY_EPS ? 'paid' : 'pending';

    await this.reservationRepo().save(reservation);

    const { ReservationFinanceService } = await import('../../finance/services/reservation-finance.service');
    await ReservationFinanceService.recordDriverPaymentConfirmation(
      reservation,
      amount,
      currency,
      FinancePaymentMethod.CARD,
      { convertedInReservationCurrency: delta.converted }
    );

    if (newCollected >= delta.total - this.DRIVER_MONEY_EPS) {
      return this.updateStatus(id, tenantId, TransferReservationStatus.COMPLETED);
    }
    const reloaded = await this.getById(id, tenantId);
    if (!reloaded) throw new NotFoundError('Transfer reservation', id);
    return reloaded;
  }

  static async redirectVehicle(
    fromReservationId: string,
    tenantId: string,
    targetReservationId: string,
    alternateVehicleIdForSource: string
  ): Promise<{ source: TransferReservation; target: TransferReservation }> {
    if (fromReservationId === targetReservationId) {
      throw new ValidationError('Kaynak ve hedef rezervasyon aynı olamaz');
    }
    const source = await this.getById(fromReservationId, tenantId);
    const target = await this.getById(targetReservationId, tenantId);
    if (!source) throw new NotFoundError('Transfer reservation', fromReservationId);
    if (!target) throw new NotFoundError('Transfer reservation', targetReservationId);
    const movingVehicleId = source.vehicleId;
    await this.update(fromReservationId, tenantId, { vehicleId: alternateVehicleIdForSource });
    await this.update(targetReservationId, tenantId, { vehicleId: movingVehicleId });
    const s2 = await this.getById(fromReservationId, tenantId);
    const t2 = await this.getById(targetReservationId, tenantId);
    if (!s2 || !t2) throw new ValidationError('Yönlendirme sonrası güncelleme okunamadı');
    return { source: s2, target: t2 };
  }

  static async delete(id: string, tenantId: string): Promise<void> {
    const reservation = await this.getById(id, tenantId);
    if (!reservation) {
      throw new Error('Transfer reservation not found');
    }
    await this.reservationRepo().remove(reservation);
  }

  /**
   * Atanan transfer aracının Mobilize (tenant vehicleTrackingSystem) üzerinden anlık konumu.
   * Plaka `transfer_vehicles.tracking_plate_number` alanında tutulur (rentacar takibi ile aynı).
   */
  static async getVehicleTrackingForReservation(
    reservationId: string,
    tenantId: string
  ): Promise<TransferReservationVehicleTrackingDto | null> {
    const reservation = await this.getById(reservationId, tenantId);
    if (!reservation) return null;

    if (!reservation.vehicleId || !reservation.vehicle) {
      return {
        status: 'no_vehicle',
        message: 'Rezervasyona araç atanmadı.',
      };
    }

    const plate = reservation.vehicle.trackingPlateNumber?.trim();
    if (!plate) {
      return {
        status: 'no_plate',
        vehicleName: reservation.vehicle.name,
        message:
          'Bu araç için takip plakası tanımlı değil. Transfer Araçları düzenlemesinden Mobilize plakasını girin.',
      };
    }

    const info = await VehicleTrackingService.getVehicleTrackingInfo(tenantId, plate);
    if (!info) {
      return {
        status: 'tracking_unavailable',
        plate,
        vehicleName: reservation.vehicle.name,
        message:
          'Araç takibi yapılandırılmadı veya sağlayıcı yanıt vermedi (Ayarlar → araç takip / Mobilize).',
      };
    }

    const loc = info.location;
    if (
      !loc ||
      typeof loc.latitude !== 'number' ||
      typeof loc.longitude !== 'number' ||
      Number.isNaN(loc.latitude) ||
      Number.isNaN(loc.longitude)
    ) {
      return {
        status: 'no_position',
        plate,
        vehicleName: reservation.vehicle.name,
        message: 'Anlık konum alınamadı veya araç çevrimdışı görünüyor.',
      };
    }

    const ts = loc.timestamp instanceof Date ? loc.timestamp.toISOString() : loc.timestamp ? String(loc.timestamp) : undefined;
    const lastUp =
      info.lastUpdate instanceof Date ? info.lastUpdate.toISOString() : info.lastUpdate ? String(info.lastUpdate) : undefined;

    return {
      status: 'ok',
      plate,
      vehicleName: reservation.vehicle.name,
      tracking: {
        location: {
          latitude: loc.latitude,
          longitude: loc.longitude,
          speed: loc.speed,
          heading: loc.heading,
          timestamp: ts,
          address: loc.address,
        },
        isOnline: info.isOnline,
        lastUpdate: lastUp,
        fuelLevel: info.fuelLevel,
        mileage: info.mileage,
        engineStatus: info.engineStatus,
      },
    };
  }
}

export type TransferReservationVehicleTrackingDto =
  | { status: 'no_vehicle'; message: string }
  | { status: 'no_plate'; vehicleName?: string; message: string }
  | { status: 'tracking_unavailable'; plate: string; vehicleName?: string; message: string }
  | { status: 'no_position'; plate: string; vehicleName?: string; message: string }
  | {
      status: 'ok';
      plate: string;
      vehicleName?: string;
      tracking: {
        location: {
          latitude: number;
          longitude: number;
          speed?: number;
          heading?: number;
          timestamp?: string;
          address?: string;
        };
        isOnline: boolean;
        lastUpdate?: string;
        fuelLevel?: number;
        mileage?: number;
        engineStatus?: 'on' | 'off';
      };
    };

