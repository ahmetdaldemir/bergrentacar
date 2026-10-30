import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from './tenant.entity';
import { TenantUser } from './tenant-user.entity';

export enum TenantMessageType {
  REMINDER = 'reminder',
  MESSAGE = 'message',
}

@Entity({ name: 'tenant_messages' })
export class TenantMessage extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @Column({ length: 200 })
  title!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'enum', enum: TenantMessageType, default: TenantMessageType.MESSAGE })
  type!: TenantMessageType;

  @ManyToOne(() => TenantUser, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdBy?: TenantUser | null;

  @Column({ name: 'created_by', nullable: true })
  createdById?: string | null;

  @Column({ default: false })
  isRead!: boolean;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt?: Date | null;
}

