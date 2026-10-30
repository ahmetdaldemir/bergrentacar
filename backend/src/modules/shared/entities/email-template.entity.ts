import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Language } from './language.entity';

export enum EmailTemplateType {
  RESERVATION_CONFIRMATION = 'reservation_confirmation',
  RESERVATION_CONFIRMED    = 'reservation_confirmed',
  RESERVATION_REJECTED     = 'reservation_rejected',
  RESERVATION_CANCELLED    = 'reservation_cancelled',
  RESERVATION_COMPLETED    = 'reservation_completed',
  VEHICLE_PICKUP           = 'vehicle_pickup',
  SURVEY_INVITATION        = 'survey_invitation',
  CUSTOMER_WELCOME         = 'customer_welcome',
  PASSWORD_RESET           = 'password_reset',
  CUSTOM                   = 'custom',
}

@Entity({ name: 'email_templates' })
export class EmailTemplate extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Language, { nullable: true })
  @JoinColumn({ name: 'language_id' })
  language?: Language | null;

  @Column({ name: 'language_id', nullable: true })
  languageId?: string | null;

  @Column({ type: 'enum', enum: EmailTemplateType })
  type!: EmailTemplateType;

  @Column({ length: 200 })
  name!: string; // Template name (e.g., "Rezervasyon Onay Maili")

  @Column({ length: 255 })
  subject!: string; // Email subject (can contain variables like {{customerName}})

  @Column({ type: 'text' })
  body!: string; // HTML email body (can contain variables)

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ type: 'text', nullable: true })
  description?: string; // Description of when this template is used
}

