import { AppDataSource } from '../../../config/data-source';
import { TenantHotel, HotelSourceType, ChannelManagerProvider } from '../entities/tenant-hotel.entity';
import { HotelRoomType } from '../entities/hotel-room-type.entity';
import { NotFoundError, ValidationError } from '../../../utils/errors';

export type CreateTenantHotelInput = {
  tenantId: string;
  name: string;
  starRating?: number;
  address: string;
  city: string;
  country: string;
  description?: string;
  imageUrls?: string[];
  sourceType?: HotelSourceType;
  channelManagerProvider?: ChannelManagerProvider;
  channelManagerConfig?: Record<string, unknown>;
};

export type UpdateTenantHotelInput = Partial<Omit<CreateTenantHotelInput, 'tenantId'>> & {
  isActive?: boolean;
};

export type CreateRoomTypeInput = {
  hotelId: string;
  name: string;
  maxOccupancy?: number;
  description?: string;
  imageUrls?: string[];
};

export type UpdateRoomTypeInput = Partial<Omit<CreateRoomTypeInput, 'hotelId'>>;

export class TenantHotelService {
  private static hotelRepo() {
    return AppDataSource.getRepository(TenantHotel);
  }

  private static roomTypeRepo() {
    return AppDataSource.getRepository(HotelRoomType);
  }

  static async list(tenantId: string): Promise<TenantHotel[]> {
    return this.hotelRepo().find({
      where: { tenantId },
      relations: ['roomTypes'],
      order: { name: 'ASC' },
    });
  }

  static async getById(id: string, tenantId: string): Promise<TenantHotel> {
    const hotel = await this.hotelRepo().findOne({
      where: { id, tenantId },
      relations: ['roomTypes', 'roomTypes.contracts'],
    });
    if (!hotel) throw new NotFoundError('TenantHotel', id);
    return hotel;
  }

  static async create(input: CreateTenantHotelInput): Promise<TenantHotel> {
    if (input.sourceType === HotelSourceType.CHANNEL_MANAGER && !input.channelManagerProvider) {
      throw new ValidationError('channelManagerProvider is required for channel_manager source type');
    }
    const repo = this.hotelRepo();
    const hotel = repo.create({
      tenantId: input.tenantId,
      name: input.name,
      starRating: input.starRating ?? 0,
      address: input.address,
      city: input.city,
      country: input.country,
      description: input.description,
      imageUrls: input.imageUrls,
      sourceType: input.sourceType ?? HotelSourceType.MANUAL,
      channelManagerProvider: input.channelManagerProvider ?? null,
      channelManagerConfig: input.channelManagerConfig ?? null,
      isActive: true,
    });
    return repo.save(hotel);
  }

  static async update(id: string, tenantId: string, input: UpdateTenantHotelInput): Promise<TenantHotel> {
    const hotel = await this.getById(id, tenantId);
    Object.assign(hotel, input);
    return this.hotelRepo().save(hotel);
  }

  static async remove(id: string, tenantId: string): Promise<void> {
    const hotel = await this.getById(id, tenantId);
    await this.hotelRepo().remove(hotel);
  }

  // ── Room Types ─────────────────────────────────────────────────────────────

  static async listRoomTypes(hotelId: string, tenantId: string): Promise<HotelRoomType[]> {
    await this.getById(hotelId, tenantId);
    return this.roomTypeRepo().find({ where: { hotelId }, order: { name: 'ASC' } });
  }

  static async createRoomType(input: CreateRoomTypeInput, tenantId: string): Promise<HotelRoomType> {
    await this.getById(input.hotelId, tenantId);
    const repo = this.roomTypeRepo();
    const roomType = repo.create({
      hotelId: input.hotelId,
      name: input.name,
      maxOccupancy: input.maxOccupancy ?? 2,
      description: input.description,
      imageUrls: input.imageUrls,
    });
    return repo.save(roomType);
  }

  static async updateRoomType(id: string, hotelId: string, tenantId: string, input: UpdateRoomTypeInput): Promise<HotelRoomType> {
    await this.getById(hotelId, tenantId);
    const roomType = await this.roomTypeRepo().findOne({ where: { id, hotelId } });
    if (!roomType) throw new NotFoundError('HotelRoomType', id);
    Object.assign(roomType, input);
    return this.roomTypeRepo().save(roomType);
  }

  static async removeRoomType(id: string, hotelId: string, tenantId: string): Promise<void> {
    await this.getById(hotelId, tenantId);
    const roomType = await this.roomTypeRepo().findOne({ where: { id, hotelId } });
    if (!roomType) throw new NotFoundError('HotelRoomType', id);
    await this.roomTypeRepo().remove(roomType);
  }
}
