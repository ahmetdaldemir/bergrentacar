import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from './tenant.entity';
import { stringArrayJsonColumnTransformer } from '../../../utils/string-array-json-column.transformer';

export enum TenantUserRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

@Entity({ name: 'tenant_users' })
@Unique(['email'])
export class TenantUser extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @Column({ length: 160 })
  name!: string;

  @Column({ length: 160 })
  email!: string;

  @Column({ name: 'password_hash', length: 200 })
  passwordHash!: string;

  @Column({ type: 'enum', enum: TenantUserRole, default: TenantUserRole.ADMIN })
  role!: TenantUserRole;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt?: Date | null;

  @Column({
    name: 'allowed_nav_keys',
    type: 'text',
    nullable: true,
    transformer: stringArrayJsonColumnTransformer,
  })
  allowedNavKeys?: string[] | null;

  /** Kullanıcı başına ana sayfa widget sırası, görünürlük ve grid genişliği (12 sütun) */
  @Column({ name: 'dashboard_layout', type: 'jsonb', nullable: true })
  dashboardLayout?: Record<string, unknown> | null;
}

