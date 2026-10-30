import type { DataSource } from 'typeorm';
import { logger } from '../utils/logger';

/**
 * tenant_settings üzerindeki API key kolonları entity ile uyumlu olsun diye idempotent ALTER.
 *
 * Neden gerekli:
 * - Production'da DB_SYNC=false ise TypeORM kolon eklemez; sadece bu kolonlar eksik kalabilirdi.
 * - Eski deploy + synchronize bazen manuel/sonradan eklenen kolonları silebiliyor; yeniden eklenmesi gerekir.
 *
 * PostgreSQL: ADD COLUMN IF NOT EXISTS (9.1+)
 */
export async function ensureTenantSettingsApiKeyColumns(dataSource: DataSource): Promise<void> {
  try {
    // Ayrı sorgular: bazı sürücülerde çoklu ifade tek string’de sorun çıkarabiliyor
    await dataSource.query(
      `ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS openai_api_key VARCHAR(500) NULL`,
    );
    await dataSource.query(
      `ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS deepl_api_key VARCHAR(500) NULL`,
    );
    await dataSource.query(
      `ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS google_maps_api_key VARCHAR(500) NULL`,
    );
    logger.info('tenant_settings API key columns ensured (openai_api_key, deepl_api_key, google_maps_api_key)');
  } catch (err) {
    logger.error('ensureTenantSettingsApiKeyColumns failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
