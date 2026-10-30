/**
 * Vehicle Tracking Provider Interface
 * 
 * This interface allows different vehicle tracking systems to be integrated
 * as plugins. Each provider (Mobilize, etc.) implements this interface.
 */

export interface VehicleLocation {
  latitude: number;
  longitude: number;
  speed?: number; // km/h
  heading?: number; // degrees (0-360)
  timestamp: Date;
  address?: string;
}

export interface VehicleTrackingInfo {
  plate: string;
  location: VehicleLocation;
  isOnline: boolean;
  lastUpdate?: Date;
  fuelLevel?: number; // percentage (0-100)
  mileage?: number; // km
  engineStatus?: 'on' | 'off';
  additionalData?: Record<string, unknown>;
}

export interface VehicleTrackingProvider {
  /**
   * Provider name (e.g., 'mobilize', 'fleetio', etc.)
   */
  readonly name: string;

  /**
   * Get vehicle location by plate number
   */
  getVehicleLocation(plate: string, config: TrackingProviderConfig): Promise<VehicleLocation | null>;

  /**
   * Get detailed vehicle tracking information
   */
  getVehicleTrackingInfo(plate: string, config: TrackingProviderConfig): Promise<VehicleTrackingInfo | null>;

  /**
   * Get multiple vehicles' locations at once
   */
  getMultipleVehicleLocations(plates: string[], config: TrackingProviderConfig): Promise<Map<string, VehicleLocation | null>>;

  /**
   * Validate provider configuration
   */
  validateConfig(config: TrackingProviderConfig): boolean;
}

export interface TrackingProviderConfig {
  apiKey?: string;
  apiUrl?: string;
  username?: string;
  password?: string;
  [key: string]: unknown; // Allow additional provider-specific config
}

