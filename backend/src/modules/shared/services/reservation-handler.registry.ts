import { Reservation, ReservationStatus } from '../entities/reservation.entity';

/**
 * Araç teslim alma (checkout) sonucunda set edilecek alanlar.
 */
export interface CheckoutResult {
  checkIn: Date;
  newStatus?: ReservationStatus;
}

/**
 * Araç iade (checkin) sonucunda set edilecek alanlar.
 */
export interface CheckinResult {
  checkOut: Date;
  newStatus: ReservationStatus;
}

/**
 * Rezervasyon tipi başına kayıt edilen handler arayüzü.
 *
 * Yeni bir rezervasyon tipi eklemek için:
 *   1. Bu interface'i implement eden bir handler oluştur.
 *   2. Server başlangıcında `ReservationHandlerRegistry.register(handler)` çağır.
 *   3. ReservationService'de hiçbir değişiklik yapma.
 */
export interface IReservationTypeHandler {
  readonly type: string;

  /**
   * update() çağrısında recalculatePrice=true ise tetiklenir.
   * Fiyatı yeniden hesaplayarak güncellenmiş rezervasyonu döner.
   */
  recalculatePrice?(
    id: string,
    tenantId: string,
    data: Partial<Reservation>,
  ): Promise<Reservation>;

  /**
   * processCheckout() çağrısında tetiklenir.
   * Geçersiz durum varsa hata fırlatmalı; başarılıysa set edilecek alanları döner.
   */
  checkout?(reservation: Reservation): CheckoutResult;

  /**
   * processCheckin() çağrısında tetiklenir.
   * Geçersiz durum varsa hata fırlatmalı; başarılıysa set edilecek alanları döner.
   */
  checkin?(reservation: Reservation): CheckinResult;
}

class ReservationHandlerRegistryClass {
  private readonly handlers = new Map<string, IReservationTypeHandler>();

  register(handler: IReservationTypeHandler): void {
    this.handlers.set(handler.type, handler);
  }

  get(type: string): IReservationTypeHandler | undefined {
    return this.handlers.get(type);
  }
}

export const ReservationHandlerRegistry = new ReservationHandlerRegistryClass();
