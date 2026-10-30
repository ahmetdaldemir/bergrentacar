import { Request, Response } from 'express';
import { AppDataSource } from '../../../config/data-source';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { TenantSettingsService } from '../services/tenant-settings.service';
import { ReservationService } from '../services/reservation.service';
import { Reservation, ReservationStatus, ReservationType } from '../entities/reservation.entity';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import {
  asyncHandler,
  sendSuccess,
  ValidationError,
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
} from '../../../utils/errors';
import { TransferReservationService } from '../../transfer/services/transfer-reservation.service';
import type { TransferReservation } from '../../transfer/entities/transfer-reservation.entity';
import { ReservationStripeService } from '../services/reservation-stripe.service';
import { TenantFeaturesService } from '../services/tenant-features.service';
import { VoucherService } from '../../../services/voucher.service';

function transferOutboundIso(r: TransferReservation): string | null {
  if (!r.transferDate) return null;
  const d = new Date(r.transferDate);
  const t = r.transferTime || '00:00';
  const parts = t.split(':').map((x) => parseInt(x, 10));
  const h = Number.isFinite(parts[0]) ? parts[0] : 0;
  const m = Number.isFinite(parts[1]) ? parts[1] : 0;
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

async function withRentacarOperationSummary(
  reservation: Reservation,
  tenantId: string | undefined
): Promise<
  Reservation & {
    reservationId: string;
    rentacarOperationSummary?: { pickupCompleted: boolean; returnCompleted: boolean; pickupOdometerKm: number | null };
  }
> {
  const base = { ...reservation, reservationId: reservation.id };
  if (reservation.type !== ReservationType.RENTACAR || !tenantId || reservation.tenantId !== tenantId) {
    return base;
  }
  const { OperationsService } = await import('../../rentacar/services/operations.service');
  const rentacarOperationSummary = await OperationsService.getRentacarOperationSummary(tenantId, reservation.id);
  return { ...base, rentacarOperationSummary };
}

/** Stripe tahsilatı: tenant token’da tenantId ile rezervasyon eşleşmeli; admin’de tenant rezervasyondan alınır */
async function resolveTenantIdForReservationPayment(
  req: AuthenticatedRequest,
  reservationId: string,
): Promise<string> {
  const fromAuth = req.auth?.tenantId;
  const reservation = await ReservationService.getById(reservationId);
  if (!reservation) throw new NotFoundError('Reservation', reservationId);
  if (fromAuth) {
    if (reservation.tenantId !== fromAuth) {
      throw new ForbiddenError('Bu rezervasyona erişim yok');
    }
    return fromAuth;
  }
  return reservation.tenantId;
}

function transferReturnIso(r: TransferReservation): string | null {
  if (!r.isRoundTrip || !r.returnTransferDate) return null;
  const d = new Date(r.returnTransferDate);
  const t = r.returnTransferTime || '00:00';
  const parts = t.split(':').map((x) => parseInt(x, 10));
  const h = Number.isFinite(parts[0]) ? parts[0] : 0;
  const m = Number.isFinite(parts[1]) ? parts[1] : 0;
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

function shortTransferLocation(name?: string | null, address?: string | null): string {
  const s = (name || address || '').trim();
  if (!s) return '—';
  return s.length > 72 ? `${s.slice(0, 69)}…` : s;
}

/** Harita / panel için varchar koordinatları sayıya çevirir */
function transferCoord(v: string | null | undefined): number | undefined {
  if (v == null || v === '') return undefined;
  const n = parseFloat(String(v).replace(',', '.').trim());
  return Number.isFinite(n) ? n : undefined;
}

export type AggregatedReservationItem = {
  id: string;
  reference: string;
  type: 'tour' | 'rentacar' | 'transfer';
  status: string;
  customerName: string;
  /** Planlanan alış / tur seansı vb. (çoğunlukla check-in) */
  date: string | null;
  /** Planlanan iade / dönüş (rentacar–transfer; entity `check_out` veya gidiş–dönüş dönüşü) */
  checkOut: string | null;
  createdAt: string;
  /** Harici site / kanal (yalnızca shared rezervasyonlarda) */
  bookingSourceSite?: string | null;
  metadata?: Record<string, unknown>;
};

type SharedReservationRow = Awaited<ReturnType<typeof ReservationService.list>>[number];

/** Liste yanıtında tur satırlarına tur / destinasyon / seans bilgisini metadata ile birlikte ver */
function enrichTourListMetadata(
  r: SharedReservationRow,
  meta: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (r.type !== 'tour') return meta;
  const m: Record<string, unknown> = { ...(meta || {}) };
  const tour = r.tour as { title?: string; destination?: { name?: string } } | undefined;
  if (m.tourName == null && tour?.title) m.tourName = tour.title;
  if (m.destinationName == null && tour?.destination?.name) m.destinationName = tour.destination.name;
  if (r.tourSession?.startsAt && m.sessionStartsAt == null) {
    m.sessionStartsAt = new Date(r.tourSession.startsAt).toISOString();
  }
  return Object.keys(m).length ? m : undefined;
}

export class ReservationController {
  static list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const reservations = await ReservationService.list(tenantId);
    sendSuccess(res, reservations);
  });

  /** Ortak rezervasyon listesi: tour + rentacar (shared) + transfer. ?type=tour|rentacar|transfer ile tek modül. */
  static listAggregated = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const typeRaw = typeof req.query.type === 'string' ? req.query.type : undefined;
    const filterType =
      typeRaw === 'tour' || typeRaw === 'rentacar' || typeRaw === 'transfer' ? typeRaw : undefined;

    const mapShared = (r: SharedReservationRow): AggregatedReservationItem => {
      const rawMeta = (r.metadata ?? {}) as Record<string, unknown>;
      const paymentStatus =
        typeof rawMeta.paymentStatus === 'string' ? rawMeta.paymentStatus : 'pending';
      const totalPrice = rawMeta.totalPrice != null ? Number(rawMeta.totalPrice) : 0;
      const currencyCode =
        (typeof rawMeta.currencyCode === 'string' ? rawMeta.currencyCode : null) ||
        (typeof rawMeta.currency === 'string' ? rawMeta.currency : null) ||
        'EUR';
      return {
        id: r.id,
        reference: r.reference,
        type: r.type as 'tour' | 'rentacar',
        status: r.status,
        customerName: r.customerName,
        date: r.checkIn ? new Date(r.checkIn).toISOString() : null,
        checkOut: r.checkOut ? new Date(r.checkOut).toISOString() : null,
        createdAt: new Date(r.createdAt).toISOString(),
        bookingSourceSite: r.bookingSourceSite ?? null,
        metadata: enrichTourListMetadata(r, {
          ...rawMeta,
          paymentStatus,
          totalPrice,
          currencyCode,
        }),
      };
    };

    const mapTransfer = (r: TransferReservation): AggregatedReservationItem => {
      const outboundIso = transferOutboundIso(r);
      const returnIso = transferReturnIso(r);
      return {
        id: r.id,
        reference: r.reference,
        type: 'transfer',
        status: r.status,
        customerName: r.passengerName,
        date: outboundIso,
        checkOut: returnIso,
        createdAt: new Date(r.createdAt).toISOString(),
        metadata: {
          vehicleId: r.vehicleId,
          vehicleType: r.vehicle?.type,
          passengerEmail: r.passengerEmail,
          passengerPhone: r.passengerPhone,
          pickupLabel: shortTransferLocation(r.pickupPlaceName, r.pickupAddress),
          dropoffLabel: shortTransferLocation(r.dropoffPlaceName, r.dropoffAddress),
          pickupLat: transferCoord(r.pickupLat),
          pickupLng: transferCoord(r.pickupLng),
          dropoffLat: transferCoord(r.dropoffLat),
          dropoffLng: transferCoord(r.dropoffLng),
          returnPickupLat: transferCoord(r.returnPickupLat ?? undefined),
          returnPickupLng: transferCoord(r.returnPickupLng ?? undefined),
          returnDropoffLat: transferCoord(r.returnDropoffLat ?? undefined),
          returnDropoffLng: transferCoord(r.returnDropoffLng ?? undefined),
          transferTime: r.transferTime,
          isRoundTrip: Boolean(r.isRoundTrip),
          outboundAt: outboundIso,
          returnAt: returnIso,
          passengerCount: r.passengerCount,
          vehicleName: r.vehicle?.name,
          totalPrice: r.totalPrice != null ? Number(r.totalPrice) : 0,
          currencyCode: r.currencyCode,
          paymentStatus: r.paymentStatus,
          distanceKm: r.distanceKm != null ? Number(r.distanceKm) : undefined,
        },
      };
    };

    const vehicleTypeRaw =
      typeof req.query.vehicleType === 'string' ? req.query.vehicleType : undefined;
    const validVehicleTypes = new Set(['vip', 'shuttle', 'premium', 'luxury']);
    const vehicleTypeFilter =
      vehicleTypeRaw && validVehicleTypes.has(vehicleTypeRaw.toLowerCase())
        ? (vehicleTypeRaw.toLowerCase() as 'vip' | 'shuttle' | 'premium' | 'luxury')
        : undefined;

    const vehicleScopeRaw =
      typeof req.query.vehicleScope === 'string' ? req.query.vehicleScope.toLowerCase() : undefined;
    const vehicleScope =
      vehicleScopeRaw === 'vip' || vehicleScopeRaw === 'shuttle' ? vehicleScopeRaw : undefined;

    if (filterType === 'transfer') {
      if (vehicleScope === 'shuttle') {
        const shuttleOk = await TenantFeaturesService.hasFeature(tenantId, 'transferShuttle');
        if (!shuttleOk) {
          sendSuccess(res, []);
          return;
        }
      }
      let transferReservations = await TransferReservationService.list({ tenantId });
      if (vehicleScope === 'vip') {
        transferReservations = transferReservations.filter(
          (r) => r.vehicle && ['vip', 'premium', 'luxury'].includes(r.vehicle.type)
        );
      } else if (vehicleScope === 'shuttle') {
        transferReservations = transferReservations.filter((r) => r.vehicle?.type === 'shuttle');
      } else if (vehicleTypeFilter) {
        transferReservations = transferReservations.filter((r) => r.vehicle?.type === vehicleTypeFilter);
      }
      const items = transferReservations.map(mapTransfer);
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      sendSuccess(res, items);
      return;
    }

    if (filterType === 'tour' || filterType === 'rentacar') {
      const sharedReservations = await ReservationService.list(tenantId);
      const filtered = sharedReservations.filter((r) => r.type === filterType);
      const items = filtered.map(mapShared);
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      sendSuccess(res, items);
      return;
    }

    const [sharedReservations, transferReservations] = await Promise.all([
      ReservationService.list(tenantId),
      TransferReservationService.list({ tenantId }),
    ]);
    const items: AggregatedReservationItem[] = [];
    for (const r of sharedReservations) {
      items.push(mapShared(r));
    }
    for (const r of transferReservations) {
      items.push(mapTransfer(r));
    }
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    sendSuccess(res, items);
  });

  static getById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const reservation = await ReservationService.getById(id);
    if (!reservation) throw new NotFoundError('Reservation', id);
    const tenantId = req.auth?.tenantId;
    const payload = await withRentacarOperationSummary(reservation, tenantId);
    sendSuccess(res, payload);
  });

  // Public endpoint: tenantId query param ile doğrulama yapılır, auth gerekmez
  static getByIdPublic = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { tenantId } = req.query as { tenantId?: string };
    const reservation = await ReservationService.getById(id);
    if (!reservation) throw new NotFoundError('Reservation', id);
    if (tenantId && reservation.tenantId !== tenantId) {
      throw new NotFoundError('Reservation', id);
    }
    const payload = await withRentacarOperationSummary(reservation, tenantId);
    sendSuccess(res, payload);
  });

  static confirmStaffPayment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { id } = req.params;
    const { amount, currencyCode, paymentMethod } = req.body as {
      amount?: unknown;
      currencyCode?: string;
      paymentMethod?: string;
    };
    if (amount == null || amount === '') throw new ValidationError('amount is required');
    const pm = paymentMethod as string;
    if (!pm || !['cash', 'bank_transfer', 'credit_card'].includes(pm)) {
      throw new ValidationError('paymentMethod: cash | bank_transfer | credit_card');
    }
    const reservation = await ReservationService.confirmStaffPayment(tenantId, id, {
      amount: Number(amount),
      currencyCode: currencyCode || 'TRY',
      paymentMethod: pm as 'cash' | 'bank_transfer' | 'credit_card',
    });
    sendSuccess(res, reservation);
  });

  static createReservationStripePaymentIntent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = await resolveTenantIdForReservationPayment(req, id);
    const { amount, currencyCode } = req.body as { amount?: unknown; currencyCode?: string };
    if (amount == null || amount === '') throw new ValidationError('amount is required');
    const result = await ReservationStripeService.createPaymentIntent(
      tenantId,
      id,
      Number(amount),
      currencyCode || 'EUR'
    );
    sendSuccess(res, result);
  });

  static completeReservationStripePayment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const tenantId = await resolveTenantIdForReservationPayment(req, id);
    const { paymentIntentId } = req.body as { paymentIntentId?: string };
    if (!paymentIntentId || typeof paymentIntentId !== 'string') {
      throw new ValidationError('paymentIntentId is required');
    }
    const reservation = await ReservationService.completeStaffStripePayment(tenantId, id, paymentIntentId);
    sendSuccess(res, reservation);
  });

  static updateStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { status, checkIn, checkOut } = req.body as any;
    if (!status || !Object.values(ReservationStatus).includes(status)) throw new ValidationError('Valid status is required');
    const checkInDate = checkIn ? new Date(checkIn) : undefined;
    const checkOutDate = checkOut ? new Date(checkOut) : undefined;
    const reservation = await ReservationService.updateStatus(id, status, checkInDate, checkOutDate);
    sendSuccess(res, reservation);
  });

  static update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const updateData = req.body as any;
    if (updateData?.status && !Object.values(ReservationStatus).includes(updateData.status)) throw new ValidationError('Invalid status value');
    if (updateData?.checkIn) updateData.checkIn = new Date(updateData.checkIn);
    if (updateData?.checkOut) updateData.checkOut = new Date(updateData.checkOut);
    const reservation = await ReservationService.update(id, updateData);
    sendSuccess(res, reservation);
  });

  static addNote = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { note } = req.body as { note: string };
    if (!note || note.trim().length === 0) throw new ValidationError('Note is required');
    const reservation = await ReservationService.addNote(id, note.trim());
    sendSuccess(res, reservation);
  });

  static processCheckout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const reservation = await ReservationService.processCheckout(id);
    sendSuccess(res, reservation);
  });

  static processCheckin = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const reservation = await ReservationService.processCheckin(id);
    sendSuccess(res, reservation);
  });

  static cancel = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body as { reason?: string };
    const reservation = await ReservationService.cancelReservation(id, reason);
    sendSuccess(res, reservation);
  });

  static sendConfirmationEmail = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    await ReservationService.sendConfirmationEmail(id);
    sendSuccess(res, { message: 'Confirmation email sent successfully' });
  });

  static sendCancellationEmail = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const reason = req.body?.reason as string | undefined;
    await ReservationService.sendCancellationEmail(id, reason);
    sendSuccess(res, { message: 'Cancellation email sent successfully' });
  });

  static approveByCustomer = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { token } = req.query;
    if (!token || typeof token !== 'string') throw new ValidationError('Token is required');
    const reservation = await ReservationService.approveByCustomer(id, token);
    const siteSettings = await TenantSettingsService.getSiteSettings(reservation.tenantId);
    const companyWebsite = (siteSettings?.companyWebsite || '').trim();
    let redirectUrl: string;
    if (companyWebsite) {
      redirectUrl = companyWebsite.startsWith('http') ? companyWebsite : `https://${companyWebsite}`;
    } else {
      const tenant = await AppDataSource.getRepository(Tenant).findOne({ where: { id: reservation.tenantId } });
      const baseUrl = process.env.PUBLIC_URL || process.env.FRONTEND_URL || 'https://saastour360.com';
      const hostname = (() => { try { return new URL(baseUrl).hostname; } catch { return 'saastour360.com'; } })();
      redirectUrl = tenant?.slug ? `https://${tenant.slug}.${hostname}` : baseUrl;
    }
    sendSuccess(res, { message: 'Reservation approved successfully', reservation, redirectUrl });
  });

  static cancelByCustomer = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { token, reason } = req.query;
    if (!token || typeof token !== 'string') throw new ValidationError('Token is required');
    const reservation = await ReservationService.cancelByCustomer(id, token, reason as string | undefined);
    sendSuccess(res, { message: 'Reservation cancelled successfully', reservation });
  });

  static contractPrint = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    let tenantId = req.auth?.tenantId;
    const { id } = req.params;
    // Admin token has no tenantId: resolve from reservation
    if (!tenantId) {
      const reservation = await ReservationService.getById(id);
      if (!reservation) throw new UnauthorizedError('Rezervasyon bulunamadı');
      tenantId = reservation.tenantId;
    }
    const { getContractPrintHtml } = await import('../../rentacar/services/reservation-contract-print.service');
    const html = await getContractPrintHtml(id, tenantId);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  });

  /** 80mm termal PDF — mobil Zebra / sistem yazdırma ile uyumlu */
  static contractThermalPdf = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    let tenantId = req.auth?.tenantId;
    const { id } = req.params;
    if (!tenantId) {
      const reservation = await ReservationService.getById(id);
      if (!reservation) throw new UnauthorizedError('Rezervasyon bulunamadı');
      tenantId = reservation.tenantId;
    }
    const { getContractPrintHtml } = await import('../../rentacar/services/reservation-contract-print.service');
    const { generateThermalPDF } = await import('../../../utils/pdf-generator');
    const html = await getContractPrintHtml(id, tenantId);
    const { buffer } = await generateThermalPDF(html);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="sozlesme-${id}-thermal.pdf"`);
    res.send(buffer);
  });

  /** A4 voucher PDF — e-postadaki ek ile aynı içerik (tur / rentacar) */
  static voucherPdf = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const authTenantId = req.auth?.tenantId;
    let reservation: Reservation | null;
    if (authTenantId) {
      reservation = await ReservationService.getByIdForTenant(id, authTenantId);
    } else {
      reservation = await ReservationService.getById(id);
    }
    if (!reservation) throw new NotFoundError('Reservation', id);
    const tenantId = reservation.tenantId;
    const siteSettings = await TenantSettingsService.getSiteSettings(tenantId);
    const langCode = await VoucherService.getLanguageCode(reservation.customerLanguageId);
    const buffer = await VoucherService.generateVoucherPdf(reservation, langCode, siteSettings);
    const ref = reservation.reference || reservation.id.substring(0, 8).toUpperCase();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="voucher-${ref}.pdf"`);
    res.send(buffer);
  });

  static delete = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) throw new UnauthorizedError('Authentication required');
    const { id } = req.params;
    await ReservationService.deleteReservation(id, tenantId);
    sendSuccess(res, { message: 'Reservation deleted successfully' });
  });
}

