-- ============================================================
-- searchVehicles API ile AYNI mantıkta çalışan debug sorgusu
-- İstek: pickupLocationId=93463a12..., pickupDate=2026-02-04, dropoffDate=2026-02-13
-- tenantId=1c45e539-7117-420d-81af-bc79a075fec1
-- ============================================================

-- Parametreler (isterseniz değiştirin)
-- pickupLocationId = 93463a12-6fe7-4058-b646-f0f079117654
-- rentalDays = 9, day_range = '7-10', month = 2

-- ------------------------------------------------------------
-- ADIM 1: Lokasyon çözümlemesi (API ile AYNI sıra - locationId ÖNCE)
-- API: 1) location_id (master) ile ara, 2) id ile ara
-- ------------------------------------------------------------
WITH resolved_location AS (
  SELECT rl.id as rentacar_location_id
  FROM rentacar_locations rl
  WHERE rl.tenant_id = '1c45e539-7117-420d-81af-bc79a075fec1'
    AND rl.location_id = '93463a12-6fe7-4058-b646-f0f079117654'
    AND rl.deleted_at IS NULL
  LIMIT 1
)
SELECT 
  '1-LOKASYON (locationId önce)' as adim,
  rl.rentacar_location_id,
  (SELECT rl2.location_id FROM rentacar_locations rl2 WHERE rl2.id = rl.rentacar_location_id) as master_location_id
FROM resolved_location rl;

-- Eğer ADIM 1 boş: id ile dene
WITH resolved_location AS (
  SELECT rl.id as rentacar_location_id
  FROM rentacar_locations rl
  WHERE rl.tenant_id = '1c45e539-7117-420d-81af-bc79a075fec1'
    AND rl.id = '93463a12-6fe7-4058-b646-f0f079117654'
    AND rl.deleted_at IS NULL
  LIMIT 1
)
SELECT 
  '1b-LOKASYON (id ile fallback)' as adim,
  rl.rentacar_location_id
FROM resolved_location rl;

-- ------------------------------------------------------------
-- ADIM 2a: API pricing (locationId=93463a12 ile bulunan rentacar_location.id kullanılırsa)
-- ------------------------------------------------------------
WITH api_loc AS (
  SELECT id FROM rentacar_locations 
  WHERE tenant_id = '1c45e539-7117-420d-81af-bc79a075fec1' 
    AND location_id = '93463a12-6fe7-4058-b646-f0f079117654' 
    AND deleted_at IS NULL LIMIT 1
)
SELECT '2a-PRICING (locationId match)' as adim, lvp.*, v."brandName", v."modelName"
FROM location_vehicle_pricing lvp
JOIN api_loc ON lvp.location_id = api_loc.id
JOIN vehicles v ON v.id = lvp.vehicle_id AND v.tenant_id = '1c45e539-7117-420d-81af-bc79a075fec1' AND v.is_active = true
WHERE lvp.month = 2 AND lvp.day_range = '7-10' AND lvp.is_active = true;

-- ------------------------------------------------------------
-- ADIM 2b: API pricing (id=93463a12 ile bulunan rentacar_location kullanılırsa)
-- ------------------------------------------------------------
SELECT '2b-PRICING (id=93463a12 direct)' as adim, lvp.*, v."brandName", v."modelName"
FROM location_vehicle_pricing lvp
JOIN vehicles v ON v.id = lvp.vehicle_id AND v.tenant_id = '1c45e539-7117-420d-81af-bc79a075fec1' AND v.is_active = true
WHERE lvp.location_id = '93463a12-6fe7-4058-b646-f0f079117654'
  AND lvp.month = 2 AND lvp.day_range = '7-10' AND lvp.is_active = true;

-- ------------------------------------------------------------
-- ADIM 3: KARŞILAŞTIRMA - Hangi location_id'lerde fiyat var?
-- API'nin kullandığı id bunlardan biri mi?
-- ------------------------------------------------------------
SELECT 
  '3-FIYAT OLAN LOKASYONLAR' as adim,
  lvp.location_id,
  rl.location_id as master_location_id,
  COUNT(*) as fiyat_kayit_sayisi
FROM location_vehicle_pricing lvp
JOIN rentacar_locations rl ON rl.id = lvp.location_id
WHERE rl.tenant_id = '1c45e539-7117-420d-81af-bc79a075fec1'
  AND lvp.month = 2
  AND lvp.day_range = '7-10'
  AND lvp.is_active = true
GROUP BY lvp.location_id, rl.location_id;

-- ------------------------------------------------------------
-- ADIM 4: UYUŞMAZLIK KONTROLÜ
-- 93463a12... master location id ise, rentacar_location_id farklı olabilir
-- Fiyat kayıtları yanlış location_id ile girilmiş olabilir
-- ------------------------------------------------------------
SELECT 
  '4-93463a12 HANGI KAYDA AIT' as adim,
  rl.id as rentacar_id,
  rl.location_id as master_id,
  CASE 
    WHEN rl.id = '93463a12-6fe7-4058-b646-f0f079117654' THEN 'Parametre rentacar_locations.id'
    WHEN rl.location_id = '93463a12-6fe7-4058-b646-f0f079117654' THEN 'Parametre master location_id - API rentacar_id kullanacak'
  END as aciklama
FROM rentacar_locations rl
WHERE rl.tenant_id = '1c45e539-7117-420d-81af-bc79a075fec1'
  AND (rl.id = '93463a12-6fe7-4058-b646-f0f079117654' 
       OR rl.location_id = '93463a12-6fe7-4058-b646-f0f079117654');
