import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { TenantHotel } from './tenant-hotel.entity';
import { HotelContract } from './hotel-contract.entity';

@Entity({ name: 'hotel_room_types' })
export class HotelRoomType extends BaseEntity {
  @ManyToOne(() => TenantHotel, (hotel) => hotel.roomTypes, { nullable: false })
  @JoinColumn({ name: 'hotel_id' })
  hotel!: TenantHotel;

  @Column({ name: 'hotel_id' })
  hotelId!: string;

  @Column({ length: 200 })
  name!: string;

  @Column({ name: 'max_occupancy', type: 'int', default: 2 })
  maxOccupancy!: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'image_urls', type: 'simple-json', nullable: true })
  imageUrls?: string[];

  @OneToMany(() => HotelContract, (contract) => contract.roomType)
  contracts!: HotelContract[];
}
