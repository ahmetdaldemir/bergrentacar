import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity({ name: 'operations' })
export class Operation extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @Column({ length: 120 })
  type!: string;

  @Column({ name: 'performed_by', length: 120, nullable: true })
  performedBy?: string;

  @Column({ name: 'performed_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  performedAt!: Date;

  @Column({ type: 'jsonb', nullable: true })
  details?: Record<string, unknown> | null;
}
