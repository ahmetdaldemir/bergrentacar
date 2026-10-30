import { AppDataSource } from '../../../config/data-source';
import { TenantSettings } from '../entities/tenant-settings.entity';

/**
 * Service for calculating ParaPuan (loyalty points) based on reservation
 */
export class ParaPuanCalculatorService {
  /**
   * Calculate ParaPuan amount for a reservation
   * Uses tenant settings if available, otherwise uses default rule (1%)
   */
  static async calculatePoints(
    tenantId: string,
    reservationTotalPrice: number
  ): Promise<number> {
    // Get tenant settings for ParaPuan configuration
    // ParaPuan rate is stored in metadata JSONB field
    const settingsRepo = AppDataSource.getRepository(TenantSettings);
    const settings = await settingsRepo.findOne({
      where: { tenantId, category: 'general' as any },
    });

    let rate = 0.01; // Default: 1%

    if (settings && settings.metadata) {
      try {
        const parapuanRate = (settings.metadata as any)?.parapuan_rate;
        if (parapuanRate !== undefined && parapuanRate !== null) {
          const customRate = typeof parapuanRate === 'string' ? parseFloat(parapuanRate) : Number(parapuanRate);
          if (!isNaN(customRate) && customRate >= 0 && customRate <= 1) {
            rate = customRate;
          }
        }
      } catch (error) {
        console.error('Error parsing parapuan_rate setting:', error);
      }
    }

    // Calculate points: reservationTotalPrice * rate
    const points = reservationTotalPrice * rate;

    // Round to 2 decimal places
    return Math.round(points * 100) / 100;
  }

  /**
   * Get default ParaPuan rate (1%)
   */
  static getDefaultRate(): number {
    return 0.01; // 1%
  }
}

