/**
 * Event Bus - Modüler Monolit Altyapısı
 * 
 * Bu servis modüller arası gevşek bağlı iletişim sağlar.
 * İleride microservice'e geçişte RabbitMQ/Kafka ile değiştirilebilir.
 * 
 * Kullanım:
 * ```typescript
 * // Event yayınla
 * EventBus.emit('reservation.created', { reservationId: '123', tenantId: 'abc' });
 * 
 * // Event dinle
 * EventBus.on('reservation.created', async (data) => {
 *   // Handle event
 * });
 * ```
 */

import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';

export type EventHandler<T = any> = (data: T) => Promise<void> | void;

export interface DomainEvent<T = any> {
  type: string;
  data: T;
  timestamp: Date;
  correlationId?: string;
  tenantId?: string;
}

// Event Types - Tüm domain event'leri burada tanımlanır
export enum EventTypes {
  // Reservation Events
  RESERVATION_CREATED = 'reservation.created',
  RESERVATION_UPDATED = 'reservation.updated',
  RESERVATION_CANCELLED = 'reservation.cancelled',
  RESERVATION_CONFIRMED = 'reservation.confirmed',
  
  // Transfer Events
  TRANSFER_RESERVATION_CREATED = 'transfer.reservation.created',
  TRANSFER_RESERVATION_CONFIRMED = 'transfer.reservation.confirmed',
  TRANSFER_DRIVER_ASSIGNED = 'transfer.driver.assigned',
  TRANSFER_COMPLETED = 'transfer.completed',
  
  // Customer Events
  CUSTOMER_CREATED = 'customer.created',
  CUSTOMER_UPDATED = 'customer.updated',
  CUSTOMER_DELETED = 'customer.deleted',
  
  // Finance Events
  PAYMENT_RECEIVED = 'finance.payment.received',
  INVOICE_CREATED = 'finance.invoice.created',
  TRANSACTION_CREATED = 'finance.transaction.created',
  
  // Email Events
  EMAIL_QUEUED = 'email.queued',
  EMAIL_SENT = 'email.sent',
  EMAIL_FAILED = 'email.failed',
  
  // Backup Events
  BACKUP_STARTED = 'backup.started',
  BACKUP_COMPLETED = 'backup.completed',
  BACKUP_FAILED = 'backup.failed',
  
  // Task/Ops Events
  TASK_CREATED = 'ops.task.created',
  TASK_COMPLETED = 'ops.task.completed',
  TASK_REMINDER = 'ops.task.reminder',
}

class EventBusService {
  private emitter: EventEmitter;
  private handlers: Map<string, Set<EventHandler>>;

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(50); // Çok sayıda listener için
    this.handlers = new Map();
  }

  /**
   * Event yayınla
   */
  emit<T>(eventType: EventTypes | string, data: T, options?: { tenantId?: string; correlationId?: string }): void {
    const event: DomainEvent<T> = {
      type: eventType,
      data,
      timestamp: new Date(),
      correlationId: options?.correlationId || this.generateCorrelationId(),
      tenantId: options?.tenantId,
    };

    logger.debug(`[EventBus] Emitting event: ${eventType}`, { 
      correlationId: event.correlationId,
      tenantId: event.tenantId,
    });

    // Asenkron emit - handler'lar birbirini beklemez
    setImmediate(() => {
      this.emitter.emit(eventType, event);
    });
  }

  /**
   * Event dinle
   */
  on<T>(eventType: EventTypes | string, handler: EventHandler<DomainEvent<T>>): void {
    // Handler'ları takip et (cleanup için)
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    // Event'i dinle
    this.emitter.on(eventType, async (event: DomainEvent<T>) => {
      try {
        await handler(event);
        logger.debug(`[EventBus] Handler completed for: ${eventType}`, {
          correlationId: event.correlationId,
        });
      } catch (error) {
        logger.error(`[EventBus] Handler error for: ${eventType}`, {
          error: error instanceof Error ? error.message : String(error),
          correlationId: event.correlationId,
        });
      }
    });

    logger.info(`[EventBus] Handler registered for: ${eventType}`);
  }

  /**
   * Tek seferlik event dinle
   */
  once<T>(eventType: EventTypes | string, handler: EventHandler<DomainEvent<T>>): void {
    this.emitter.once(eventType, async (event: DomainEvent<T>) => {
      try {
        await handler(event);
      } catch (error) {
        logger.error(`[EventBus] Once handler error for: ${eventType}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }

  /**
   * Event listener'ı kaldır
   */
  off(eventType: EventTypes | string, handler: EventHandler): void {
    this.emitter.off(eventType, handler);
    this.handlers.get(eventType)?.delete(handler);
    logger.debug(`[EventBus] Handler removed for: ${eventType}`);
  }

  /**
   * Tüm listener'ları kaldır (shutdown için)
   */
  removeAllListeners(eventType?: EventTypes | string): void {
    if (eventType) {
      this.emitter.removeAllListeners(eventType);
      this.handlers.delete(eventType);
    } else {
      this.emitter.removeAllListeners();
      this.handlers.clear();
    }
    logger.info('[EventBus] All listeners removed');
  }

  /**
   * Event listener sayısını al
   */
  listenerCount(eventType: EventTypes | string): number {
    return this.emitter.listenerCount(eventType);
  }

  /**
   * Correlation ID üret
   */
  private generateCorrelationId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

// Singleton instance
export const EventBus = new EventBusService();
