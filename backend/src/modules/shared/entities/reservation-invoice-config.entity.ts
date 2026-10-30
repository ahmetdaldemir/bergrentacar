import { Column, Entity, JoinColumn, ManyToOne, Unique, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

/**
 * Stores integrator-specific configuration per tenant
 * Secrets should be encrypted at rest if encryption is available
 */
@Entity({ name: 'reservation_invoice_configs' })
@Unique(['tenantId', 'integratorKey'])
@Index(['tenantId', 'integratorKey'])
export class ReservationInvoiceConfig extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'integrator_key', type: 'varchar', length: 50 })
  integratorKey!: string; // 'parasut', 'entegrator_x', etc.

  /**
   * Configuration data (API keys, URLs, credentials, etc.)
   * Should be encrypted at rest if encryption is available
   */
  @Column({ name: 'config_data', type: 'jsonb' })
  configData!: Record<string, unknown>;
}

