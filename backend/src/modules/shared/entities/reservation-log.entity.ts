import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Reservation } from './reservation.entity';

export enum ReservationLogStatus {
  PENDING = 'pending', // Log kaydedildi, rezervasyon henüz oluşturulmadı
  SUCCESS = 'success', // Rezervasyon başarıyla oluşturuldu
  FAILED = 'failed', // Rezervasyon oluşturulurken hata oluştu
  CONVERTED = 'converted', // Log'dan manuel olarak rezervasyona çevrildi
}

@Entity({ name: 'reservation_logs' })
export class ReservationLog extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  // Rezervasyon isteği verileri (JSON)
  @Column({ name: 'request_data', type: 'jsonb' })
  requestData!: Record<string, any>;

  // Log durumu
  @Column({ type: 'enum', enum: ReservationLogStatus, default: ReservationLogStatus.PENDING })
  status!: ReservationLogStatus;

  // Hata mesajı (eğer rezervasyon oluşturulamadıysa)
  @Column({ type: 'text', nullable: true })
  error?: string;

  // Oluşturulan rezervasyon ID (eğer başarılıysa)
  @ManyToOne(() => Reservation, { nullable: true })
  @JoinColumn({ name: 'reservation_id' })
  reservation?: Reservation | null;

  @Column({ name: 'reservation_id', nullable: true })
  reservationId?: string | null;

  // IP adresi (opsiyonel)
  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  // User agent (opsiyonel)
  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string;
}

