/**
 * Transfer Module Event Handlers
 * 
 * Bu dosya transfer modülü event'lerini dinler ve gerekli aksiyonları alır.
 * Örnek: Rezervasyon oluşturulduğunda email gönder, task oluştur vb.
 */

import { EventBus, EventTypes, DomainEvent } from '../event-bus';
import { logger } from '../../utils/logger';

interface TransferReservationCreatedData {
  reservationId: string;
  reference: string;
  tenantId: string;
  passengerName: string;
  passengerEmail: string;
  vehicleName: string;
  transferDate: string;
  transferTime: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  totalPrice: number;
  currencyCode: string;
}

interface TransferDriverAssignedData {
  reservationId: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  tenantId: string;
}

/**
 * Transfer event handler'larını kaydet
 */
export function registerTransferEventHandlers(): void {
  // Transfer rezervasyonu oluşturulduğunda
  EventBus.on<TransferReservationCreatedData>(
    EventTypes.TRANSFER_RESERVATION_CREATED,
    async (event: DomainEvent<TransferReservationCreatedData>) => {
      const { data } = event;
      
      logger.info(`[TransferHandler] Reservation created: ${data.reference}`, {
        reservationId: data.reservationId,
        tenantId: data.tenantId,
        correlationId: event.correlationId,
      });

      // TODO: Email gönderme işlemi burada tetiklenebilir
      // EmailService.sendTransferConfirmation(data);
      
      // TODO: OpsTask oluşturma işlemi burada tetiklenebilir
      // OpsTaskService.createTransferTask(data);
    }
  );

  // Şoför atandığında
  EventBus.on<TransferDriverAssignedData>(
    EventTypes.TRANSFER_DRIVER_ASSIGNED,
    async (event: DomainEvent<TransferDriverAssignedData>) => {
      const { data } = event;
      
      logger.info(`[TransferHandler] Driver assigned to reservation`, {
        reservationId: data.reservationId,
        driverId: data.driverId,
        tenantId: data.tenantId,
        correlationId: event.correlationId,
      });

      // TODO: Müşteriye şoför bilgisi maili gönder
      // EmailService.sendDriverAssignedNotification(data);
    }
  );

  // Transfer tamamlandığında
  EventBus.on(
    EventTypes.TRANSFER_COMPLETED,
    async (event) => {
      logger.info(`[TransferHandler] Transfer completed`, {
        correlationId: event.correlationId,
      });

      // TODO: Survey gönder
      // SurveyService.sendTransferSurvey(event.data);
    }
  );

  logger.info('[TransferHandler] Transfer event handlers registered');
}
