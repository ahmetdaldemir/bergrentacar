import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { FinanceCategory } from './finance-category.entity';
import { FinanceCari } from './finance-cari.entity';
import { Reservation } from '../../shared/entities/reservation.entity';
import { TransferReservation } from '../../transfer/entities/transfer-reservation.entity';

export enum FinanceTransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum FinancePaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  TRANSFER = 'TRANSFER',
  CHECK = 'CHECK',
  OTHER = 'OTHER',
}

export enum FinanceTransactionStatus {
  PLANNED = 'PLANNED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

@Entity({ name: 'finance_transactions' })
@Index(['tenantId', 'type', 'date'])
@Index(['tenantId', 'categoryId'])
@Index(['tenantId', 'cariId'])
@Index(['tenantId', 'status'])
export class FinanceTransaction extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'enum', enum: FinanceTransactionType })
  type!: FinanceTransactionType;

  @Column({ type: 'date' })
  date!: Date;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 3, default: 'TRY' })
  currency!: string;

  @ManyToOne(() => FinanceCategory, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category?: FinanceCategory | null;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId?: string | null;

  @ManyToOne(() => FinanceCari, { nullable: true })
  @JoinColumn({ name: 'cari_id' })
  cari?: FinanceCari | null;

  @Column({ name: 'cari_id', type: 'uuid', nullable: true })
  cariId?: string | null;

  @Column({ name: 'payment_method', type: 'enum', enum: FinancePaymentMethod, default: FinancePaymentMethod.TRANSFER })
  paymentMethod!: FinancePaymentMethod;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'reference_no', type: 'varchar', length: 80, nullable: true })
  referenceNo?: string | null;

  @Column({ name: 'attachment_url', type: 'text', nullable: true })
  attachmentUrl?: string | null;

  @Column({ type: 'enum', enum: FinanceTransactionStatus, default: FinanceTransactionStatus.PAID })
  status!: FinanceTransactionStatus;

  // Rezervasyon bağlantısı (Tur / Araç Kiralama)
  @ManyToOne(() => Reservation, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reservation_id' })
  reservation?: Reservation | null;

  @Column({ name: 'reservation_id', type: 'uuid', nullable: true })
  reservationId?: string | null;

  // Rezervasyon bağlantısı (Transfer)
  @ManyToOne(() => TransferReservation, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'transfer_reservation_id' })
  transferReservation?: TransferReservation | null;

  @Column({ name: 'transfer_reservation_id', type: 'uuid', nullable: true })
  transferReservationId?: string | null;
}

