import { Column, Entity, JoinColumn, ManyToOne, Unique, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Reservation } from './reservation.entity';
import { TransferReservation } from '../../transfer/entities/transfer-reservation.entity';

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  FAILED = 'failed',
}

@Entity({ name: 'reservation_invoices' })
@Index(['tenantId', 'reservationId'])
@Index(['tenantId', 'transferReservationId'])
export class ReservationInvoice extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  // Tur / Araç Kiralama rezervasyonu (biri mutlaka dolu olacak)
  @ManyToOne(() => Reservation, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reservation_id' })
  reservation?: Reservation | null;

  @Column({ name: 'reservation_id', type: 'uuid', nullable: true })
  reservationId?: string | null;

  // Transfer rezervasyonu
  @ManyToOne(() => TransferReservation, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'transfer_reservation_id' })
  transferReservation?: TransferReservation | null;

  @Column({ name: 'transfer_reservation_id', type: 'uuid', nullable: true })
  transferReservationId?: string | null;

  @Column({ name: 'integrator_key', type: 'varchar', length: 50 })
  integratorKey!: string; // 'none', 'parasut', 'entegrator_x', 'mock', etc.

  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  status!: InvoiceStatus;

  @Column({ name: 'vat_rate_used', type: 'decimal', precision: 5, scale: 2 })
  vatRateUsed!: number; // VAT rate used at time of invoice (percentage)

  @Column({ name: 'subtotal', type: 'decimal', precision: 12, scale: 2 })
  subtotal!: number;

  @Column({ name: 'vat_amount', type: 'decimal', precision: 12, scale: 2 })
  vatAmount!: number;

  @Column({ name: 'total', type: 'decimal', precision: 12, scale: 2 })
  total!: number;

  @Column({ name: 'external_invoice_id', type: 'varchar', length: 200, nullable: true })
  externalInvoiceId?: string | null; // Invoice ID from integrator

  @Column({ name: 'external_reference', type: 'varchar', length: 200, nullable: true })
  externalReference?: string | null; // Additional reference from integrator

  @Column({ name: 'request_payload', type: 'jsonb', nullable: true })
  requestPayload?: Record<string, unknown> | null; // Request sent to integrator

  @Column({ name: 'response_payload', type: 'jsonb', nullable: true })
  responsePayload?: Record<string, unknown> | null; // Response from integrator

  @Column({ name: 'pdf_url', type: 'text', nullable: true })
  pdfUrl?: string | null; // URL to invoice PDF if provided by integrator

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string | null; // Error message if status is FAILED
}

