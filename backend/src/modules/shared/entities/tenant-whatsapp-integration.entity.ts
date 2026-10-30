import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

/**
 * Tenant başına Twilio WhatsApp (gelen `To` numarası) ve isteğe bağlı AI/Twilio kimlik bilgileri.
 * whatsapp-service gelen webhook’taki iş numarasını E.164 ile eşleştirir.
 */
@Entity({ name: 'tenant_whatsapp_integrations' })
@Unique(['tenantId'])
export class TenantWhatsAppIntegration extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  /** Twilio Console’daki iş hesabı; boşsa whatsapp-service ortam değişkenleri kullanılır */
  @Column({ name: 'twilio_account_sid', type: 'varchar', length: 64, nullable: true })
  twilioAccountSid?: string | null;

  @Column({ name: 'twilio_auth_token', type: 'varchar', length: 500, nullable: true })
  twilioAuthToken?: string | null;

  /** Gelen mesajdaki `To` ile eşleşecek numara, E.164 (örn. +14155238886) */
  @Column({ name: 'twilio_whatsapp_from_e164', type: 'varchar', length: 32 })
  twilioWhatsappFromE164!: string;

  @Column({ name: 'is_enabled', default: true })
  isEnabled!: boolean;

  /** WhatsApp botu için ek sistem talimatları (marka dili, hizmet alanı vb.) */
  @Column({ name: 'whatsapp_ai_system_prompt', type: 'text', nullable: true })
  whatsappAiSystemPrompt?: string | null;

  /** Boşsa paneldeki genel OpenAI anahtarı veya servis ortamı kullanılır */
  @Column({ name: 'whatsapp_openai_api_key', type: 'varchar', length: 500, nullable: true })
  whatsappOpenaiApiKey?: string | null;

  @Column({ name: 'openai_model', type: 'varchar', length: 64, nullable: true })
  openaiModel?: string | null;
}
