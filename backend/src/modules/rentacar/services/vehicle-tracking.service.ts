import { VehicleTrackingProvider, VehicleLocation, VehicleTrackingInfo, TrackingProviderConfig } from '../interfaces/vehicle-tracking-provider.interface';
import { MobilizeTrackingProvider } from '../providers/mobilize-tracking.provider';
import { TenantSettings, SettingsCategory } from '../../shared/entities/tenant-settings.entity';
import { AppDataSource } from '../../../config/data-source';
import { Repository } from 'typeorm';
import { logger } from '../../../utils/logger';

export type TrackingSystemType = 'mobilize' | 'none';

/**
 * Vehicle Tracking Service
 * 
 * Manages vehicle tracking providers and routes requests to the appropriate provider
 * based on tenant settings.
 */
export class VehicleTrackingService {
  private static providers: Map<string, VehicleTrackingProvider> = new Map();

  static {
    // Register default providers
    this.registerProvider(new MobilizeTrackingProvider());
  }

  /**
   * Register a new tracking provider
   */
  static registerProvider(provider: VehicleTrackingProvider): void {
    this.providers.set(provider.name, provider);
    logger.info(`Registered vehicle tracking provider: ${provider.name}`);
  }

  /**
   * Get provider by name
   */
  static getProvider(name: string): VehicleTrackingProvider | null {
    return this.providers.get(name) || null;
  }

  /**
   * Get tenant's tracking system configuration
   */
  private static async getTenantTrackingConfig(tenantId: string): Promise<{
    system: TrackingSystemType;
    config: TrackingProviderConfig;
  } | null> {
    const settingsRepo = AppDataSource.getRepository(TenantSettings);
    const settings = await settingsRepo.findOne({
      where: { tenantId, category: SettingsCategory.GENERAL },
    });

    if (!settings || !settings.metadata) {
      return null;
    }

    const trackingSystem = (settings.metadata as any).vehicleTrackingSystem as TrackingSystemType || 'none';
    const trackingConfig = (settings.metadata as any).vehicleTrackingConfig as TrackingProviderConfig || {};

    return {
      system: trackingSystem,
      config: trackingConfig,
    };
  }

  /**
   * Get vehicle location by plate for a tenant
   */
  static async getVehicleLocation(tenantId: string, plate: string): Promise<VehicleLocation | null> {
    const tenantConfig = await this.getTenantTrackingConfig(tenantId);
    
    if (!tenantConfig || tenantConfig.system === 'none') {
      logger.debug(`No tracking system configured for tenant ${tenantId}`);
      return null;
    }

    const provider = this.getProvider(tenantConfig.system);
    if (!provider) {
      logger.warn(`Tracking provider '${tenantConfig.system}' not found for tenant ${tenantId}`);
      return null;
    }

    if (!provider.validateConfig(tenantConfig.config)) {
      logger.warn(`Invalid tracking config for tenant ${tenantId}, provider ${tenantConfig.system}`);
      return null;
    }

    return provider.getVehicleLocation(plate, tenantConfig.config);
  }

  /**
   * Get detailed vehicle tracking information
   */
  static async getVehicleTrackingInfo(tenantId: string, plate: string): Promise<VehicleTrackingInfo | null> {
    const tenantConfig = await this.getTenantTrackingConfig(tenantId);
    
    if (!tenantConfig || tenantConfig.system === 'none') {
      return null;
    }

    const provider = this.getProvider(tenantConfig.system);
    if (!provider) {
      return null;
    }

    if (!provider.validateConfig(tenantConfig.config)) {
      return null;
    }

    return provider.getVehicleTrackingInfo(plate, tenantConfig.config);
  }

  /**
   * Get multiple vehicle locations
   */
  static async getMultipleVehicleLocations(
    tenantId: string,
    plates: string[]
  ): Promise<Map<string, VehicleLocation | null>> {
    const tenantConfig = await this.getTenantTrackingConfig(tenantId);
    
    if (!tenantConfig || tenantConfig.system === 'none') {
      return new Map();
    }

    const provider = this.getProvider(tenantConfig.system);
    if (!provider) {
      return new Map();
    }

    if (!provider.validateConfig(tenantConfig.config)) {
      return new Map();
    }

    return provider.getMultipleVehicleLocations(plates, tenantConfig.config);
  }

  /**
   * List available tracking providers
   */
  static listProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}

