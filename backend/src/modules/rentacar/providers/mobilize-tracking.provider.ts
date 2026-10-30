import axios, { AxiosInstance } from 'axios';
import {
  VehicleTrackingProvider,
  VehicleLocation,
  VehicleTrackingInfo,
  TrackingProviderConfig,
} from '../interfaces/vehicle-tracking-provider.interface';
import { logger } from '../../../utils/logger';

/**
 * Mobilize Vehicle Tracking Provider
 * 
 * Documentation: https://mobilize.com.tr/api-docs (example)
 */
export class MobilizeTrackingProvider implements VehicleTrackingProvider {
  readonly name = 'mobilize';

  private createClient(config: TrackingProviderConfig): AxiosInstance {
    const apiUrl = config.apiUrl || 'https://api.mobilize.com.tr/api/v1';
    const apiKey = config.apiKey;

    if (!apiKey) {
      throw new Error('Mobilize API key is required');
    }

    return axios.create({
      baseURL: apiUrl,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }

  async getVehicleLocation(plate: string, config: TrackingProviderConfig): Promise<VehicleLocation | null> {
    try {
      const client = this.createClient(config);
      
      // Mobilize API endpoint example (adjust based on actual API)
      const response = await client.get(`/vehicles/${plate}/location`);
      
      if (!response.data || !response.data.latitude || !response.data.longitude) {
        logger.warn(`Mobilize: No location data for plate ${plate}`);
        return null;
      }

      return {
        latitude: response.data.latitude,
        longitude: response.data.longitude,
        speed: response.data.speed,
        heading: response.data.heading,
        timestamp: new Date(response.data.timestamp || Date.now()),
        address: response.data.address,
      };
    } catch (error) {
      logger.error(`Mobilize: Error getting location for plate ${plate}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async getVehicleTrackingInfo(plate: string, config: TrackingProviderConfig): Promise<VehicleTrackingInfo | null> {
    try {
      const client = this.createClient(config);
      
      // Mobilize API endpoint for detailed info
      const response = await client.get(`/vehicles/${plate}/tracking`);
      
      if (!response.data) {
        return null;
      }

      const data = response.data;
      const location: VehicleLocation = {
        latitude: data.latitude,
        longitude: data.longitude,
        speed: data.speed,
        heading: data.heading,
        timestamp: new Date(data.timestamp || Date.now()),
        address: data.address,
      };

      return {
        plate,
        location,
        isOnline: data.isOnline || false,
        lastUpdate: data.lastUpdate ? new Date(data.lastUpdate) : undefined,
        fuelLevel: data.fuelLevel,
        mileage: data.mileage,
        engineStatus: data.engineStatus,
        additionalData: data.additionalData,
      };
    } catch (error) {
      logger.error(`Mobilize: Error getting tracking info for plate ${plate}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async getMultipleVehicleLocations(
    plates: string[],
    config: TrackingProviderConfig
  ): Promise<Map<string, VehicleLocation | null>> {
    const result = new Map<string, VehicleLocation | null>();
    
    // Mobilize might support batch requests, otherwise fetch individually
    try {
      const client = this.createClient(config);
      
      // Try batch endpoint first
      const response = await client.post('/vehicles/locations/batch', { plates });
      
      if (response.data && Array.isArray(response.data)) {
        for (const item of response.data) {
          if (item.plate && item.latitude && item.longitude) {
            result.set(item.plate, {
              latitude: item.latitude,
              longitude: item.longitude,
              speed: item.speed,
              heading: item.heading,
              timestamp: new Date(item.timestamp || Date.now()),
              address: item.address,
            });
          }
        }
      }
    } catch (error) {
      logger.warn('Mobilize: Batch request failed, fetching individually', {
        error: error instanceof Error ? error.message : String(error),
      });
      
      // Fallback to individual requests
      const promises = plates.map(async (plate) => {
        const location = await this.getVehicleLocation(plate, config);
        return { plate, location };
      });
      
      const results = await Promise.all(promises);
      for (const { plate, location } of results) {
        result.set(plate, location);
      }
    }

    return result;
  }

  validateConfig(config: TrackingProviderConfig): boolean {
    return !!(config.apiKey && config.apiUrl);
  }
}

