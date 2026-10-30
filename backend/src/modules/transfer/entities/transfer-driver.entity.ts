import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { TransferReservation } from './transfer-reservation.entity';

@Entity({ name: 'transfer_drivers' })
export class TransferDriver extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 32 })
  phone!: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  email?: string;

  @Column({ name: 'license_number', type: 'varchar', length: 50 })
  licenseNumber!: string;

  @Column({ name: 'license_expiry', type: 'date', nullable: true })
  licenseExpiry?: Date;

  @Column({ name: 'languages', type: 'simple-array', nullable: true })
  languages?: string[]; // ["tr", "en", "de"]

  @Column({ name: 'is_available', default: true })
  isAvailable!: boolean;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @OneToMany(() => TransferReservation, (reservation) => reservation.driver)
  reservations!: TransferReservation[];
}

