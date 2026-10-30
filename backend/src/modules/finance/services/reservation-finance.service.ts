import { IsNull, Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { CurrencyService } from '../../shared/services/currency.service';
import { FinanceCategory, FinanceCategoryType } from '../entities/finance-category.entity';
import {
  FinanceTransaction,
  FinanceTransactionStatus,
  FinanceTransactionType,
  FinancePaymentMethod,
} from '../entities/finance-transaction.entity';
import { Reservation, ReservationStatus, ReservationType } from '../../shared/entities/reservation.entity';
import { TransferReservation, TransferReservationStatus } from '../../transfer/entities/transfer-reservation.entity';
import { FinanceCariService } from './finance-cari.service';

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100;
}

const CATEGORY_TOUR = 'Tur Rezervasyon Geliri';
const CATEGORY_RENTACAR = 'Araç Kiralama Geliri';
const CATEGORY_TRANSFER = 'Transfer Rezervasyon Geliri';
const CATEGORY_STORNO = 'İptal / Storno';

/**
 * Rezervasyon durumu → otomatik finance transaction yönetimi.
 *
 * CONFIRMED  → INCOME / PLANNED  (alacak beklentisi)
 * COMPLETED  → INCOME / PAID     (gerçekleşen tahsilat; varsa PLANNED kaydını günceller)
 * CANCELLED  → Mevcut PLANNED kaydı CANCELLED'a çekilir
 */
export class ReservationFinanceService {
  // ─── Repositories ──────────────────────────────────────────────────────────

  private static categoryRepo(): Repository<FinanceCategory> {
    return AppDataSource.getRepository(FinanceCategory);
  }

  private static txRepo(): Repository<FinanceTransaction> {
    return AppDataSource.getRepository(FinanceTransaction);
  }

  // ─── Category helpers ───────────────────────────────────────────────────────

  /**
   * Tenant için ilgili adda kategori yoksa oluşturur ve id'sini döner.
   */
  private static async ensureCategory(
    tenantId: string,
    name: string,
    type: FinanceCategoryType
  ): Promise<string> {
    const repo = this.categoryRepo();
    let cat = await repo.findOne({
      where: { tenantId, name, type, parentId: IsNull() },
    });
    if (!cat) {
      cat = repo.create({ tenantId, name, type, isActive: true, sort: 99 });
      cat = await repo.save(cat);
    }
    return cat.id;
  }

  // ─── Payment method mapping ─────────────────────────────────────────────────

  private static mapPaymentMethod(raw?: string | null): FinancePaymentMethod {
    switch (raw) {
      case 'cash':
        return FinancePaymentMethod.CASH;
      case 'credit_card':
      case 'online':
        return FinancePaymentMethod.CARD;
      case 'bank_transfer':
        return FinancePaymentMethod.TRANSFER;
      default:
        return FinancePaymentMethod.OTHER;
    }
  }

  // ─── Shared: find existing transaction by reservationId ────────────────────

  private static async findPlanned(
    tenantId: string,
    field: 'reservationId' | 'transferReservationId',
    id: string
  ): Promise<FinanceTransaction | null> {
    return this.txRepo().findOne({
      where: { tenantId, [field]: id, status: FinanceTransactionStatus.PLANNED },
    });
  }

  // ─── Cari helper ────────────────────────────────────────────────────────────

  private static async resolveCariId(
    tenantId: string,
    name: string,
    email: string,
    phone?: string | null,
    currency?: string
  ): Promise<string | null> {
    try {
      const cari = await FinanceCariService.ensureByEmail(tenantId, {
        name,
        email,
        phone,
        currency,
      });
      return cari.id;
    } catch {
      return null;
    }
  }

  // ─── Tour / RentaCar Reservation ───────────────────────────────────────────

  /**
   * Rezervasyon durum değişikliğinde çağrılır.
   * Hata durumunda ana işlemi bloke etmez (catch'lenir).
   */
  static async recordForReservation(reservation: Reservation): Promise<void> {
    const { id, tenantId, status, reference, type } = reservation;

    const totalPrice = Number((reservation.metadata as any)?.totalPrice ?? 0);
    const currency: string = (reservation.metadata as any)?.currency ?? 'TRY';
    const paymentMethod = this.mapPaymentMethod(
      (reservation.metadata as any)?.paymentMethod
    );

    if (status === ReservationStatus.CONFIRMED) {
      const existing = await this.findPlanned(tenantId, 'reservationId', id);
      if (existing) return;

      if (totalPrice <= 0) return;

      const categoryName = type === 'tour' ? CATEGORY_TOUR : CATEGORY_RENTACAR;
      const [categoryId, cariId] = await Promise.all([
        this.ensureCategory(tenantId, categoryName, FinanceCategoryType.INCOME),
        this.resolveCariId(tenantId, reservation.customerName, reservation.customerEmail, reservation.customerPhone, currency),
      ]);

      await this.txRepo().save(
        this.txRepo().create({
          tenantId,
          type: FinanceTransactionType.INCOME,
          date: new Date(),
          amount: totalPrice,
          currency,
          categoryId,
          cariId,
          paymentMethod,
          status: FinanceTransactionStatus.PLANNED,
          referenceNo: reference,
          description: `${type === 'tour' ? 'Tur' : 'Araç Kiralama'} rezervasyonu onaylandı — ${reference}`,
          reservationId: id,
        })
      );
      return;
    }

    if (status === ReservationStatus.COMPLETED) {
      const existingPaid = await this.txRepo().findOne({
        where: {
          tenantId,
          reservationId: id,
          type: FinanceTransactionType.INCOME,
          status: FinanceTransactionStatus.PAID,
        },
      });
      if (existingPaid) return;

      const planned = await this.findPlanned(tenantId, 'reservationId', id);
      if (planned) {
        planned.status = FinanceTransactionStatus.PAID;
        planned.date = new Date();
        await this.txRepo().save(planned);
        return;
      }

      if (totalPrice <= 0) return;

      const categoryName = type === 'tour' ? CATEGORY_TOUR : CATEGORY_RENTACAR;
      const [categoryId, cariId] = await Promise.all([
        this.ensureCategory(tenantId, categoryName, FinanceCategoryType.INCOME),
        this.resolveCariId(tenantId, reservation.customerName, reservation.customerEmail, reservation.customerPhone, currency),
      ]);

      await this.txRepo().save(
        this.txRepo().create({
          tenantId,
          type: FinanceTransactionType.INCOME,
          date: new Date(),
          amount: totalPrice,
          currency,
          categoryId,
          cariId,
          paymentMethod,
          status: FinanceTransactionStatus.PAID,
          referenceNo: reference,
          description: `${type === 'tour' ? 'Tur' : 'Araç Kiralama'} tamamlandı — ${reference}`,
          reservationId: id,
        })
      );
      return;
    }

    if (status === ReservationStatus.CANCELLED) {
      const planned = await this.findPlanned(tenantId, 'reservationId', id);
      if (planned) {
        planned.status = FinanceTransactionStatus.CANCELLED;
        await this.txRepo().save(planned);
      }
    }
  }

  // ─── Transfer Reservation ───────────────────────────────────────────────────

  static async recordForTransferReservation(
    reservation: TransferReservation
  ): Promise<void> {
    const {
      id,
      tenantId,
      status,
      reference,
      totalPrice: rawTotal,
      currencyCode,
      paymentMethod: rawPm,
    } = reservation;

    const totalPrice = Number(rawTotal ?? 0);
    const currency = currencyCode ?? 'EUR';
    const paymentMethod = this.mapPaymentMethod(rawPm);

    if (status === TransferReservationStatus.CONFIRMED) {
      const existing = await this.findPlanned(tenantId, 'transferReservationId', id);
      if (existing) return;

      if (totalPrice <= 0) return;

      const [categoryId, cariId] = await Promise.all([
        this.ensureCategory(tenantId, CATEGORY_TRANSFER, FinanceCategoryType.INCOME),
        this.resolveCariId(tenantId, reservation.passengerName, reservation.passengerEmail, reservation.passengerPhone, currency),
      ]);

      await this.txRepo().save(
        this.txRepo().create({
          tenantId,
          type: FinanceTransactionType.INCOME,
          date: new Date(),
          amount: totalPrice,
          currency,
          categoryId,
          cariId,
          paymentMethod,
          status: FinanceTransactionStatus.PLANNED,
          referenceNo: reference,
          description: `Transfer rezervasyonu onaylandı — ${reference}`,
          transferReservationId: id,
        })
      );
      return;
    }

    if (status === TransferReservationStatus.COMPLETED) {
      const existingPaid = await this.txRepo().findOne({
        where: {
          tenantId,
          transferReservationId: id,
          type: FinanceTransactionType.INCOME,
          status: FinanceTransactionStatus.PAID,
        },
      });
      if (existingPaid) {
        const plannedAfterPartial = await this.findPlanned(tenantId, 'transferReservationId', id);
        if (plannedAfterPartial) {
          plannedAfterPartial.status = FinanceTransactionStatus.CANCELLED;
          plannedAfterPartial.description = `${plannedAfterPartial.description} (kısmi tahsilat sonrası transfer tamamlandı)`;
          await this.txRepo().save(plannedAfterPartial);
        }
        return;
      }

      const planned = await this.findPlanned(tenantId, 'transferReservationId', id);
      if (planned) {
        planned.status = FinanceTransactionStatus.PAID;
        planned.date = new Date();
        await this.txRepo().save(planned);
        return;
      }

      if (totalPrice <= 0) return;

      const [categoryId, cariId] = await Promise.all([
        this.ensureCategory(tenantId, CATEGORY_TRANSFER, FinanceCategoryType.INCOME),
        this.resolveCariId(tenantId, reservation.passengerName, reservation.passengerEmail, reservation.passengerPhone, currency),
      ]);

      await this.txRepo().save(
        this.txRepo().create({
          tenantId,
          type: FinanceTransactionType.INCOME,
          date: new Date(),
          amount: totalPrice,
          currency,
          categoryId,
          cariId,
          paymentMethod,
          status: FinanceTransactionStatus.PAID,
          referenceNo: reference,
          description: `Transfer tamamlandı — ${reference}`,
          transferReservationId: id,
        })
      );
      return;
    }

    if (status === TransferReservationStatus.CANCELLED) {
      const planned = await this.findPlanned(tenantId, 'transferReservationId', id);
      if (planned) {
        planned.status = FinanceTransactionStatus.CANCELLED;
        await this.txRepo().save(planned);
      }
    }
  }

  // ─── Query helpers ──────────────────────────────────────────────────────────

  /** Bir rezervasyona ait tüm muhasebe kayıtlarını döner. */
  static async listForReservation(
    reservationId: string,
    tenantId: string
  ): Promise<FinanceTransaction[]> {
    return this.txRepo().find({
      where: { tenantId, reservationId },
      relations: ['category'],
      order: { createdAt: 'DESC' },
    });
  }

  /** Bir transfer rezervasyonuna ait tüm muhasebe kayıtlarını döner. */
  static async listForTransferReservation(
    transferReservationId: string,
    tenantId: string
  ): Promise<FinanceTransaction[]> {
    return this.txRepo().find({
      where: { tenantId, transferReservationId },
      relations: ['category'],
      order: { createdAt: 'DESC' },
    });
  }

  /** Şoförün nakit tahsilatı onayı — PLANNED varsa PAID yapar, yoksa doğrudan gelir kaydı oluşturur. */
  static async recordDriverCashConfirmation(
    reservation: TransferReservation,
    amount: number,
    currency: string
  ): Promise<void> {
    await this.recordDriverPaymentConfirmation(reservation, amount, currency, FinancePaymentMethod.CASH);
  }

  /** Şoför tahsilatı (nakit / havale / kart POS / Stripe). */
  static async recordDriverPaymentConfirmation(
    reservation: TransferReservation,
    amount: number,
    currency: string,
    financeMethod: FinancePaymentMethod,
    options?: { convertedInReservationCurrency?: number }
  ): Promise<void> {
    const resCur = (reservation.currencyCode ?? 'EUR').slice(0, 3);
    const convertedRes =
      options?.convertedInReservationCurrency ??
      (await CurrencyService.convertAmount(amount, currency, resCur));

    const { id, tenantId, reference, passengerName, passengerEmail, passengerPhone } = reservation;
    const planned = await this.findPlanned(tenantId, 'transferReservationId', id);
    const categoryId = await this.ensureCategory(tenantId, CATEGORY_TRANSFER, FinanceCategoryType.INCOME);
    const cariId = await this.resolveCariId(
      tenantId,
      passengerName,
      passengerEmail,
      passengerPhone,
      currency
    );

    const label =
      financeMethod === FinancePaymentMethod.CASH
        ? 'Şoför nakit tahsilat'
        : financeMethod === FinancePaymentMethod.TRANSFER
          ? 'Şoför havale tahsilat'
          : financeMethod === FinancePaymentMethod.CARD
            ? 'Şoför kart tahsilat'
            : 'Şoför tahsilat';

    if (planned) {
      const plannedAmt = Number(planned.amount);
      const newPlannedAmt = roundMoney2(plannedAmt - convertedRes);
      if (newPlannedAmt <= 0.02) {
        planned.status = FinanceTransactionStatus.CANCELLED;
        planned.description = `${planned.description} (şoför tahsilatı ile kapandı)`;
      } else {
        planned.amount = newPlannedAmt;
      }
      await this.txRepo().save(planned);
    }

    await this.txRepo().save(
      this.txRepo().create({
        tenantId,
        type: FinanceTransactionType.INCOME,
        date: new Date(),
        amount,
        currency,
        categoryId,
        cariId,
        paymentMethod: financeMethod,
        status: FinanceTransactionStatus.PAID,
        referenceNo: reference,
        description: `${label} — ${reference}`,
        transferReservationId: id,
      })
    );
  }

  /** Tur / rentacar — personel tahsilatı (nakit / havale / kart / Stripe sonrası). */
  static async recordStaffPaymentConfirmation(
    reservation: Reservation,
    amount: number,
    currency: string,
    financeMethod: FinancePaymentMethod
  ): Promise<void> {
    const { id, tenantId, reference, customerName, customerEmail, customerPhone, type } = reservation;
    const planned = await this.findPlanned(tenantId, 'reservationId', id);
    const categoryName = type === ReservationType.TOUR ? CATEGORY_TOUR : CATEGORY_RENTACAR;
    const categoryId = await this.ensureCategory(tenantId, categoryName, FinanceCategoryType.INCOME);
    const cariId = await this.resolveCariId(tenantId, customerName, customerEmail, customerPhone, currency);

    const label =
      financeMethod === FinancePaymentMethod.CASH
        ? 'Tahsilat (nakit)'
        : financeMethod === FinancePaymentMethod.TRANSFER
          ? 'Tahsilat (havale)'
          : financeMethod === FinancePaymentMethod.CARD
            ? 'Tahsilat (kart)'
            : 'Tahsilat';

    if (planned) {
      planned.status = FinanceTransactionStatus.PAID;
      planned.amount = amount;
      planned.currency = currency;
      planned.date = new Date();
      planned.paymentMethod = financeMethod;
      planned.description = `${label} — ${reference}`;
      await this.txRepo().save(planned);
      return;
    }

    await this.txRepo().save(
      this.txRepo().create({
        tenantId,
        type: FinanceTransactionType.INCOME,
        date: new Date(),
        amount,
        currency,
        categoryId,
        cariId,
        paymentMethod: financeMethod,
        status: FinanceTransactionStatus.PAID,
        referenceNo: reference,
        description: `${label} — ${reference}`,
        reservationId: id,
      })
    );
  }
}
