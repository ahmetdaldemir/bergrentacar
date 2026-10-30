import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum MasterLocationType {
  MERKEZ = 'merkez',
  OTEL = 'otel',
  HAVALIMANI = 'havalimani',
  ADRESSE = 'adresse',
}

@Entity({ name: 'locations' })
export class MasterLocation extends BaseEntity {
  @Column({ length: 200 })
  name!: string;

  @ManyToOne(() => MasterLocation, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent?: MasterLocation | null;

  @Column({ name: 'parent_id', nullable: true })
  parentId?: string | null;

  @OneToMany(() => MasterLocation, (location) => location.parent)
  children!: MasterLocation[];

  @Column({ type: 'enum', enum: MasterLocationType, default: MasterLocationType.MERKEZ })
  type!: MasterLocationType;
}

