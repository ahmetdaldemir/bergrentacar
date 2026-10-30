import { Column, Entity, JoinColumn, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { TenantUser } from '../../tenants/entities/tenant-user.entity';

/**
 * Staff Performance Score Entity
 * Tracks performance metrics for staff members completing operations tasks
 */
@Entity({ name: 'staff_performance_scores' })
@Index(['tenantId', 'userId', 'period'])
@Index(['tenantId', 'period'])
export class StaffPerformanceScore extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => TenantUser, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: TenantUser;

  @Column({ name: 'user_id' })
  userId!: string;

  // Period tracking (YYYY-MM format for monthly, YYYY-WW for weekly)
  @Column({ type: 'varchar', length: 10 })
  period!: string; // e.g., "2024-01" for January 2024, "2024-W01" for week 1

  @Column({ type: 'enum', enum: ['monthly', 'weekly', 'daily'], default: 'monthly' })
  periodType!: 'monthly' | 'weekly' | 'daily';

  // Score components (0-100 scale)
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  timelinessScore!: number; // Based on on-time completion rate

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  completenessScore!: number; // Based on missing data penalties

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  accuracyScore!: number; // Based on error frequency

  // Overall score (weighted average)
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  overallScore!: number;

  // Metrics for calculation
  @Column({ name: 'total_tasks', type: 'int', default: 0 })
  totalTasks!: number;

  @Column({ name: 'completed_tasks', type: 'int', default: 0 })
  completedTasks!: number;

  @Column({ name: 'on_time_completions', type: 'int', default: 0 })
  onTimeCompletions!: number;

  @Column({ name: 'late_completions', type: 'int', default: 0 })
  lateCompletions!: number;

  @Column({ name: 'missing_data_count', type: 'int', default: 0 })
  missingDataCount!: number;

  @Column({ name: 'error_count', type: 'int', default: 0 })
  errorCount!: number;

  @Column({ name: 'total_errors', type: 'int', default: 0 })
  totalErrors!: number; // Sum of all errors across tasks

  // Detailed breakdowns (JSON)
  @Column({ type: 'jsonb', nullable: true })
  timelinessDetails?: {
    averageDelayMinutes?: number;
    onTimeRate?: number;
    lateRate?: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  completenessDetails?: {
    missingPhotos?: number;
    missingVideos?: number;
    missingLicense?: number;
    missingChecklistItems?: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  accuracyDetails?: {
    dataEntryErrors?: number;
    verificationErrors?: number;
    otherErrors?: number;
  };

  // Last calculated timestamp
  @Column({ name: 'last_calculated_at', type: 'timestamp', nullable: true })
  lastCalculatedAt?: Date;
}

