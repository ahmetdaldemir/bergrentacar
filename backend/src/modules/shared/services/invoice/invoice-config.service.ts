import { Repository } from 'typeorm';
import { AppDataSource } from '../../../../config/data-source';
import { ReservationInvoiceConfig } from '../../entities/reservation-invoice-config.entity';

/**
 * Service for managing integrator configuration per tenant
 */
export class ReservationInvoiceConfigService {
  private static repo(): Repository<ReservationInvoiceConfig> {
    return AppDataSource.getRepository(ReservationInvoiceConfig);
  }

  /**
   * Get configuration for a specific integrator
   */
  static async getConfig(
    tenantId: string,
    integratorKey: string
  ): Promise<Record<string, unknown> | null> {
    const config = await this.repo().findOne({
      where: { tenantId, integratorKey },
    });

    if (!config) {
      return null;
    }

    return config.configData || {};
  }

  /**
   * Save or update integrator configuration
   */
  static async saveConfig(
    tenantId: string,
    integratorKey: string,
    configData: Record<string, unknown>
  ): Promise<ReservationInvoiceConfig> {
    let config = await this.repo().findOne({
      where: { tenantId, integratorKey },
    });

    if (!config) {
      config = this.repo().create({
        tenantId,
        integratorKey,
        configData,
      });
    } else {
      config.configData = configData;
    }

    return this.repo().save(config);
  }

  /**
   * Delete integrator configuration
   */
  static async deleteConfig(
    tenantId: string,
    integratorKey: string
  ): Promise<void> {
    await this.repo().delete({ tenantId, integratorKey });
  }

  /**
   * Get all configurations for a tenant (non-sensitive fields only)
   */
  static async getConfigsForTenant(tenantId: string): Promise<ReservationInvoiceConfig[]> {
    return this.repo().find({
      where: { tenantId },
    });
  }
}

