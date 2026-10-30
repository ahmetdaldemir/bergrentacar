import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

/**
 * Chat Widget Token Entity
 * Her tenant için güvenli widget embed token'ı
 * Public key ile widget doğrulaması yapılır
 */
@Entity({ name: 'chat_widget_tokens' })
@Unique(['tenantId'])
export class ChatWidgetToken extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @Column({ name: 'public_key', length: 64, unique: true })
  publicKey!: string; // Widget embed için public key (data-key attribute)

  @Column({ name: 'secret_key', length: 128 })
  secretKey!: string; // Backend doğrulama için secret key

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
  lastUsedAt?: Date;

  @Column({ name: 'usage_count', type: 'int', default: 0 })
  usageCount!: number;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt?: Date; // Optional expiration

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>; // Additional configuration
}

