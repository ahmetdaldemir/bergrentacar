import { Column, Entity, JoinColumn, ManyToOne, Unique, Index } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Reservation } from '../../shared/entities/reservation.entity';

export enum InspectionType {
  PICKUP = 'pickup',
  RETURN = 'return',
}

@Entity({ name: 'rental_inspection_media' })
@Unique(['tenantId', 'reservationId', 'inspectionType', 'slotIndex'])
@Index(['tenantId', 'reservationId', 'inspectionType'])
export class RentalInspectionMedia extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Reservation, { nullable: false })
  @JoinColumn({ name: 'reservation_id' })
  reservation!: Reservation;

  @Column({ name: 'reservation_id', type: 'uuid' })
  reservationId!: string;

  @Column({ type: 'enum', enum: InspectionType })
  inspectionType!: InspectionType;

  @Column({ name: 'slot_index', type: 'int' })
  slotIndex!: number; // 1-8

  @Column({ name: 'media_url', type: 'text' })
  mediaUrl!: string; // URL to the uploaded photo

  @Column({ name: 'media_filename', type: 'varchar', length: 255, nullable: true })
  mediaFilename?: string | null; // Original filename if needed
}

