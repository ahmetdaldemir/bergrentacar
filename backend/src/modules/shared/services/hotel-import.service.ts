import axios from 'axios';
import { Repository } from 'typeorm';
import { loadEnv } from '../../../config/env';
import { DestinationService } from './destination.service';
import { LanguageService } from './language.service';
import { HotelService } from './hotel.service';
import { AppDataSource } from '../../../config/data-source';
import { Hotel } from '../entities/hotel.entity';

const env = loadEnv();

type RapidHotel = {
  name?: string;
  latitude?: string;
  longitude?: string;
  ranking_geo?: string;
  location_string?: string;
  address_obj?: {
    street1?: string;
    street2?: string;
    city?: string;
    country?: string;
  };
};

export type ImportHotelsInput = {
  tenantId: string;
  city: string;
  country?: string;
  radius?: number;
  limit?: number;
};

export type ImportHotelsResult = {
  created: string[];
  skipped: string[];
};

export class HotelImportService {
  private static get apiKey(): string {
    if (!env.integrations.rapidApiKey) {
      throw new Error('RapidAPI key is not configured');
    }
    return env.integrations.rapidApiKey;
  }

  private static get apiHost(): string {
    return env.integrations.rapidApiTravelAdvisorHost ?? 'travel-advisor.p.rapidapi.com';
  }

  private static hotelRepo(): Repository<Hotel> {
    return AppDataSource.getRepository(Hotel);
  }

  private static async geocodeCity(city: string, country?: string) {
    const { data } = await axios.get('https://travel-advisor.p.rapidapi.com/locations/search', {
      params: {
        query: country ? `${city} ${country}` : city,
        limit: '1',
        sort: 'relevance',
        lang: 'en_US',
      },
      headers: {
        'X-RapidAPI-Key': this.apiKey,
        'X-RapidAPI-Host': this.apiHost,
      },
    });

    const result = data?.data?.[0]?.result_object;
    if (!result?.latitude || !result?.longitude) {
      throw new Error(`Could not resolve coordinates for ${city}`);
    }

    return { lat: Number(result.latitude), lon: Number(result.longitude) };
  }

  private static async fetchHotels(lat: number, lon: number, radius: number, limit: number) {
    const { data } = await axios.get('https://travel-advisor.p.rapidapi.com/hotels/list-by-latlng', {
      params: {
        latitude: lat,
        longitude: lon,
        radius,
        lunit: 'km',
        lang: 'en_US',
        limit,
        currency: 'USD',
        adults: 2,
        rooms: 1,
        order: 'recommended',
      },
      headers: {
        'X-RapidAPI-Key': this.apiKey,
        'X-RapidAPI-Host': this.apiHost,
      },
    });

    const list: RapidHotel[] = Array.isArray(data?.data) ? data.data : [];
    return list.filter((item) => !!item?.name);
  }

  static async importByCity(input: ImportHotelsInput): Promise<ImportHotelsResult> {
    const { city, country, radius = 5, limit = 50 } = input;

    // Get default language
    const defaultLanguage = await LanguageService.getDefault();
    if (!defaultLanguage) {
      throw new Error('No default language found. Please set a default language first.');
    }

    const coords = await this.geocodeCity(city, country);
    const hotels = await this.fetchHotels(coords.lat, coords.lon, radius, limit);

    const created: string[] = [];
    const skipped: string[] = [];

    const repo = this.hotelRepo();

    for (const hotel of hotels) {
      const name = hotel.name?.trim();
      if (!name) {
        skipped.push('Unnamed hotel');
        continue;
      }

      const hotelCity = hotel.address_obj?.city?.trim() || hotel.ranking_geo?.trim() || city;
      const hotelCountry = hotel.address_obj?.country?.trim() || country || 'Türkiye';
      const address =
        hotel.address_obj?.street1 ||
        hotel.address_obj?.street2 ||
        hotel.location_string ||
        `${hotelCity}, ${hotelCountry}`;

      const exists = await repo.findOne({
        where: {
          name,
          city: hotelCity,
          country: hotelCountry,
        },
      });
      if (exists) {
        skipped.push(name);
        continue;
      }

      // Check if destination exists by checking all destinations and their translations
      const allDestinations = await DestinationService.list(input.tenantId);
      let destination = allDestinations.find(dest =>
        dest.translations?.some(t => t.languageId === defaultLanguage.id && t.name === hotelCity)
      );

      if (!destination) {
        destination = await DestinationService.create({
          tenantId: input.tenantId,
          translations: [
            {
              languageId: defaultLanguage.id,
              title: hotelCity,
              description: `${hotelCity}, ${hotelCountry}`,
              shortDescription: undefined,
            },
          ],
        });
      }

      const locationUrl =
        hotel.latitude && hotel.longitude
          ? `https://www.google.com/maps/search/?api=1&query=${hotel.latitude},${hotel.longitude}`
          : undefined;

      try {
        await HotelService.create({
          name,
          destinationId: destination.id,
          address,
          city: hotelCity,
          country: hotelCountry,
          locationUrl,
        });
        created.push(name);
      } catch (error) {
        skipped.push(name);
      }
    }

    return { created, skipped };
  }
}

