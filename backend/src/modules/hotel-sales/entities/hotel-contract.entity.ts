import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { TenantHotel } from './tenant-hotel.entity';
import { HotelRoomType } from './hotel-room-type.entity';

export enum BoardType {
  ROOM_ONLY = 'room_only',
  BREAKFAST = 'breakfast',
  HALF_BOARD = 'half_board',
  FULL_BOARD = 'full_board',
  ALL_INCLUSIVE = 'all_inclusive',
}

@Entity({ name: 'hotel_contracts' })
export class HotelContract extends BaseEntity {
  @ManyToOne(() => TenantHotel, { nullable: false })
  @JoinColumn({ name: 'hotel_id' })
  hotel!: TenantHotel;

  @Column({ name: 'hotel_id' })
  hotelId!: string;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => HotelRoomType, (rt) => rt.contracts, { nullable: false })
  @JoinColumn({ name: 'room_type_id' })
  roomType!: HotelRoomType;

  @Column({ name: 'room_type_id' })
  roomTypeId!: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: Date;

  @Column({ name: 'end_date', type: 'date' })
  endDate!: Date;

  @Column({ name: 'total_rooms', type: 'int' })
  totalRooms!: number;

  @Column({ name: 'price_per_night', type: 'decimal', precision: 10, scale: 2 })
  pricePerNight!: number;

  @Column({ name: 'currency_code', length: 3, default: 'EUR' })
  currencyCode!: string;

  @Column({ name: 'board_type', type: 'enum', enum: BoardType, default: BoardType.BREAKFAST })
  boardType!: BoardType;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;
}
