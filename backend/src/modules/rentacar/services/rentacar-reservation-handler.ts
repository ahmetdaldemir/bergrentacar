import {
  ReservationHandlerRegistry,
  type IReservationTypeHandler,
  type CheckoutResult,
  type CheckinResult,
} from '../../shared/services/reservation-handler.registry';
import { type Reservation, ReservationStatus, ReservationType } from '../../shared/entities/reservation.entity';

const rentacarHandler: IReservationTypeHandler = {
  type: ReservationType.RENTACAR,

  async recalculatePrice(id, tenantId, data) {
    const { RentacarReservationService } = await import('./rentacar-reservation.service');
    return RentacarReservationService.updateReservation(id, tenantId, data);
  },

  checkout(reservation: Reservation): CheckoutResult {
    const meta = (reservation.metadata || {}) as Record<string, unknown>;
    // `checkIn`/`checkOut` rent a car’da aynı zamanda planlanan alış–iade tarihleri; gerçek çıkışı metadata ile takip ediyoruz.
    if (meta.checkoutCompletedAt || meta.operationPickupCompletedAt) {
      throw new Error('Çıkış işlemi zaten yapılmış. Çıkış işlemi pasiftir.');
    }
    const plateNumber = meta?.plateNumber;
    if (!plateNumber || String(plateNumber).trim() === '') {
      throw new Error('Plaka atanmayan araçların çıkışı yapılamaz. Önce rezervasyona plaka atayın.');
    }
    const pickupDateStr = meta?.pickupDate;
    if (pickupDateStr) {
      const pickupDay = new Date(pickupDateStr as string);
      pickupDay.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (today < pickupDay) {
        throw new Error('Rezervasyon tarihi geldiği gün çıkış yapılabilir. Bir gün önceden çıkış işlemi yapılamaz.');
      }
    }
    const result: CheckoutResult = { checkIn: new Date() };
    if (reservation.status === ReservationStatus.PENDING) {
      result.newStatus = ReservationStatus.CONFIRMED;
    }
    return result;
  },

  checkin(reservation: Reservation): CheckinResult {
    const meta = (reservation.metadata || {}) as Record<string, unknown>;
    const hasOutbound =
      (typeof meta.checkoutCompletedAt === 'string' && String(meta.checkoutCompletedAt).length > 0) ||
      (typeof meta.operationPickupCompletedAt === 'string' && String(meta.operationPickupCompletedAt).length > 0);
    if (!hasOutbound) {
      throw new Error('Çıkışı yapılmamış aracın dönüşü yapılamaz. Önce alış işlemini tamamlayın.');
    }
    if (meta.checkinCompletedAt || meta.operationReturnCompletedAt) {
      throw new Error('Vehicle already checked in');
    }
    const plateNumber = meta?.plateNumber;
    if (!plateNumber || String(plateNumber).trim() === '') {
      throw new Error('Plaka atanmayan araçların dönüşü yapılamaz.');
    }
    return {
      checkOut: new Date(),
      newStatus: ReservationStatus.COMPLETED,
    };
  },
};

/**
 * Rentacar rezervasyon handler'ını registry'e kaydeder.
 * server.ts başlangıcında bir kez çağrılmalıdır.
 */
export function registerRentacarReservationHandler(): void {
  ReservationHandlerRegistry.register(rentacarHandler);
}
