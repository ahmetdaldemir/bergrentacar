import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Reservation } from '../../shared/entities/reservation.entity';

export enum OpsTaskType {
  CHECKOUT = 'checkout',
  RETURN = 'return',
}

export enum OpsTaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity({ name: 'ops_tasks' })
export class OpsTask extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Reservation, { nullable: false })
  @JoinColumn({ name: 'reservation_id' })
  reservation!: Reservation;

  @Column({ name: 'reservation_id' })
  reservationId!: string;

  @Column({ type: 'enum', enum: OpsTaskType })
  type!: OpsTaskType;

  @Column({ type: 'enum', enum: OpsTaskStatus, default: OpsTaskStatus.PENDING })
  status!: OpsTaskStatus;

  // Media references (stored as JSON array of media IDs)
  @Column({ type: 'jsonb', nullable: true })
  mediaIds?: string[];

  // Document verification
  @Column({ name: 'license_verified', default: false })
  licenseVerified!: boolean;

  @Column({ name: 'license_media_ids', type: 'jsonb', nullable: true })
  licenseMediaIds?: string[];

  @Column({ name: 'passport_verified', default: false })
  passportVerified!: boolean;

  @Column({ name: 'passport_media_ids', type: 'jsonb', nullable: true })
  passportMediaIds?: string[];

  // Return-specific fields
  @Column({ name: 'return_fuel_level', type: 'decimal', precision: 5, scale: 2, nullable: true })
  returnFuelLevel?: number;

  @Column({ name: 'return_mileage', type: 'int', nullable: true })
  returnMileage?: number;

  @Column({ name: 'return_damage_notes', type: 'text', nullable: true })
  returnDamageNotes?: string;

  @Column({ name: 'return_damage_media_ids', type: 'jsonb', nullable: true })
  returnDamageMediaIds?: string[];

  // Completed by user
  @Column({ name: 'completed_by_user_id', type: 'uuid', nullable: true })
  completedByUserId?: string;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt?: Date;

  // Performance tracking fields
  @Column({ name: 'scheduled_start_time', type: 'timestamp', nullable: true })
  scheduledStartTime?: Date; // When task should start (based on reservation)

  @Column({ name: 'actual_start_time', type: 'timestamp', nullable: true })
  actualStartTime?: Date; // When staff actually started the task

  @Column({ name: 'completion_delay_minutes', type: 'int', nullable: true })
  completionDelayMinutes?: number; // Minutes late/early from scheduled time

  // Checklist completion tracking
  @Column({ name: 'checklist_completed', type: 'boolean', default: false })
  checklistCompleted!: boolean;

  @Column({ name: 'checklist_items_total', type: 'int', default: 0 })
  checklistItemsTotal!: number;

  @Column({ name: 'checklist_items_completed', type: 'int', default: 0 })
  checklistItemsCompleted!: number;

  // Media requirements tracking
  @Column({ name: 'required_photos', type: 'int', default: 0 })
  requiredPhotos!: number;

  @Column({ name: 'uploaded_photos', type: 'int', default: 0 })
  uploadedPhotos!: number;

  @Column({ name: 'required_videos', type: 'int', default: 0 })
  requiredVideos!: number;

  @Column({ name: 'uploaded_videos', type: 'int', default: 0 })
  uploadedVideos!: number;

  // Error tracking
  @Column({ name: 'has_errors', type: 'boolean', default: false })
  hasErrors!: boolean;

  @Column({ name: 'error_count', type: 'int', default: 0 })
  errorCount!: number;

  @Column({ name: 'error_details', type: 'jsonb', nullable: true })
  errorDetails?: {
    dataEntryErrors?: number;
    verificationErrors?: number;
    otherErrors?: number;
    descriptions?: string[];
  };
}

