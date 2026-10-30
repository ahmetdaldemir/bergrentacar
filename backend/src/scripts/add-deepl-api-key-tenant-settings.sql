-- tenant_settings.deepl_api_key — DB_SYNC=false iken veya manuel şema için
-- TypeORM entity: TenantSettings.deeplApiKey → kolon adı deepl_api_key

ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS deepl_api_key VARCHAR(500) NULL;

COMMENT ON COLUMN tenant_settings.deepl_api_key IS 'Tenant DeepL API key (optional; also mirrored in metadata for legacy)';
