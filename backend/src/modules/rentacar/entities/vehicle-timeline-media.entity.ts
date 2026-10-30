import { Column, Entity, JoinColumn, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { VehicleDamage } from './vehicle-damage.entity';
import { VehicleMaintenance } from './vehicle-maintenance.entity';
import { VehiclePenalty } from './vehicle-penalty.entity';

export enum MediaType {
  IMAGE = 'image',
  DOCUMENT = 'document',
  VIDEO = 'video',
}

@Entity({ name: 'vehicle_timeline_media' })
@Index(['damageId'])
@Index(['maintenanceId'])
@Index(['penaltyId'])
export class VehicleTimelineMedia extends BaseEntity {
  @ManyToOne(() => VehicleDamage, (damage) => damage.media, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'damage_id' })
  damage?: VehicleDamage | null;

  @Column({ name: 'damage_id', nullable: true })
  damageId?: string | null;

  @ManyToOne(() => VehicleMaintenance, (maintenance) => maintenance.media, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'maintenance_id' })
  maintenance?: VehicleMaintenance | null;

  @Column({ name: 'maintenance_id', nullable: true })
  maintenanceId?: string | null;

  @ManyToOne(() => VehiclePenalty, (penalty) => penalty.media, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'penalty_id' })
  penalty?: VehiclePenalty | null;

  @Column({ name: 'penalty_id', nullable: true })
  penaltyId?: string | null;

  @Column({ type: 'enum', enum: MediaType, default: MediaType.IMAGE })
  type!: MediaType;

  @Column({ type: 'varchar', length: 500 })
  url!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  filename?: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100, nullable: true })
  mimeType?: string;

  @Column({ type: 'int', nullable: true })
  size?: number;

  @Column({ type: 'text', nullable: true })
  description?: string;
}

