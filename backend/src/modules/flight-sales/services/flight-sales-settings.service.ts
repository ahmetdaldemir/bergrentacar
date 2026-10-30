import { TenantSettingsService } from '../../shared/services/tenant-settings.service';
import { SettingsCategory } from '../../shared/entities/tenant-settings.entity';
import { FlightIntegrationProvider } from '../entities/flight-reservation.entity';
import type { FlightSalesSettingsPublic, FlightSalesSettingsStored } from '../types/flight-sales-settings';

const METADATA_KEY = 'flightSales';

function defaultSettings(): FlightSalesSettingsStored {
  return {
    enabled: false,
    provider: 'none',
    gtc: {},
  };
}

function maskStored(stored: FlightSalesSettingsStored): FlightSalesSettingsPublic {
  const gtc = stored.gtc
    ? {
        ...stored.gtc,
        password:
          stored.gtc.password && stored.gtc.password.length > 0 ? '***' : stored.gtc.password,
      }
    : undefined;
  return {
    enabled: stored.enabled,
    provider: stored.provider,
    ...(gtc ? { gtc } : {}),
  };
}

export class FlightSalesSettingsService {
  static async getStored(tenantId: string): Promise<FlightSalesSettingsStored> {
    const settings = await TenantSettingsService.getByCategory(tenantId, SettingsCategory.GENERAL);
    const raw = (settings?.metadata?.[METADATA_KEY] as FlightSalesSettingsStored | undefined) || undefined;
    if (!raw) return defaultSettings();
    return {
      ...defaultSettings(),
      ...raw,
      gtc: { ...defaultSettings().gtc, ...raw.gtc },
    };
  }

  static async getPublic(tenantId: string): Promise<FlightSalesSettingsPublic> {
    const stored = await this.getStored(tenantId);
    return maskStored(stored);
  }

  /** GTC istemcisi için tam kimlik bilgisi (sadece sunucu içi) */
  static async getGtcConfigForIntegration(tenantId: string): Promise<{
    apiUrl: string;
    username: string;
    password: string;
    agencyCode?: string;
  } | null> {
    const stored = await this.getStored(tenantId);
    if (!stored.enabled || stored.provider !== FlightIntegrationProvider.GTC) return null;
    const gtc = stored.gtc;
    if (!gtc?.apiUrl || !gtc?.username || !gtc?.password) return null;
    return {
      apiUrl: gtc.apiUrl,
      username: gtc.username,
      password: gtc.password,
      agencyCode: gtc.agencyCode,
    };
  }

  static async update(tenantId: string, input: Partial<FlightSalesSettingsStored>): Promise<FlightSalesSettingsPublic> {
    const current = await this.getStored(tenantId);
    const merged: FlightSalesSettingsStored = {
      ...current,
      ...input,
      gtc: {
        ...current.gtc,
        ...input.gtc,
      },
    };

    if (merged.gtc?.password === '***' || merged.gtc?.password === '') {
      merged.gtc.password = current.gtc?.password;
    }

    const repo = TenantSettingsService['repository']();
    let row = await repo.findOne({ where: { tenantId, category: SettingsCategory.GENERAL } });
    if (!row) {
      row = repo.create({
        tenantId,
        category: SettingsCategory.GENERAL,
        metadata: { [METADATA_KEY]: merged },
      });
    } else {
      row.metadata = {
        ...(row.metadata || {}),
        [METADATA_KEY]: merged,
      };
    }
    await repo.save(row);
    return maskStored(merged);
  }
}
