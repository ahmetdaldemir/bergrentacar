-- Tur modülünü category='tour' olan aktif tenant'lara açar.
-- Strateji:
--   1. GENERAL ayarı zaten varsa → metadata->features->tour = true olarak günceller.
--   2. GENERAL ayarı yoksa → yeni satır oluşturur (tour: true ile).
-- Güvenli: mevcut diğer feature flag'leri (finance, chat, ai…) korunur.

-- 1) Mevcut GENERAL satırı olan tenant'ları güncelle
UPDATE tenant_settings ts
SET
  metadata = jsonb_set(
    COALESCE(ts.metadata, '{}'::jsonb),
    '{features,tour}',
    'true'::jsonb,
    true   -- anahtarlar yoksa oluştur
  ),
  updated_at = now()
FROM tenants t
WHERE
  ts.tenant_id = t.id
  AND ts.category = 'general'
  AND t.category = 'tour'
  AND t.is_active = true;

-- 2) GENERAL satırı olmayan tenant'lar için yeni satır ekle
INSERT INTO tenant_settings (id, created_at, updated_at, tenant_id, category, metadata)
SELECT
  gen_random_uuid(),
  now(),
  now(),
  t.id,
  'general',
  '{"features": {"tour": true}}'::jsonb
FROM tenants t
WHERE
  t.category = 'tour'
  AND t.is_active = true
  AND NOT EXISTS (
    SELECT 1
    FROM tenant_settings ts
    WHERE ts.tenant_id = t.id AND ts.category = 'general'
  );

-- Sonucu doğrula: her tenant için güncel feature durumunu göster
SELECT
  t.id,
  t.name,
  t.slug,
  t.category,
  t.is_active,
  (ts.metadata -> 'features' ->> 'tour')::boolean AS tour_enabled
FROM tenants t
LEFT JOIN tenant_settings ts
  ON ts.tenant_id = t.id AND ts.category = 'general'
WHERE t.category = 'tour'
ORDER BY t.name;
