import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

export enum ActivityLogSeverity {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export enum ActivityLogStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
}

export enum ActorType {
  USER = 'user',
  CUSTOMER = 'customer',
  SYSTEM = 'system',
}

@Entity({ name: 'activity_logs' })
@Index(['tenantId', 'createdAt'])
@Index(['module', 'action'])
@Index(['severity'])
@Index(['status'])
@Index(['actorId'])
@Index(['entityType', 'entityId'])
@Index(['requestId'])
export class ActivityLog extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant | null;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId?: string | null;

  // Module & Action
  @Column({ type: 'varchar', length: 64 })
  module!: string;

  @Column({ type: 'varchar', length: 64 })
  action!: string;

  // Severity & Status
  @Column({ type: 'varchar', length: 16, default: ActivityLogSeverity.INFO })
  severity!: ActivityLogSeverity;

  @Column({ type: 'varchar', length: 16, default: ActivityLogStatus.SUCCESS })
  status!: ActivityLogStatus;

  // Actor
  @Column({ name: 'actor_type', type: 'varchar', length: 16, nullable: true })
  actorType?: ActorType | null;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId?: string | null;

  @Column({ name: 'actor_label', type: 'varchar', length: 255, nullable: true })
  actorLabel?: string | null;

  // Entity
  @Column({ name: 'entity_type', type: 'varchar', length: 64, nullable: true })
  entityType?: string | null;

  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId?: string | null;

  @Column({ name: 'entity_label', type: 'varchar', length: 255, nullable: true })
  entityLabel?: string | null;

  // Message
  @Column({ type: 'text' })
  message!: string;

  // Request Context
  @Column({ name: 'request_id', type: 'varchar', length: 64, nullable: true })
  requestId?: string | null;

  @Column({ name: 'correlation_id', type: 'varchar', length: 64, nullable: true })
  correlationId?: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip?: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string | null;

  @Column({ type: 'text', nullable: true })
  path?: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  method?: string | null;

  @Column({ name: 'http_status', type: 'int', nullable: true })
  httpStatus?: number | null;

  @Column({ name: 'duration_ms', type: 'int', nullable: true })
  durationMs?: number | null;

  // Data (sanitized)
  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  before?: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  after?: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  diff?: Record<string, any> | null;

  // Error Details
  @Column({ name: 'error_code', type: 'varchar', length: 64, nullable: true })
  errorCode?: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string | null;

  @Column({ name: 'stack_trace', type: 'text', nullable: true })
  stackTrace?: string | null;
}
