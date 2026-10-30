import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Language } from './language.entity';

export enum CustomerGender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export enum CustomerIdType {
  TC = 'tc',
  PASSPORT = 'passport',
}

@Entity({ name: 'customers' })
export class Customer extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  // Kişisel Bilgiler
  @Column({ name: 'first_name', length: 100 })
  firstName!: string;

  @Column({ name: 'last_name', length: 100 })
  lastName!: string;

  @Column({ name: 'full_name', length: 200 })
  fullName!: string;

  @Column({ name: 'birth_place', length: 100, nullable: true })
  birthPlace?: string;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate?: Date;

  @Column({ type: 'enum', enum: CustomerGender, nullable: true })
  gender?: CustomerGender;

  // İletişim Bilgileri
  @ManyToOne(() => Language, { nullable: true })
  @JoinColumn({ name: 'language_id' })
  language?: Language | null;

  @Column({ name: 'language_id', nullable: true })
  languageId?: string | null;

  @Column({ length: 3, nullable: true })
  country?: string;

  @Column({ name: 'mobile_phone', length: 50, nullable: true })
  mobilePhone?: string;

  @Column({ name: 'home_phone', length: 50, nullable: true })
  homePhone?: string;

  @Column({ length: 160, nullable: true })
  email?: string;

  @Column({ name: 'password_hash', length: 200, nullable: true })
  passwordHash?: string;

  @Column({ name: 'password_reset_token', length: 255, nullable: true })
  passwordResetToken?: string;

  @Column({ name: 'password_reset_expires', type: 'timestamp', nullable: true })
  passwordResetExpires?: Date;

  // Vergi Bilgileri
  @Column({ name: 'tax_office', length: 100, nullable: true })
  taxOffice?: string;

  @Column({ name: 'tax_number', length: 50, nullable: true })
  taxNumber?: string;

  // Adres Bilgileri
  @Column({ name: 'home_address', type: 'text', nullable: true })
  homeAddress?: string;

  @Column({ name: 'work_address', type: 'text', nullable: true })
  workAddress?: string;

  // Kimlik / Pasaport Bilgileri
  @Column({ name: 'id_type', type: 'enum', enum: CustomerIdType, nullable: true })
  idType?: CustomerIdType;

  @Column({ name: 'id_number', length: 50, nullable: true })
  idNumber?: string;

  @Column({ name: 'id_issue_place', length: 100, nullable: true })
  idIssuePlace?: string;

  @Column({ name: 'id_issue_date', type: 'date', nullable: true })
  idIssueDate?: Date;

  // Ehliyet Bilgileri
  @Column({ name: 'license_number', length: 50, nullable: true })
  licenseNumber?: string;

  @Column({ name: 'license_class', length: 20, nullable: true })
  licenseClass?: string;

  @Column({ name: 'license_issue_place', length: 100, nullable: true })
  licenseIssuePlace?: string;

  @Column({ name: 'license_issue_date', type: 'date', nullable: true })
  licenseIssueDate?: Date;

  // Durum
  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'is_blacklisted', default: false })
  isBlacklisted!: boolean;
}

