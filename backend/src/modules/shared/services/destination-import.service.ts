import axios from 'axios';
import { DestinationService } from './destination.service';
import { LanguageService } from './language.service';
import { loadEnv } from '../../../config/env';

const env = loadEnv();

export type ImportDestinationsInput = {
  tenantId: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  limit?: number;
};

export type ImportDestinationsResult = {
  imported: string[];
  skipped: string[];
};

type RapidApiPlace = {
  location_id: string;
  name: string;
  address_obj?: {
    city?: string;
    country?: string;
  };
};

export class DestinationImportService {
  private static get apiKey(): string {
    if (!env.integrations.rapidApiKey) {
      throw new Error('RapidAPI key is not configured');
    }
    return env.integrations.rapidApiKey;
  }

  private static get apiHost(): string {
    return env.integrations.rapidApiTravelAdvisorHost ?? 'travel-advisor.p.rapidapi.com';
  }

  private static async searchLocation(query: string) {
    const response = await axios.get('https://travel-advisor.p.rapidapi.com/locations/search', {
      params: {
        query,
        limit: '1',
        sort: 'relevance',
        lang: 'en_US',
      },
      headers: {
        'X-RapidAPI-Key': this.apiKey,
        'X-RapidAPI-Host': this.apiHost,
      },
    });
    const data = response.data?.data?.[0]?.result_object;
    if (!data || !data.latitude || !data.longitude) {
      throw new Error('Location not found on RapidAPI');
    }
    return { lat: Number(data.latitude), lon: Number(data.longitude) };
  }

  private static async fetchNearby(lat: number, lon: number, radius = 15000, limit = 20) {
    const response = await axios.get('https://travel-advisor.p.rapidapi.com/attractions/list-by-latlng', {
      params: {
        latitude: lat,
        longitude: lon,
        radius,
        lunit: 'km',
        limit,
        lang: 'en_US',
      },
      headers: {
        'X-RapidAPI-Key': this.apiKey,
        'X-RapidAPI-Host': this.apiHost,
      },
    });
    return Array.isArray(response.data?.data) ? (response.data.data as RapidApiPlace[]) : [];
  }

  static async importGlobal(input: ImportDestinationsInput): Promise<ImportDestinationsResult> {
    const { city, latitude, longitude, radius = 15, limit = 20 } = input;

    // Get default language
    const defaultLanguage = await LanguageService.getDefault();
    if (!defaultLanguage) {
      throw new Error('No default language found. Please set a default language first.');
    }

    let coords = { lat: latitude, lon: longitude };
    if ((!coords.lat || !coords.lon) && city) {
      coords = await this.searchLocation(city);
    }
    if (!coords.lat || !coords.lon) {
      throw new Error('City or coordinates must be provided');
    }

    const places = await this.fetchNearby(coords.lat, coords.lon, radius, limit);

    const imported: string[] = [];
    const skipped: string[] = [];

    for (const place of places) {
      const name = place.name?.trim();
      if (!name) {
        skipped.push('Unnamed place');
        continue;
      }

      try {
        const destination = await DestinationService.create({
          tenantId: input.tenantId,
          translations: [
            {
              languageId: defaultLanguage.id,
              title: name,
              description: `${place.address_obj?.city || city || 'Unknown'}, ${place.address_obj?.country || 'Unknown'}`,
              shortDescription: undefined,
            },
          ],
        });
        // Get name from translations for response
        const title = destination.translations?.[0]?.name || name;
        imported.push(title);
      } catch (error) {
        skipped.push(name);
      }
    }

    return { imported, skipped };
  }
}
