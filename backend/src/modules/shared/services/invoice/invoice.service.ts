import { Repository } from 'typeorm';
import { AppDataSource } from '../../../../config/data-source';
import { ReservationInvoice, InvoiceStatus } from '../../entities/reservation-invoice.entity';
import { Reservation } from '../../entities/reservation.entity';
import { TransferReservation } from '../../../transfer/entities/transfer-reservation.entity';
import { TenantSettingsService } from '../tenant-settings.service';
import { IntegratorRegistry } from './integrator-registry';
import { Integrator, InvoiceDto, IssueInvoiceResult } from './integrator.interface';
import { ReservationInvoiceConfigService } from './invoice-config.service';

export interface IssueInvoiceInput {
  /** Tur / Araç Kiralama rezervasyonu ID */
  reservationId?: string;
  /** Transfer rezervasyonu ID */
  transferReservationId?: string;
  tenantId: string;
  userId: string;
  forceReissue?: boolean;
}

export interface InvoiceCalculationResult {
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
}

export class InvoiceService {
  private static invoiceRepo(): Repository<ReservationInvoice> {
    return AppDataSource.getRepository(ReservationInvoice);
  }

  private static reservationRepo(): Repository<Reservation> {
    return AppDataSource.getRepository(Reservation);
  }

  private static transferRepo(): Repository<TransferReservation> {
    return AppDataSource.getRepository(TransferReservation);
  }

  // ─── Calculation helpers ───────────────────────────────────────────────────

  static async calculateFromPrice(price: number, vatRate: number): Promise<InvoiceCalculationResult> {
    const subtotal = price;
    const vatAmount = subtotal * (vatRate / 100);
    return { subtotal, vatRate, vatAmount, total: subtotal + vatAmount };
  }

  static async calculateInvoice(
    reservation: Reservation,
    vatRate: number
  ): Promise<InvoiceCalculationResult> {
    const metadata = reservation.metadata || {};
    const finalPrice = Number(metadata.totalPrice || metadata.finalPrice || 0);
    return this.calculateFromPrice(finalPrice, vatRate);
  }

  // ─── DTO builders ──────────────────────────────────────────────────────────

  static async buildInvoiceDto(
    reservation: Reservation,
    calculation: InvoiceCalculationResult
  ): Promise<InvoiceDto> {
    const metadata = reservation.metadata || {};
    const items = [
      {
        description: `Rezervasyon: ${reservation.reference}`,
        quantity: 1,
        unitPrice: calculation.subtotal,
        total: calculation.subtotal,
      },
    ];
    if (metadata.items && Array.isArray(metadata.items)) {
      items.push(...(metadata.items as any[]));
    }
    return {
      reservationId: reservation.id,
      tenantId: reservation.tenantId,
      customerName: reservation.customerName,
      customerEmail: reservation.customerEmail,
      customerTaxNumber: metadata.customerTaxNumber as string | undefined,
      customerAddress: metadata.customerAddress as string | undefined,
      subtotal: calculation.subtotal,
      vatRate: calculation.vatRate,
      vatAmount: calculation.vatAmount,
      total: calculation.total,
      currencyCode: 'TRY',
      items,
      metadata,
    };
  }

  static async buildTransferInvoiceDto(
    tr: TransferReservation,
    calculation: InvoiceCalculationResult
  ): Promise<InvoiceDto> {
    return {
      reservationId: tr.id,
      tenantId: tr.tenantId,
      customerName: tr.passengerName,
      customerEmail: tr.passengerEmail,
      subtotal: calculation.subtotal,
      vatRate: calculation.vatRate,
      vatAmount: calculation.vatAmount,
      total: calculation.total,
      currencyCode: tr.currencyCode || 'EUR',
      items: [
        {
          description: `Transfer Rezervasyonu: ${tr.reference}`,
          quantity: 1,
          unitPrice: calculation.subtotal,
          total: calculation.subtotal,
        },
      ],
    };
  }

  // ─── Core: issue invoice (unified) ────────────────────────────────────────

  static async issueInvoice(input: IssueInvoiceInput): Promise<ReservationInvoice> {
    const { tenantId, userId: _userId, forceReissue = false } = input;

    if (!input.reservationId && !input.transferReservationId) {
      throw new Error('reservationId veya transferReservationId gereklidir');
    }

    // ── Veri yükleme ──────────────────────────────────────────────────────────
    let reservation: Reservation | null = null;
    let transferReservation: TransferReservation | null = null;

    if (input.reservationId) {
      reservation = await this.reservationRepo().findOne({ where: { id: input.reservationId, tenantId } });
      if (!reservation) throw new Error('Reservation not found or tenant mismatch');
    } else {
      transferReservation = await this.transferRepo().findOne({ where: { id: input.transferReservationId!, tenantId } });
      if (!transferReservation) throw new Error('Transfer reservation not found or tenant mismatch');
    }

    // ── Duplikasyon kontrolü ──────────────────────────────────────────────────
    if (!forceReissue) {
      const where: any = { tenantId };
      if (input.reservationId) where.reservationId = input.reservationId;
      else where.transferReservationId = input.transferReservationId;

      const existing = await this.invoiceRepo().findOne({ where });
      if (existing) {
        const ref = input.reservationId ?? input.transferReservationId;
        throw new Error(`Bu rezervasyon için fatura zaten mevcut (${ref}). Tekrar kesmek için forceReissue=true kullanın.`);
      }
    }

    // ── Tenant fatura ayarları ─────────────────────────────────────────────────
    const invoiceSettings = await TenantSettingsService.getInvoiceSettings(tenantId);
    if (!invoiceSettings || !invoiceSettings.metadata) {
      throw new Error('Fatura ayarları tenant için yapılandırılmamış');
    }
    const settingsMeta = invoiceSettings.metadata as Record<string, unknown>;
    const vatRate = Number(settingsMeta.vatRate || 0);
    const integratorKey = (settingsMeta.eInvoiceIntegrator as string) || 'none';

    // ── Hesaplama & DTO ──────────────────────────────────────────────────────
    let calculation: InvoiceCalculationResult;
    let invoiceDto: InvoiceDto;

    if (reservation) {
      calculation = await this.calculateInvoice(reservation, vatRate);
      invoiceDto = await this.buildInvoiceDto(reservation, calculation);
    } else {
      calculation = await this.calculateFromPrice(Number(transferReservation!.totalPrice || 0), vatRate);
      invoiceDto = await this.buildTransferInvoiceDto(transferReservation!, calculation);
    }

    // ── Entegratör ────────────────────────────────────────────────────────────
    let result: IssueInvoiceResult;
    if (integratorKey === 'none') {
      result = { success: true };
    } else {
      const integrator: Integrator | null = IntegratorRegistry.getIntegrator(integratorKey);
      if (!integrator) throw new Error(`Integrator '${integratorKey}' not found`);
      const config = await ReservationInvoiceConfigService.getConfig(tenantId, integratorKey);
      try {
        result = await integrator.issueInvoice(invoiceDto, config || undefined);
      } catch (error) {
        result = { success: false, errorMessage: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    const status: InvoiceStatus = result.success
      ? integratorKey === 'none' ? InvoiceStatus.DRAFT : InvoiceStatus.SENT
      : InvoiceStatus.FAILED;

    const invoice = this.invoiceRepo().create({
      tenantId,
      reservationId: input.reservationId ?? null,
      transferReservationId: input.transferReservationId ?? null,
      integratorKey,
      status,
      vatRateUsed: vatRate,
      subtotal: calculation.subtotal,
      vatAmount: calculation.vatAmount,
      total: calculation.total,
      externalInvoiceId: result.externalInvoiceId || null,
      externalReference: result.externalReference || null,
      requestPayload: invoiceDto as any,
      responsePayload: (result as any).responseData || null,
      pdfUrl: result.pdfUrl || null,
      errorMessage: result.errorMessage || null,
    });

    return this.invoiceRepo().save(invoice);
  }

  // ─── Queries ──────────────────────────────────────────────────────────────

  static async getInvoiceByReservation(
    reservationId: string,
    tenantId: string
  ): Promise<ReservationInvoice | null> {
    return this.invoiceRepo().findOne({ where: { reservationId, tenantId } });
  }

  static async getInvoiceByTransferReservation(
    transferReservationId: string,
    tenantId: string
  ): Promise<ReservationInvoice | null> {
    return this.invoiceRepo().findOne({ where: { transferReservationId, tenantId } });
  }

  static async getInvoicesByTenant(
    tenantId: string,
    limit = 100,
    offset = 0
  ): Promise<{ invoices: ReservationInvoice[]; total: number }> {
    const [invoices, total] = await this.invoiceRepo().findAndCount({
      where: { tenantId },
      relations: ['reservation', 'transferReservation'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { invoices, total };
  }
}

