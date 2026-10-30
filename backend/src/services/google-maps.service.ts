import axios from 'axios';
import { AppError, ErrorCode, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Google Maps API Service
 *
 * Services:
 * 1. Places API — autocomplete, place details
 * 2. Distance Matrix API — mesafe ve süre
 *
 * `apiKey` zorunlu: `tenant_settings.google_maps_api_key` (controller’lar TenantSettingsService ile okuyup geçirir).
 * Ortam değişkeni kullanılmaz.
 */

export interface PlaceAutocompleteResult {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  types: string[];
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  types: string[];
  addressComponents: any[];
}

export interface DistanceMatrixResult {
  originAddress: string;
  destinationAddress: string;
  distanceMeters: number;
  distanceText: string;
  durationSeconds: number;
  durationText: string;
  status: string;
}

/** Kiracı anahtarı (DB kolonu); çağıran her zaman geçirmeli */
export type GoogleMapsApiKeyOption = {
  apiKey?: string | null;
};

export class GoogleMapsService {
  private static resolveKey(apiKey?: string | null): string {
    const k = apiKey != null ? String(apiKey).trim() : '';
    if (!k) {
      throw new AppError(
        ErrorCode.GOOGLE_MAPS_API_KEY_REQUIRED,
        'Google Maps API anahtarı yok: tenant_settings (google_maps_api_key veya Ayarlar’daki Google anahtarı / metadata) tanımlanmalı.',
        400,
      );
    }
    return k;
  }

  /**
   * Autocomplete places search
   * https://developers.google.com/maps/documentation/places/web-service/autocomplete
   */
  static async autocomplete(
    input: string,
    options?: {
      types?: string[];
      language?: string;
      components?: string;
    } & GoogleMapsApiKeyOption,
  ): Promise<PlaceAutocompleteResult[]> {
    const key = this.resolveKey(options?.apiKey);

    try {
      const params: any = {
        input,
        key,
        language: options?.language || 'tr',
      };

      if (options?.types) {
        params.types = options.types.join('|');
      }

      if (options?.components) {
        params.components = options.components; // e.g., 'country:tr'
      }

      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/place/autocomplete/json',
        { params },
      );

      const data = response.data as {
        status: string;
        predictions?: unknown[];
        error_message?: string;
      };

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        const googleErr = typeof data.error_message === 'string' ? data.error_message : '';
        throw new AppError(
          ErrorCode.EXTERNAL_SERVICE_ERROR,
          `Google Places (autocomplete) başarısız: ${data.status}. ${googleErr || 'Cloud Console’da Places API ve faturalandırma etkin mi, API anahtarı kısıtları doğru mu kontrol edin.'}`,
          502,
          { googleStatus: data.status, googleErrorMessage: googleErr || undefined },
        );
      }

      const predictions = Array.isArray(data.predictions) ? data.predictions : [];
      return predictions.map((prediction: any) => ({
        placeId: prediction.place_id,
        description: prediction.description ?? '',
        mainText:
          prediction.structured_formatting?.main_text ?? prediction.description ?? '',
        secondaryText: prediction.structured_formatting?.secondary_text ?? '',
        types: Array.isArray(prediction.types) ? prediction.types : [],
      }));
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('Google Places Autocomplete error', { message: msg, error });
      throw new AppError(
        ErrorCode.EXTERNAL_SERVICE_ERROR,
        `Google Places (autocomplete) bağlantı veya yanıt hatası: ${msg}`,
        502,
      );
    }
  }

  /**
   * Get place details by place_id
   * https://developers.google.com/maps/documentation/places/web-service/details
   */
  static async getPlaceDetails(
    placeId: string,
    options?: {
      language?: string;
    } & GoogleMapsApiKeyOption,
  ): Promise<PlaceDetails> {
    const key = this.resolveKey(options?.apiKey);

    try {
      const params = {
        place_id: placeId,
        key,
        language: options?.language || 'tr',
        fields: 'place_id,name,formatted_address,geometry,type,address_component',
      };

      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/place/details/json',
        { params },
      );

      const pdata = response.data as {
        status: string;
        result?: any;
        error_message?: string;
      };

      if (pdata.status !== 'OK') {
        const googleErr = typeof pdata.error_message === 'string' ? pdata.error_message : '';
        throw new AppError(
          ErrorCode.EXTERNAL_SERVICE_ERROR,
          `Google Places (details) başarısız: ${pdata.status}. ${googleErr || 'API anahtarı ve Places API (Legacy) ayarlarını kontrol edin.'}`,
          502,
          { googleStatus: pdata.status, googleErrorMessage: googleErr || undefined },
        );
      }

      const place = pdata.result;
      if (!place?.geometry?.location) {
        throw new AppError(
          ErrorCode.EXTERNAL_SERVICE_ERROR,
          'Google Places: konum bilgisi eksik (geometry).',
          502,
        );
      }

      return {
        placeId: place.place_id,
        name: place.name ?? '',
        formattedAddress: place.formatted_address ?? '',
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        types: Array.isArray(place.types) ? place.types : [],
        addressComponents: place.address_components ?? [],
      };
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('Google Place Details error', { message: msg, error });
      throw new AppError(
        ErrorCode.EXTERNAL_SERVICE_ERROR,
        `Google Places (details) bağlantı veya yanıt hatası: ${msg}`,
        502,
      );
    }
  }

  /**
   * Calculate distance and duration between two locations
   * https://developers.google.com/maps/documentation/distance-matrix/overview
   */
  static async calculateDistance(
    origins: string | { lat: number; lng: number },
    destinations: string | { lat: number; lng: number },
    options?: {
      mode?: 'driving' | 'walking' | 'bicycling' | 'transit';
      language?: string;
      units?: 'metric' | 'imperial';
    } & GoogleMapsApiKeyOption,
  ): Promise<DistanceMatrixResult> {
    const key = this.resolveKey(options?.apiKey);

    try {
      const formatLocation = (location: string | { lat: number; lng: number }) => {
        if (typeof location === 'string') {
          return location;
        }
        return `${location.lat},${location.lng}`;
      };

      const params = {
        origins: formatLocation(origins),
        destinations: formatLocation(destinations),
        key,
        mode: options?.mode || 'driving',
        language: options?.language || 'tr',
        units: options?.units || 'metric',
      };

      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/distancematrix/json',
        { params },
      );

      if (response.data.status !== 'OK') {
        throw new AppError(
          ErrorCode.EXTERNAL_SERVICE_ERROR,
          `Google Distance Matrix başarısız: ${response.data.status}`,
          502,
          { googleStatus: response.data.status },
        );
      }

      const element = response.data.rows[0].elements[0];

      if (element.status !== 'OK') {
        throw new AppError(
          ErrorCode.EXTERNAL_SERVICE_ERROR,
          `Mesafe hesabı başarısız: ${element.status}`,
          502,
          { elementStatus: element.status },
        );
      }

      return {
        originAddress: response.data.origin_addresses[0],
        destinationAddress: response.data.destination_addresses[0],
        distanceMeters: element.distance.value,
        distanceText: element.distance.text,
        durationSeconds: element.duration.value,
        durationText: element.duration.text,
        status: element.status,
      };
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('Google Distance Matrix error', { message: msg, error });
      throw new AppError(
        ErrorCode.EXTERNAL_SERVICE_ERROR,
        `Google Distance Matrix bağlantı veya yanıt hatası: ${msg}`,
        502,
      );
    }
  }

  private static haversineMeters(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
  }

  /**
   * Kuş uçuşu × ~1.25 — Google Distance Matrix kapalı / REQUEST_DENIED iken tahmini yol km.
   */
  static approximateDrivingKmFromCoords(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const straightKm = this.haversineMeters(lat1, lng1, lat2, lng2) / 1000;
    return Math.max(1, Math.round(straightKm * 1.25));
  }

  /**
   * Rezervasyon oluşturma vb.: önce Distance Matrix, hata olursa koordinatlardan tahmini km (500 dönmez).
   */
  static async calculateDistanceCoordsWithFallback(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    options?: GoogleMapsApiKeyOption,
  ): Promise<DistanceMatrixResult & { approximate: boolean }> {
    const o = { lat: Number(origin.lat), lng: Number(origin.lng) };
    const d = { lat: Number(destination.lat), lng: Number(destination.lng) };
    if (![o.lat, o.lng, d.lat, d.lng].every((n) => Number.isFinite(n))) {
      throw new ValidationError('Geçersiz koordinatlar (mesafe hesaplanamıyor)');
    }
    try {
      const hasKey = options?.apiKey != null && String(options.apiKey).trim() !== '';
      if (!hasKey) {
        throw new AppError(
          ErrorCode.GOOGLE_MAPS_API_KEY_REQUIRED,
          'Google Maps API anahtarı yok (tenant ayarları).',
          400,
        );
      }
      const r = await this.calculateDistance(o, d, { apiKey: options?.apiKey });
      return { ...r, approximate: false };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.warn('Distance Matrix kullanılamadı, tahmini mesafe kullanılıyor', {
        error: msg,
      });
      const km = this.approximateDrivingKmFromCoords(o.lat, o.lng, d.lat, d.lng);
      const m = km * 1000;
      return {
        originAddress: `${o.lat},${o.lng}`,
        destinationAddress: `${d.lat},${d.lng}`,
        distanceMeters: m,
        distanceText: `~${km} km (tahmini)`,
        durationSeconds: 0,
        durationText: '—',
        status: 'APPROXIMATE',
        approximate: true,
      };
    }
  }
}
