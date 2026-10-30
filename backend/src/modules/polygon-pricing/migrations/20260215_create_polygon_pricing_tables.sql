-- Migration: create polygon pricing tables (isolated tables)
CREATE TABLE IF NOT EXISTS zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name varchar(255) NOT NULL,
  polygon_json jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zones_tenant_id ON zones (tenant_id);

CREATE TABLE IF NOT EXISTS zone_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  from_zone_id uuid NOT NULL,
  to_zone_id uuid NOT NULL,
  vehicle_type_id uuid NOT NULL,
  price numeric(12,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_zone_prices_tenant ON zone_prices (tenant_id);
CREATE INDEX IF NOT EXISTS idx_zone_prices_from_to ON zone_prices (from_zone_id, to_zone_id, vehicle_type_id);


