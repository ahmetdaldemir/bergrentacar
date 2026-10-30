import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Language } from './language.entity';
import { SurveyQuestion } from './survey-question.entity';
import { SurveyResponse } from './survey-response.entity';

export enum SurveyStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity({ name: 'surveys' })
export class Survey extends BaseEntity {
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

  @Column({ length: 200 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: SurveyStatus, default: SurveyStatus.DRAFT })
  status!: SurveyStatus;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'auto_send', default: false })
  autoSend!: boolean; // Rezervasyon sonrası otomatik gönderilsin mi?

  @Column({ name: 'send_after_days', type: 'int', default: 1, nullable: true })
  sendAfterDays?: number; // Rezervasyon bitişinden kaç gün sonra gönderilsin

  @Column({ name: 'email_subject', length: 200, nullable: true })
  emailSubject?: string; // E-posta konusu

  @Column({ name: 'email_template', type: 'text', nullable: true })
  emailTemplate?: string; // E-posta şablonu

  @OneToMany(() => SurveyQuestion, (question) => question.survey, { cascade: true })
  questions!: SurveyQuestion[];

  @OneToMany(() => SurveyResponse, (response) => response.survey)
  responses!: SurveyResponse[];
}

