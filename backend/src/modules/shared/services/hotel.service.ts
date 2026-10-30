import { Repository } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { Hotel } from '../entities/hotel.entity';
import { Destination } from '../entities/destination.entity';

export type CreateHotelDto = {
  name: string;
  starRating?: number;
  address: string;
  city: string;
  country: string;
  destinationId: string;
  description?: string;
  locationUrl?: string;
};

export type UpdateHotelDto = Partial<CreateHotelDto>;

export class HotelService {
  private static repo(): Repository<Hotel> {
    return AppDataSource.getRepository(Hotel);
  }

  private static buildLocationUrl(name: string, city: string, country: string): string {
    const query = encodeURIComponent(`${name} ${city} ${country}`.trim());
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }

  static list(): Promise<Hotel[]> {
    return this.repo().find({ relations: ['destination'], order: { name: 'ASC' } });
  }

  static async create(input: CreateHotelDto): Promise<Hotel> {
    const destinationRepo = AppDataSource.getRepository(Destination);
    const destination = await destinationRepo.findOne({ where: { id: input.destinationId } });
    if (!destination) {
      throw new Error('Destination not found');
    }

    const locationUrl =
      input.locationUrl && input.locationUrl.trim().length > 0
        ? input.locationUrl
        : this.buildLocationUrl(input.name, input.city, input.country);

    const hotel = this.repo().create({
      destination,
      destinationId: destination.id,
      name: input.name,
      starRating: input.starRating ?? 0,
      address: input.address,
      city: input.city,
      country: input.country,
      description: input.description ?? undefined,
      locationUrl,
    });

    return this.repo().save(hotel);
  }

  static async update(id: string, input: UpdateHotelDto): Promise<Hotel> {
    const hotel = await this.repo().findOne({ where: { id } });
    if (!hotel) {
      throw new Error('Hotel not found');
    }

    if (typeof input.name === 'string') {
      hotel.name = input.name;
    }
    if (typeof input.starRating === 'number') {
      hotel.starRating = input.starRating;
    }
    if (typeof input.address === 'string') {
      hotel.address = input.address;
    }
    if (typeof input.city === 'string') {
      hotel.city = input.city;
    }
    if (typeof input.country === 'string') {
      hotel.country = input.country;
    }
    if (typeof input.description === 'string' || input.description === null) {
      hotel.description = input.description ?? null;
    }
    if (typeof input.locationUrl === 'string') {
      hotel.locationUrl = input.locationUrl.trim() ? input.locationUrl : undefined;
    } else if (!hotel.locationUrl && (input.name || input.city || input.country)) {
      hotel.locationUrl = this.buildLocationUrl(hotel.name, hotel.city, hotel.country);
    }

    if (input.destinationId) {
      const destinationRepo = AppDataSource.getRepository(Destination);
      const destination = await destinationRepo.findOne({ where: { id: input.destinationId } });
      if (!destination) {
        throw new Error('Destination not found');
      }
      hotel.destination = destination;
      hotel.destinationId = destination.id;
    }

    return this.repo().save(hotel);
  }

  static async remove(id: string): Promise<void> {
    const hotel = await this.repo().findOne({ where: { id } });
    if (!hotel) {
      throw new Error('Hotel not found');
    }
    await this.repo().remove(hotel);
  }
}
