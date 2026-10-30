import { Column, Entity, JoinColumn, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Vehicle } from './vehicle.entity';
import { Reservation } from '../../shared/entities/reservation.entity';
import { ContractTemplate } from './contract-template.entity';
import { TenantUser } from '../../tenants/entities/tenant-user.entity';

export enum ContractStatus {
  DRAFT = 'draft',
  PENDING_SIGNATURE = 'pending_signature',
  SIGNED = 'signed',
  CANCELLED = 'cancelled',
}

export interface DigitalSignature {
  signerName: string;
  signerEmail?: string;
  signerPhone?: string;
  signedAt: Date;
  signatureImage?: string; // Base64 or URL
  ipAddress?: string;
  userAgent?: string;
}

@Entity({ name: 'contracts' })
@Index(['tenantId', 'reservationId'])
@Index(['tenantId', 'vehicleId'])
@Index(['tenantId', 'status'])
export class Contract extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => ContractTemplate, { nullable: false })
  @JoinColumn({ name: 'template_id' })
  template!: ContractTemplate;

  @Column({ name: 'template_id' })
  templateId!: string;

  @ManyToOne(() => Vehicle, { nullable: true })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle?: Vehicle | null;

  @Column({ name: 'vehicle_id', nullable: true })
  vehicleId?: string | null;

  @ManyToOne(() => Reservation, { nullable: true })
  @JoinColumn({ name: 'reservation_id' })
  reservation?: Reservation | null;

  @Column({ name: 'reservation_id', nullable: true })
  reservationId?: string | null;

  @Column({ type: 'varchar', length: 100, unique: true })
  contractNumber!: string; // Unique contract number (e.g., CNT-2024-001)

  @Column({ type: 'enum', enum: ContractStatus, default: ContractStatus.DRAFT })
  status!: ContractStatus;

  // Contract content (rendered with variables)
  @Column({ type: 'jsonb' })
  content!: {
    sections: Array<{
      id: string;
      type: string;
      title: string;
      content: string;
      order: number;
    }>;
    variables: Record<string, string>; // Variable values used
    styling: {
      logoUrl?: string;
      primaryColor: string;
      secondaryColor?: string;
      textColor: string;
    };
  };

  // Digital signatures
  @Column({ name: 'customer_signature', type: 'jsonb', nullable: true })
  customerSignature?: DigitalSignature;

  @Column({ name: 'company_signature', type: 'jsonb', nullable: true })
  companySignature?: DigitalSignature;

  @Column({ name: 'signed_at', type: 'timestamp', nullable: true })
  signedAt?: Date | null;

  // PDF storage
  @Column({ name: 'pdf_url', type: 'varchar', length: 500, nullable: true })
  pdfUrl?: string;

  @Column({ name: 'pdf_generated_at', type: 'timestamp', nullable: true })
  pdfGeneratedAt?: Date | null;

  // Email and WhatsApp
  @Column({ name: 'email_sent', default: false })
  emailSent!: boolean;

  @Column({ name: 'email_sent_at', type: 'timestamp', nullable: true })
  emailSentAt?: Date | null;

  @Column({ name: 'whatsapp_sent', default: false })
  whatsappSent!: boolean;

  @Column({ name: 'whatsapp_sent_at', type: 'timestamp', nullable: true })
  whatsappSentAt?: Date | null;

  // Customer information (snapshot at contract creation)
  @Column({ name: 'customer_name', type: 'varchar', length: 200 })
  customerName!: string;

  @Column({ name: 'customer_email', type: 'varchar', length: 200, nullable: true })
  customerEmail?: string;

  @Column({ name: 'customer_phone', type: 'varchar', length: 50, nullable: true })
  customerPhone?: string;

  @Column({ name: 'customer_id_number', type: 'varchar', length: 50, nullable: true })
  customerIdNumber?: string;

  // Created by
  @ManyToOne(() => TenantUser, { nullable: true })
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy?: TenantUser | null;

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId?: string | null;
}

