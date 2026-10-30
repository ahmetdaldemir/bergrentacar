import { Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { NotFoundError, ValidationError } from '../../../utils/errors';
import { FinancePaymentMethod } from '../../finance/entities/finance-transaction.entity';
import { ReservationStripeService } from './reservation-stripe.service';
import { Reservation, ReservationStatus } from '../entities/reservation.entity';
import { sendSurveyEmailForReservation } from '../../../services/survey-email.service';
import {
  sendReservationConfirmationEmail,
  sendReservationCancelledEmail,
  sendReservationCompletedEmail,
} from '../../../services/reservation-email.service';
import { EmailTemplateType } from '../entities/email-template.entity';
import { sendReservationEmail } from '../../../services/reservation-email.service';
import { ReservationHandlerRegistry } from './reservation-handler.registry';
import { notifyTenantPanelRefresh } from '../../../services/tenant-panel-socket.service';

export class ReservationService {
  private static pingDashboard(tenantId: string): void {
    notifyTenantPanelRefresh(tenantId, { reason: 'reservation' });
  }
  private static repository(): Repository<Reservation> {
    return AppDataSource.getRepository(Reservation);
  }

  static async getById(id: string): Promise<Reservation | null> {
    return this.repository().findOne({
      where: { id },
      relations: ['tenant', 'tour', 'tourSession', 'customerLanguage'],
    });
  }

  static async updateStatus(
    id: string,
    status: ReservationStatus,
    checkIn?: Date | null,
    checkOut?: Date | null
  ): Promise<Reservation> {
    const repo = this.repository();
    const reservation = await repo.findOne({ where: { id }, relations: ['customerLanguage'] });

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    const previousStatus = reservation.status;

    reservation.status = status;
    if (checkIn !== undefined) {
      reservation.checkIn = checkIn;
    }
    if (checkOut !== undefined) {
      reservation.checkOut = checkOut;
    }

    const updatedReservation = await repo.save(reservation);

    // Credit ParaPuan on reservation completion (idempotent)
    if (status === ReservationStatus.COMPLETED || status === ReservationStatus.CONFIRMED) {
      try {
        const { WalletService } = await import('./wallet.service');
        const { ParaPuanCalculatorService } = await import('./parapuan-calculator.service');
        const { WalletTransactionSource } = await import('../entities/wallet-transaction.entity');

        // Get reservation metadata for total price
        const metadata = reservation.metadata as any;
        const totalPrice = metadata?.totalPrice || 0;

        if (totalPrice > 0) {
          // Calculate points
          const points = await ParaPuanCalculatorService.calculatePoints(
            reservation.tenantId,
            totalPrice
          );

          if (points > 0) {
            // Get customer ID from metadata or reservation
            const customerId = metadata?.customerId || null;
            if (customerId) {
              // Credit points (idempotent via transactionId)
              const transactionId = `reservation_${reservation.id}_${status}`;
              await WalletService.creditPoints({
                tenantId: reservation.tenantId,
                customerId,
                amount: points,
                source: WalletTransactionSource.RESERVATION_COMPLETION,
                description: `Points earned from reservation ${reservation.reference}`,
                reservationId: reservation.id,
                transactionId, // Ensures idempotency
              });
            }
          }
        }
      } catch (error) {
        // Log error but don't fail the reservation update
        console.error('Error crediting ParaPuan:', error);
      }
    }

    // Muhasebe kaydı (asenkron, ana işlemi bloklama)
    if (previousStatus !== status) {
      import('../../finance/services/reservation-finance.service')
        .then(({ ReservationFinanceService }) =>
          ReservationFinanceService.recordForReservation(updatedReservation)
        )
        .catch((err) => console.error('ReservationFinanceService error:', err));
    }

    // Status değişikliğine göre e-posta gönder (asenkron, ana işlemi bloklama)
    if (previousStatus !== status) {
      if (status === ReservationStatus.CONFIRMED) {
        sendReservationConfirmationEmail(updatedReservation).catch((error) => {
          console.error(`Error sending confirmation email for reservation ${updatedReservation.id}:`, error);
        });
      } else if (status === ReservationStatus.CANCELLED) {
        sendReservationCancelledEmail(updatedReservation).catch((error) => {
          console.error(`Error sending cancellation email for reservation ${updatedReservation.id}:`, error);
        });
      } else if (status === ReservationStatus.COMPLETED) {
        sendReservationCompletedEmail(updatedReservation).catch((error) => {
          console.error(`Error sending completion email for reservation ${updatedReservation.id}:`, error);
        });
        sendSurveyEmailForReservation(updatedReservation).catch((error) => {
          console.error(`Error sending survey email for reservation ${updatedReservation.id}:`, error);
        });
      }
    }

    this.pingDashboard(updatedReservation.tenantId);
    return updatedReservation;
  }

  static async update(id: string, data: Partial<Reservation> & { recalculatePrice?: boolean }): Promise<Reservation> {
    const repo = this.repository();
    const reservation = await repo.findOne({ where: { id }, relations: ['customerLanguage'] });

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    const previousStatus = reservation.status;
    const shouldRecalculatePrice = data.recalculatePrice && reservation.type === 'rentacar';

    // Fiyat yeniden hesaplama isteği varsa tipin handler'ına delege et
    if (data.recalculatePrice) {
      const handler = ReservationHandlerRegistry.get(reservation.type);
      if (handler?.recalculatePrice) {
        return handler.recalculatePrice(id, reservation.tenantId, data);
      }
    }

    // Normal güncelleme
    Object.assign(reservation, data);
    const updatedReservation = await repo.save(reservation);

    // Muhasebe kaydı (asenkron)
    if (data.status && previousStatus !== data.status) {
      import('../../finance/services/reservation-finance.service')
        .then(({ ReservationFinanceService }) =>
          ReservationFinanceService.recordForReservation(updatedReservation)
        )
        .catch((err) => console.error('ReservationFinanceService error:', err));
    }

    // Status değişikliğine göre e-posta gönder (asenkron, ana işlemi bloklama)
    if (data.status && previousStatus !== data.status) {
      if (data.status === ReservationStatus.CONFIRMED) {
        sendReservationConfirmationEmail(updatedReservation).catch((error) => {
          console.error(`Error sending confirmation email for reservation ${updatedReservation.id}:`, error);
        });
      } else if (data.status === ReservationStatus.CANCELLED) {
        sendReservationCancelledEmail(updatedReservation).catch((error) => {
          console.error(`Error sending cancellation email for reservation ${updatedReservation.id}:`, error);
        });
      } else if (data.status === ReservationStatus.COMPLETED) {
        sendReservationCompletedEmail(updatedReservation).catch((error) => {
          console.error(`Error sending completion email for reservation ${updatedReservation.id}:`, error);
        });
        sendSurveyEmailForReservation(updatedReservation).catch((error) => {
          console.error(`Error sending survey email for reservation ${updatedReservation.id}:`, error);
        });
      }
    }

    this.pingDashboard(updatedReservation.tenantId);
    return updatedReservation;
  }

  static async list(tenantId: string): Promise<Reservation[]> {
    return this.repository().find({
      where: { tenantId },
      relations: ['tenant', 'tour', 'tour.destination', 'tourSession', 'customerLanguage', 'vehiclePlateAssignments'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Rezervasyona not ekle
   */
  static async addNote(id: string, note: string): Promise<Reservation> {
    const repo = this.repository();
    const reservation = await repo.findOne({ where: { id } });

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    const existingNotes = reservation.notes || '';
    const timestamp = new Date().toISOString();
    const newNote = `[${timestamp}] ${note}\n`;
    reservation.notes = existingNotes + newNote;

    return repo.save(reservation);
  }

  /**
   * Araç çıkış işlemi (checkIn tarihini set et)
   */
  static async processCheckout(id: string): Promise<Reservation> {
    const repo = this.repository();
    const reservation = await repo.findOne({ where: { id }, relations: ['customerLanguage'] });

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    const checkoutHandler = ReservationHandlerRegistry.get(reservation.type);
    if (!checkoutHandler?.checkout) {
      throw new Error('Checkout is not supported for this reservation type');
    }

    // Handler tipin geçerliliğini kontrol eder ve set edilecek alanları döner
    const { checkIn, newStatus: checkoutStatus } = checkoutHandler.checkout(reservation);
    reservation.checkIn = checkIn;
    if (checkoutStatus) {
      reservation.status = checkoutStatus;
    }
    const meta = (reservation.metadata || {}) as Record<string, unknown>;
    meta.checkoutCompletedAt = new Date().toISOString();
    reservation.metadata = meta;

    const updatedReservation = await repo.save(reservation);

    // Onay emaili gönder (asenkron)
    if (reservation.status === ReservationStatus.CONFIRMED) {
      sendReservationConfirmationEmail(updatedReservation).catch((error) => {
        console.error(`Error sending confirmation email for reservation ${updatedReservation.id}:`, error);
      });
    }

    this.pingDashboard(updatedReservation.tenantId);
    return updatedReservation;
  }

  /**
   * Araç dönüş işlemi (checkOut tarihini set et)
   */
  static async processCheckin(id: string): Promise<Reservation> {
    const repo = this.repository();
    const reservation = await repo.findOne({ where: { id }, relations: ['customerLanguage'] });

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    const checkinHandler = ReservationHandlerRegistry.get(reservation.type);
    if (!checkinHandler?.checkin) {
      throw new Error('Checkin is not supported for this reservation type');
    }

    // Handler tipin geçerliliğini kontrol eder ve set edilecek alanları döner
    const { checkOut, newStatus: checkinStatus } = checkinHandler.checkin(reservation);
    reservation.checkOut = checkOut;
    reservation.status = checkinStatus;
    const metaAfterCheckin = (reservation.metadata || {}) as Record<string, unknown>;
    metaAfterCheckin.checkinCompletedAt = new Date().toISOString();
    reservation.metadata = metaAfterCheckin;

    const updatedReservation = await repo.save(reservation);

    // Tamamlandı emaili gönder (asenkron)
    sendReservationCompletedEmail(updatedReservation).catch((error) => {
      console.error(`Error sending completion email for reservation ${updatedReservation.id}:`, error);
    });

    // Anket emaili gönder (asenkron)
    sendSurveyEmailForReservation(updatedReservation).catch((error) => {
      console.error(`Error sending survey email for reservation ${updatedReservation.id}:`, error);
    });

    this.pingDashboard(updatedReservation.tenantId);
    return updatedReservation;
  }

  /**
   * Rezervasyonu iptal et
   */
  static async cancelReservation(id: string, reason?: string): Promise<Reservation> {
    const repo = this.repository();
    const reservation = await repo.findOne({ where: { id }, relations: ['customerLanguage'] });

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    if (reservation.status === ReservationStatus.CANCELLED) {
      throw new Error('Reservation is already cancelled');
    }

    if (reservation.status === ReservationStatus.COMPLETED) {
      throw new Error('Cannot cancel a completed reservation');
    }

    reservation.status = ReservationStatus.CANCELLED;

    // İptal nedeni varsa notlara ekle
    if (reason) {
      const timestamp = new Date().toISOString();
      const cancelNote = `[${timestamp}] İptal nedeni: ${reason}\n`;
      reservation.notes = (reservation.notes || '') + cancelNote;
    }

    const updatedReservation = await repo.save(reservation);

    // İptal emaili gönder (asenkron) - Yukarıdaki kontrollerden dolayı status zaten CANCELLED değil
    sendReservationCancelledEmail(updatedReservation).catch((error) => {
      console.error(`Error sending cancellation email for reservation ${updatedReservation.id}:`, error);
    });

    this.pingDashboard(updatedReservation.tenantId);
    return updatedReservation;
  }

  /**
   * Onay emaili gönder ve rezervasyonu otomatik olarak CONFIRMED yap
   * Kurumsal şablon ile müşterinin diline göre gönderilir
   */
  static async sendConfirmationEmail(id: string): Promise<void> {
    const repo = this.repository();
    const reservation = await repo.findOne({ 
      where: { id }, 
      relations: ['customerLanguage'] 
    });

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    if (!reservation.customerEmail) {
      throw new Error('Reservation has no customer email');
    }

    // Rezervasyon durumunu CONFIRMED yap (mail gönderilmeden önce)
    if (reservation.status !== ReservationStatus.CONFIRMED) {
      reservation.status = ReservationStatus.CONFIRMED;
      await repo.save(reservation);
      this.pingDashboard(reservation.tenantId);
    }

    // Müşterinin diline göre onay emaili gönder (kurumsal şablon ile)
    // Email şablonu customerLanguageId'ye göre otomatik seçilir ve kurumsal layout ile sarılır
    await sendReservationEmail(reservation, EmailTemplateType.RESERVATION_CONFIRMATION);
  }

  /**
   * İptal emaili gönder ve rezervasyon durumunu CANCELLED yap
   */
  static async sendCancellationEmail(id: string, reason?: string): Promise<void> {
    const repo = this.repository();
    const reservation = await repo.findOne({ 
      where: { id }, 
      relations: ['customerLanguage'] 
    });

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    if (!reservation.customerEmail) {
      throw new Error('Reservation has no customer email');
    }

    if (reservation.status === ReservationStatus.COMPLETED) {
      throw new Error('Cannot cancel a completed reservation');
    }

    // Rezervasyon durumunu CANCELLED yap
    if (reservation.status !== ReservationStatus.CANCELLED) {
      reservation.status = ReservationStatus.CANCELLED;
      
      // İptal nedeni varsa notlara ekle
      if (reason) {
        const timestamp = new Date().toISOString();
        const cancelNote = `[${timestamp}] İptal nedeni: ${reason}\n`;
        reservation.notes = (reservation.notes || '') + cancelNote;
      }
      
      await repo.save(reservation);
      this.pingDashboard(reservation.tenantId);
    }

    // Müşterinin diline göre iptal emaili gönder
    await sendReservationEmail(reservation, EmailTemplateType.RESERVATION_CANCELLED);
  }

  /**
   * Müşteri tarafından rezervasyon onaylama (public endpoint)
   */
  static async approveByCustomer(id: string, token: string): Promise<Reservation> {
    const repo = this.repository();
    const reservation = await repo.findOne({ 
      where: { id }, 
      relations: ['customerLanguage'] 
    });

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    // Token doğrulama (basit: id ile token eşleşmeli)
    if (token !== id) {
      throw new Error('Invalid token');
    }

    // Sadece pending durumundaki rezervasyonlar onaylanabilir
    if (reservation.status !== ReservationStatus.PENDING) {
      throw new Error(`Reservation cannot be approved. Current status: ${reservation.status}`);
    }

    // Rezervasyon durumunu CONFIRMED yap
    reservation.status = ReservationStatus.CONFIRMED;
    const updatedReservation = await repo.save(reservation);

    // Müşteri onayladı → "Rezervasyon onaylandı" + voucher emaili (asenkron)
    sendReservationEmail(updatedReservation, EmailTemplateType.RESERVATION_CONFIRMED).catch((error) => {
      console.error(`Error sending confirmed email for reservation ${updatedReservation.id}:`, error);
    });

    this.pingDashboard(updatedReservation.tenantId);
    return updatedReservation;
  }

  /**
   * Müşteri tarafından rezervasyon iptal etme (public endpoint)
   */
  static async cancelByCustomer(id: string, token: string, reason?: string): Promise<Reservation> {
    const repo = this.repository();
    const reservation = await repo.findOne({ 
      where: { id }, 
      relations: ['customerLanguage'] 
    });

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    // Token doğrulama
    if (token !== id) {
      throw new Error('Invalid token');
    }

    // Sadece pending veya confirmed durumundaki rezervasyonlar iptal edilebilir
    if (reservation.status !== ReservationStatus.PENDING && reservation.status !== ReservationStatus.CONFIRMED) {
      throw new Error(`Reservation cannot be cancelled. Current status: ${reservation.status}`);
    }

    // Rezervasyon durumunu CANCELLED yap
    reservation.status = ReservationStatus.CANCELLED;
    
    // İptal nedeni varsa notlara ekle
    if (reason) {
      const timestamp = new Date().toISOString();
      const cancelNote = `[${timestamp}] Müşteri tarafından iptal nedeni: ${reason}\n`;
      reservation.notes = (reservation.notes || '') + cancelNote;
    }
    
    const updatedReservation = await repo.save(reservation);

    // İptal emaili gönder (asenkron)
    sendReservationCancelledEmail(updatedReservation).catch((error) => {
      console.error(`Error sending cancellation email for reservation ${updatedReservation.id}:`, error);
    });

    this.pingDashboard(updatedReservation.tenantId);
    return updatedReservation;
  }

  /** Soft delete: SaaS kullanıcıları sadece kendi tenant rezervasyonlarını silebilir. */
  static async deleteReservation(id: string, tenantId: string): Promise<void> {
    const repo = this.repository();
    const reservation = await repo.findOne({ where: { id }, withDeleted: true });
    if (!reservation || reservation.tenantId !== tenantId) {
      throw new NotFoundError('Reservation', id);
    }
    if (reservation.deletedAt) {
      return; // already soft-deleted
    }
    await repo.softDelete(id);
    this.pingDashboard(tenantId);
  }

  static async getByIdForTenant(id: string, tenantId: string): Promise<Reservation | null> {
    return this.repository().findOne({
      where: { id, tenantId },
      relations: ['customerLanguage', 'tour', 'tourSession'],
    });
  }

  /** Mobil / personel: nakit, havale veya fiziki kart tahsilatı */
  static async confirmStaffPayment(
    tenantId: string,
    id: string,
    input: { amount: number; currencyCode: string; paymentMethod: 'cash' | 'bank_transfer' | 'credit_card' }
  ): Promise<Reservation> {
    const reservation = await this.getByIdForTenant(id, tenantId);
    if (!reservation) throw new NotFoundError('Reservation', id);
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new ValidationError('Geçerli bir tutar girin');
    }
    const prevMeta = (reservation.metadata as Record<string, unknown>) || {};
    const currency = (
      input.currencyCode ||
      (typeof prevMeta.currencyCode === 'string' ? prevMeta.currencyCode : null) ||
      (typeof prevMeta.currency === 'string' ? prevMeta.currency : null) ||
      'TRY'
    ).slice(0, 3);
    const pm = input.paymentMethod;
    const pmStr =
      pm === 'bank_transfer' ? 'bank_transfer' : pm === 'credit_card' ? 'credit_card' : 'cash';
    const meta: Record<string, unknown> = { ...prevMeta };
    meta.paymentStatus = 'paid';
    meta.paymentMethod = pmStr;
    meta.staffCollectedAt = new Date().toISOString();
    meta.staffCollectedAmount = input.amount;
    meta.staffCollectedCurrency = currency;
    reservation.metadata = meta;

    const financeMethod =
      pm === 'cash'
        ? FinancePaymentMethod.CASH
        : pm === 'bank_transfer'
          ? FinancePaymentMethod.TRANSFER
          : FinancePaymentMethod.CARD;

    await this.repository().save(reservation);
    this.pingDashboard(tenantId);
    const { ReservationFinanceService } = await import('../../finance/services/reservation-finance.service');
    await ReservationFinanceService.recordStaffPaymentConfirmation(
      reservation,
      input.amount,
      currency,
      financeMethod
    );
    const reloaded = await this.getById(id);
    if (!reloaded) throw new NotFoundError('Reservation', id);
    return reloaded;
  }

  /** Stripe başarılı ödeme → tahsilat + tamamlandı */
  static async completeStaffStripePayment(
    tenantId: string,
    id: string,
    paymentIntentId: string
  ): Promise<Reservation> {
    const { amount, currency } = await ReservationStripeService.assertPaymentSucceeded(
      tenantId,
      id,
      paymentIntentId
    );
    const reservation = await this.getByIdForTenant(id, tenantId);
    if (!reservation) throw new NotFoundError('Reservation', id);

    const prevMeta = (reservation.metadata as Record<string, unknown>) || {};
    const meta: Record<string, unknown> = { ...prevMeta };
    meta.paymentStatus = 'paid';
    meta.paymentMethod = 'credit_card';
    meta.staffCollectedAt = new Date().toISOString();
    meta.staffCollectedAmount = amount;
    meta.staffCollectedCurrency = currency;
    reservation.metadata = meta;
    await this.repository().save(reservation);

    const { ReservationFinanceService } = await import('../../finance/services/reservation-finance.service');
    await ReservationFinanceService.recordStaffPaymentConfirmation(
      reservation,
      amount,
      currency,
      FinancePaymentMethod.CARD
    );

    return this.updateStatus(id, ReservationStatus.COMPLETED);
  }
}

