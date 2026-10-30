import { AppDataSource } from '../../../config/data-source';
import { Tenant, TenantCategory } from '../../tenants/entities/tenant.entity';
import { TenantSettingsService } from './tenant-settings.service';
import { SettingsCategory } from '../entities/tenant-settings.entity';

export type TenantFeatures = {
  finance?: boolean;
  vehicleTracking?: boolean;
  chat?: boolean;
  ai?: boolean;
  deepl?: boolean; // DeepL API kullanımı için admin izni
  /** Modüller: admin tarafından tenant'a açılır; açık olan modül menüsü gösterilir */
  tour?: boolean;
  transfer?: boolean;
  /** Transfer modülü açıkken Shuttle alt menüsü ve shuttle API; kapalıysa yalnızca VIP hattı (varsayılan: açık) */
  transferShuttle?: boolean;
  rentacar?: boolean;
  hotel?: boolean;
  flight?: boolean;
};

export class TenantFeaturesService {
  /**
   * Get tenant features from metadata
   */
  static async getFeatures(tenantId: string): Promise<TenantFeatures> {
    const settings = await TenantSettingsService.getByCategory(tenantId, SettingsCategory.GENERAL);
    const features = (settings?.metadata?.features as TenantFeatures) || {};

    const tenant = await AppDataSource.getRepository(Tenant).findOne({ where: { id: tenantId } });
    const cat = tenant?.category;

    /**
     * Admin panelinde açıkça ayarlanmadıysa, modül bayrakları tenant kategorisiyle hizalanır (geriye dönük uyum).
     * Açıkça `true` / `false` yazıldıysa metadata önceliklidir.
     */
    const tour =
      features.tour !== undefined ? features.tour : cat === TenantCategory.TOUR;
    const transfer =
      features.transfer !== undefined ? features.transfer : cat === TenantCategory.TRANSFER;
    const rentacar =
      features.rentacar !== undefined ? features.rentacar : cat === TenantCategory.RENTACAR;

    /** Shuttle: yalnızca transfer açıkken anlamlı; metadata yoksa true (mevcut davranış) */
    const transferShuttle = transfer
      ? (features.transferShuttle !== undefined ? features.transferShuttle : true)
      : false;

    return {
      /** Ön muhasebe tüm tenantlarda aktif; metadata yok sayılır */
      finance: true,
      vehicleTracking: features.vehicleTracking ?? false,
      chat: features.chat ?? false,
      ai: features.ai ?? false,
      deepl: features.deepl ?? false,
      tour,
      transfer,
      transferShuttle,
      rentacar,
      hotel: features.hotel ?? false,
      flight: features.flight ?? false,
    };
  }

  /** Metadata + AI ayarından birleşik bayraklar (panel `/settings/features` ile uyumlu) */
  static async getMergedFeatures(tenantId: string): Promise<TenantFeatures> {
    const features = await this.getFeatures(tenantId);
    const aiSettings = await TenantSettingsService.getAiSettings(tenantId);
    const aiFlagFromAiSettings = aiSettings && (aiSettings.metadata as Record<string, unknown>)?.aiEnabled;
    return {
      ...features,
      finance: true,
      ai: typeof aiFlagFromAiSettings === 'boolean' ? aiFlagFromAiSettings : features.ai,
    };
  }

  /**
   * Update tenant features
   */
  static async updateFeatures(tenantId: string, features: Partial<TenantFeatures>): Promise<void> {
    const existingSettings = await TenantSettingsService.getByCategory(tenantId, SettingsCategory.GENERAL);
    
    const currentFeatures = (existingSettings?.metadata?.features as TenantFeatures) || {};
    const updatedFeatures = { ...currentFeatures, ...features, finance: true };

    // Use repository directly to update metadata
    const repo = TenantSettingsService['repository']();
    let settingsToUpdate = await repo.findOne({
      where: { tenantId, category: SettingsCategory.GENERAL },
    });

    if (!settingsToUpdate) {
      settingsToUpdate = repo.create({
        tenantId,
        category: SettingsCategory.GENERAL,
        metadata: { features: updatedFeatures },
      });
    } else {
      settingsToUpdate.metadata = {
        ...(settingsToUpdate.metadata || {}),
        features: updatedFeatures,
      };
    }

    await repo.save(settingsToUpdate);
  }

  /**
   * Check if tenant has a specific feature
   */
  static async hasFeature(tenantId: string, feature: keyof TenantFeatures): Promise<boolean> {
    if (feature === 'finance') return true;
    const features = await this.getFeatures(tenantId);
    return features[feature] ?? false;
  }
}

