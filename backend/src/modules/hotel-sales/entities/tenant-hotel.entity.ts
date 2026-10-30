import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { HotelRoomType } from './hotel-room-type.entity';

export enum HotelSourceType {
  MANUAL = 'manual',
  CHANNEL_MANAGER = 'channel_manager',
}

export enum ChannelManagerProvider {
  BEDS24 = 'beds24',
  MY_ALLOCATOR = 'myallocator',
}

@Entity({ name: 'tenant_hotels' })
export class TenantHotel extends BaseEntity {
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @Column({ length: 200 })
  name!: string;

  @Column({ name: 'star_rating', type: 'decimal', precision: 2, scale: 1, default: 0 })
  starRating!: number;

  @Column({ length: 255 })
  address!: string;

  @Column({ length: 100 })
  city!: string;

  @Column({ length: 100 })
  country!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'image_urls', type: 'simple-json', nullable: true })
  imageUrls?: string[];

  @Column({ name: 'source_type', type: 'enum', enum: HotelSourceType, default: HotelSourceType.MANUAL })
  sourceType!: HotelSourceType;

  @Column({ name: 'channel_manager_provider', type: 'enum', enum: ChannelManagerProvider, nullable: true })
  channelManagerProvider?: ChannelManagerProvider | null;

  @Column({ name: 'channel_manager_config', type: 'jsonb', nullable: true })
  channelManagerConfig?: Record<string, unknown> | null;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @OneToMany(() => HotelRoomType, (roomType) => roomType.hotel)
  roomTypes!: HotelRoomType[];
}
