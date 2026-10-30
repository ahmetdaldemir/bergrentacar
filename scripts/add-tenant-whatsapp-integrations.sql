-- Tenant başına WhatsApp (Twilio) ve bot AI ayarları — DB_SYNC kapalı ortamlar için
CREATE TABLE IF NOT EXISTS tenant_whatsapp_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  twilio_account_sid VARCHAR(64),
  twilio_auth_token VARCHAR(500),
  twilio_whatsapp_from_e164 VARCHAR(32) NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  whatsapp_ai_system_prompt TEXT,
  whatsapp_openai_api_key VARCHAR(500),
  openai_model VARCHAR(64),
  CONSTRAINT uq_tenant_whatsapp_integrations_tenant UNIQUE (tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_whatsapp_from_e164
  ON tenant_whatsapp_integrations (twilio_whatsapp_from_e164)
  WHERE is_enabled = true;
