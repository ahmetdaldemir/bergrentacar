import { Column, Entity, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum CurrencyCode {
  TRY = 'TRY',
  EUR = 'EUR',
  USD = 'USD',
  GBP = 'GBP',
}

@Entity({ name: 'currencies' })
@Unique(['code'])
export class Currency extends BaseEntity {
  @Column({ length: 3, unique: true })
  code!: CurrencyCode;

  @Column({ length: 100 })
  name!: string; // Turkish Lira, Euro, US Dollar, British Pound

  @Column({ name: 'symbol', length: 10, nullable: true })
  symbol?: string; // ₺, €, $, £

  @Column({ name: 'rate_to_try', type: 'decimal', precision: 10, scale: 4, default: 1.0 })
  rateToTry!: number; // TL'ye göre kur (TRY için 1.0, diğerleri için güncel kur)

  @Column({ name: 'is_base_currency', default: false })
  isBaseCurrency!: boolean; // TRY için true

  @Column({ default: true })
  isActive!: boolean;

  @Column({ name: 'last_updated_at', type: 'timestamp', nullable: true })
  lastUpdatedAt?: Date; // Son güncelleme zamanı

  @Column({ name: 'auto_update', default: true })
  autoUpdate!: boolean; // Otomatik güncelleme aktif mi
}

