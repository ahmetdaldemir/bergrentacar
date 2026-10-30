-- =====================================================
-- SUNSET CAR RENTAL - AUTOMATED VEHICLE INSERT SCRIPT
-- Tenant ID: 1c45e539-7117-420d-81af-bc79a075fec1
-- =====================================================
-- Bu script otomatik olarak markaları, modelleri ve araçları ekler
-- Fiyatlar: Resimden alınan fiyat + 30 EUR

-- Temporary variables (PostgreSQL)
DO $$
DECLARE
    v_tenant_id UUID := '1c45e539-7117-420d-81af-bc79a075fec1';
    v_brand_id UUID;
    v_model_id UUID;
    v_vehicle_id UUID;
    v_location_id UUID;
    v_month INT;
    v_base_price DECIMAL(10,2);
    v_final_price DECIMAL(10,2);
BEGIN

-- =====================================================
-- STEP 1: INSERT BRANDS (If not exists)
-- =====================================================

-- AUDI
INSERT INTO vehicle_brands (id, name, is_active, sort_order, created_at, updated_at)
VALUES (gen_random_uuid(), 'Audi', true, 1, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- BMW
INSERT INTO vehicle_brands (id, name, is_active, sort_order, created_at, updated_at)
VALUES (gen_random_uuid(), 'BMW', true, 2, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- MERCEDES-BENZ
INSERT INTO vehicle_brands (id, name, is_active, sort_order, created_at, updated_at)
VALUES (gen_random_uuid(), 'Mercedes-Benz', true, 3, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- VOLKSWAGEN
INSERT INTO vehicle_brands (id, name, is_active, sort_order, created_at, updated_at)
VALUES (gen_random_uuid(), 'Volkswagen', true, 4, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- PEUGEOT
INSERT INTO vehicle_brands (id, name, is_active, sort_order, created_at, updated_at)
VALUES (gen_random_uuid(), 'Peugeot', true, 5, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- HYUNDAI
INSERT INTO vehicle_brands (id, name, is_active, sort_order, created_at, updated_at)
VALUES (gen_random_uuid(), 'Hyundai', true, 6, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- JEEP
INSERT INTO vehicle_brands (id, name, is_active, sort_order, created_at, updated_at)
VALUES (gen_random_uuid(), 'Jeep', true, 7, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- RENAULT
INSERT INTO vehicle_brands (id, name, is_active, sort_order, created_at, updated_at)
VALUES (gen_random_uuid(), 'Renault', true, 8, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- MINI
INSERT INTO vehicle_brands (id, name, is_active, sort_order, created_at, updated_at)
VALUES (gen_random_uuid(), 'Mini', true, 9, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- FIAT
INSERT INTO vehicle_brands (id, name, is_active, sort_order, created_at, updated_at)
VALUES (gen_random_uuid(), 'Fiat', true, 10, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- FORD
INSERT INTO vehicle_brands (id, name, is_active, sort_order, created_at, updated_at)
VALUES (gen_random_uuid(), 'Ford', true, 11, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- DACIA
INSERT INTO vehicle_brands (id, name, is_active, sort_order, created_at, updated_at)
VALUES (gen_random_uuid(), 'Dacia', true, 12, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

RAISE NOTICE 'Brands inserted successfully';

-- =====================================================
-- STEP 2: INSERT MODELS FOR EACH BRAND
-- =====================================================

-- AUDI MODELS
SELECT id INTO v_brand_id FROM vehicle_brands WHERE name = 'Audi' LIMIT 1;
INSERT INTO vehicle_models (id, brand_id, name, is_active, sort_order, created_at, updated_at)
VALUES (gen_random_uuid(), v_brand_id, 'A5', true, 0, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- BMW MODELS
SELECT id INTO v_brand_id FROM vehicle_brands WHERE name = 'BMW' LIMIT 1;
INSERT INTO vehicle_models (id, brand_id, name, is_active, sort_order, created_at, updated_at)
VALUES (gen_random_uuid(), v_brand_id, '5.20', true, 0, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- MERCEDES-BENZ MODELS
SELECT id INTO v_brand_id FROM vehicle_brands WHERE name = 'Mercedes-Benz' LIMIT 1;
INSERT INTO vehicle_models (id, brand_id, name, is_active, sort_order, created_at, updated_at)
VALUES (gen_random_uuid(), v_brand_id, 'C 200', true, 0, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- VOLKSWAGEN MODELS
SELECT id INTO v_brand_id FROM vehicle_brands WHERE name = 'Volkswagen' LIMIT 1;
INSERT INTO vehicle_models (id, brand_id, name, is_active, sort_order, created_at, updated_at)
VALUES (gen_random_uuid(), v_brand_id, 'Passat', true, 0, NOW(), NOW())
ON CONFLICT DO NOTHING;
INSERT INTO vehicle_models (id, brand_id, name, is_active, sort_order, created_at, updated_at)
VALUES (gen_random_uuid(), v_brand_id, 'Caravelle', true, 0, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- PEUGEOT MODELS
SELECT id INTO v_brand_id FROM vehicle_brands WHERE name = 'Peugeot' LIMIT 1;
INSERT INTO vehicle_models (id, brand_id, name, is_active, sort_order, created_at, updated_at)
VALUES (gen_random_uuid(), v_brand_id, '3008', true, 0, NOW(), NOW())
ON CONFLICT DO NOTHING;
INSERT INTO vehicle_models (id, brand_id, name, is_active, sort_order, created_at, updated_at)
VALUES (gen_random_uuid(), v_brand_id, '2008', true, 0, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- HYUNDAI MODELS
SELECT id INTO v_brand_id FROM vehicle_brands WHERE name = 'Hyundai' LIMIT 1;
INSERT INTO vehicle_models (id, brand_id, name, is_active, sort_order, created_at, updated_at)
VALUES (gen_random_uuid(), v_brand_id, 'Tucson', true, 0, NOW(), NOW())
ON CONFLICT DO NOTHING;
INSERT INTO vehicle_models (id, brand_id, name, is_active, sort_order, created_at, updated_at)
VALUES (gen_random_uuid(), v_brand_id, 'i20', true, 0, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- JEEP MODELS
SELECT id INTO v_brand_id FROM vehicle_brands WHERE name = 'Jeep' LIMIT 1;
INSERT INTO vehicle_models (id, brand_id, name, is_active, sort_order, created_at, updated_at)
VALUES (gen_random_uuid(), v_brand_id, 'Renegade', true, 0, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- RENAULT MODELS
SELECT id INTO v_brand_id FROM vehicle_brands WHERE name = 'Renault' LIMIT 1;
INSERT INTO vehicle_models (id, brand_id, name, is_active, sort_order, created_at, updated_at)
VALUES (gen_random_uuid(), v_brand_id, 'Megane', true, 0, NOW(), NOW())
ON CONFLICT DO NOTHING;
INSERT INTO vehicle_models (id, brand_id, name, is_active, sort_order, created_at, updated_at)
VALUES (gen_random_uuid(), v_brand_id, 'Clio Sport Tourer', true, 0, NOW(), NOW())
ON CONFLICT DO NOTHING;
INSERT INTO vehicle_models (id, brand_id, name, is_active, sort_order, created_at, updated_at)
VALUES (gen_random_uuid(), v_brand_id, 'Clio', true, 0, NOW(), NOW())
ON CONFLICT DO NOTHING;
INSERT INTO vehicle_models (id, brand_id, name, is_active, sort_order, created_at, updated_at)
VALUES (gen_random_uuid(), v_brand_id, 'Symbol', true, 0, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- MINI MODELS
SELECT id INTO v_brand_id FROM vehicle_brands WHERE name = 'Mini' LIMIT 1;
INSERT INTO vehicle_models (id, brand_id, name, is_active, sort_order, created_at, updated_at)
VALUES (gen_random_uuid(), v_brand_id, 'Cooper Countryman', true, 0, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- FIAT MODELS
SELECT id INTO v_brand_id FROM vehicle_brands WHERE name = 'Fiat' LIMIT 1;
INSERT INTO vehicle_models (id, brand_id, name, is_active, sort_order, created_at, updated_at)
VALUES (gen_random_uuid(), v_brand_id, 'Egea Cross', true, 0, NOW(), NOW())
ON CONFLICT DO NOTHING;
INSERT INTO vehicle_models (id, brand_id, name, is_active, sort_order, created_at, updated_at)
VALUES (gen_random_uuid(), v_brand_id, 'Egea', true, 0, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- FORD MODELS
SELECT id INTO v_brand_id FROM vehicle_brands WHERE name = 'Ford' LIMIT 1;
INSERT INTO vehicle_models (id, brand_id, name, is_active, sort_order, created_at, updated_at)
VALUES (gen_random_uuid(), v_brand_id, 'Tourneo', true, 0, NOW(), NOW())
ON CONFLICT DO NOTHING;
INSERT INTO vehicle_models (id, brand_id, name, is_active, sort_order, created_at, updated_at)
VALUES (gen_random_uuid(), v_brand_id, 'Custom', true, 0, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- DACIA MODELS
SELECT id INTO v_brand_id FROM vehicle_brands WHERE name = 'Dacia' LIMIT 1;
INSERT INTO vehicle_models (id, brand_id, name, is_active, sort_order, created_at, updated_at)
VALUES (gen_random_uuid(), v_brand_id, 'Lodgy', true, 0, NOW(), NOW())
ON CONFLICT DO NOTHING;

RAISE NOTICE 'Models inserted successfully';

-- =====================================================
-- STEP 3: INSERT VEHICLES WITH PRICING
-- =====================================================
-- Fiyatlar: Resimden alınan fiyat + 30 EUR (günlük fiyat)
-- Tüm aylara aynı fiyat uygulanıyor

-- 1. AUDI A5 (250€ + 30€ = 280€/gün)
SELECT vb.id, vm.id 
INTO v_brand_id, v_model_id
FROM vehicle_brands vb
JOIN vehicle_models vm ON vm.brand_id = vb.id
WHERE vb.name = 'Audi' AND vm.name = 'A5'
LIMIT 1;

INSERT INTO vehicles (
    id, tenant_id, name, brand_id, model_id, year,
    transmission, fuel_type, seats, luggage, large_luggage, small_luggage, doors,
    description, is_active, created_at, updated_at
)
VALUES (
    gen_random_uuid(), v_tenant_id, 'Audi A5', v_brand_id, v_model_id, 2023,
    'automatic', 'diesel', 5, 3, 2, 1, 4,
    'Lüks sedan - Otomatik - Dizel', true, NOW(), NOW()
)
RETURNING id INTO v_vehicle_id;

-- 12 aylık fiyatlandırma ekle (280 EUR/gün)
FOR v_month IN 1..12 LOOP
    INSERT INTO vehicle_pricing_periods (id, vehicle_id, season, month, daily_rate, created_at, updated_at)
    VALUES (
        gen_random_uuid(), v_vehicle_id,
        CASE 
            WHEN v_month IN (12,1,2) THEN 'winter'
            WHEN v_month IN (3,4,5) THEN 'spring'
            WHEN v_month IN (6,7,8) THEN 'summer'
            ELSE 'autumn'
        END,
        v_month, 280.00, NOW(), NOW()
    );
END LOOP;

-- 2. BMW 5.20 (180€ + 30€ = 210€/gün)
SELECT vb.id, vm.id 
INTO v_brand_id, v_model_id
FROM vehicle_brands vb
JOIN vehicle_models vm ON vm.brand_id = vb.id
WHERE vb.name = 'BMW' AND vm.name = '5.20'
LIMIT 1;

INSERT INTO vehicles (
    id, tenant_id, name, brand_id, model_id, year,
    transmission, fuel_type, seats, luggage, large_luggage, small_luggage, doors,
    description, is_active, created_at, updated_at
)
VALUES (
    gen_random_uuid(), v_tenant_id, 'BMW 5.20', v_brand_id, v_model_id, 2023,
    'automatic', 'diesel', 5, 3, 2, 1, 4,
    'Premium sedan - Otomatik - Dizel', true, NOW(), NOW()
)
RETURNING id INTO v_vehicle_id;

FOR v_month IN 1..12 LOOP
    INSERT INTO vehicle_pricing_periods (id, vehicle_id, season, month, daily_rate, created_at, updated_at)
    VALUES (
        gen_random_uuid(), v_vehicle_id,
        CASE 
            WHEN v_month IN (12,1,2) THEN 'winter'
            WHEN v_month IN (3,4,5) THEN 'spring'
            WHEN v_month IN (6,7,8) THEN 'summer'
            ELSE 'autumn'
        END,
        v_month, 210.00, NOW(), NOW()
    );
END LOOP;

-- 3. MERCEDES C 200 (130€ + 30€ = 160€/gün)
SELECT vb.id, vm.id 
INTO v_brand_id, v_model_id
FROM vehicle_brands vb
JOIN vehicle_models vm ON vm.brand_id = vb.id
WHERE vb.name = 'Mercedes-Benz' AND vm.name = 'C 200'
LIMIT 1;

INSERT INTO vehicles (
    id, tenant_id, name, brand_id, model_id, year,
    transmission, fuel_type, seats, luggage, large_luggage, small_luggage, doors,
    description, is_active, created_at, updated_at
)
VALUES (
    gen_random_uuid(), v_tenant_id, 'Mercedes C 200', v_brand_id, v_model_id, 2023,
    'automatic', 'diesel', 5, 3, 2, 1, 4,
    'Executive sedan - Otomatik - Dizel', true, NOW(), NOW()
)
RETURNING id INTO v_vehicle_id;

FOR v_month IN 1..12 LOOP
    INSERT INTO vehicle_pricing_periods (id, vehicle_id, season, month, daily_rate, created_at, updated_at)
    VALUES (
        gen_random_uuid(), v_vehicle_id,
        CASE 
            WHEN v_month IN (12,1,2) THEN 'winter'
            WHEN v_month IN (3,4,5) THEN 'spring'
            WHEN v_month IN (6,7,8) THEN 'summer'
            ELSE 'autumn'
        END,
        v_month, 160.00, NOW(), NOW()
    );
END LOOP;

-- 4. VW PASSAT (110€ + 30€ = 140€/gün)
SELECT vb.id, vm.id 
INTO v_brand_id, v_model_id
FROM vehicle_brands vb
JOIN vehicle_models vm ON vm.brand_id = vb.id
WHERE vb.name = 'Volkswagen' AND vm.name = 'Passat'
LIMIT 1;

INSERT INTO vehicles (
    id, tenant_id, name, brand_id, model_id, year,
    transmission, fuel_type, seats, luggage, large_luggage, small_luggage, doors,
    description, is_active, created_at, updated_at
)
VALUES (
    gen_random_uuid(), v_tenant_id, 'VW Passat', v_brand_id, v_model_id, 2023,
    'automatic', 'diesel', 5, 3, 2, 1, 4,
    'Konforlu sedan - Otomatik - Dizel', true, NOW(), NOW()
)
RETURNING id INTO v_vehicle_id;

FOR v_month IN 1..12 LOOP
    INSERT INTO vehicle_pricing_periods (id, vehicle_id, season, month, daily_rate, created_at, updated_at)
    VALUES (
        gen_random_uuid(), v_vehicle_id,
        CASE 
            WHEN v_month IN (12,1,2) THEN 'winter'
            WHEN v_month IN (3,4,5) THEN 'spring'
            WHEN v_month IN (6,7,8) THEN 'summer'
            ELSE 'autumn'
        END,
        v_month, 140.00, NOW(), NOW()
    );
END LOOP;

-- 5. PEUGEOT 3008 (160€ + 30€ = 190€/gün)
SELECT vb.id, vm.id 
INTO v_brand_id, v_model_id
FROM vehicle_brands vb
JOIN vehicle_models vm ON vm.brand_id = vb.id
WHERE vb.name = 'Peugeot' AND vm.name = '3008'
LIMIT 1;

INSERT INTO vehicles (
    id, tenant_id, name, brand_id, model_id, year,
    transmission, fuel_type, seats, luggage, large_luggage, small_luggage, doors,
    description, is_active, created_at, updated_at
)
VALUES (
    gen_random_uuid(), v_tenant_id, 'Peugeot 3008', v_brand_id, v_model_id, 2023,
    'automatic', 'diesel', 5, 4, 3, 1, 5,
    'SUV - Otomatik - Dizel', true, NOW(), NOW()
)
RETURNING id INTO v_vehicle_id;

FOR v_month IN 1..12 LOOP
    INSERT INTO vehicle_pricing_periods (id, vehicle_id, season, month, daily_rate, created_at, updated_at)
    VALUES (
        gen_random_uuid(), v_vehicle_id,
        CASE 
            WHEN v_month IN (12,1,2) THEN 'winter'
            WHEN v_month IN (3,4,5) THEN 'spring'
            WHEN v_month IN (6,7,8) THEN 'summer'
            ELSE 'autumn'
        END,
        v_month, 190.00, NOW(), NOW()
    );
END LOOP;

-- 6. PEUGEOT 2008 (160€ + 30€ = 190€/gün)
SELECT vb.id, vm.id 
INTO v_brand_id, v_model_id
FROM vehicle_brands vb
JOIN vehicle_models vm ON vm.brand_id = vb.id
WHERE vb.name = 'Peugeot' AND vm.name = '2008'
LIMIT 1;

INSERT INTO vehicles (
    id, tenant_id, name, brand_id, model_id, year,
    transmission, fuel_type, seats, luggage, large_luggage, small_luggage, doors,
    description, is_active, created_at, updated_at
)
VALUES (
    gen_random_uuid(), v_tenant_id, 'Peugeot 2008', v_brand_id, v_model_id, 2023,
    'automatic', 'gasoline', 5, 3, 2, 1, 5,
    'Compact SUV - Otomatik - Benzin', true, NOW(), NOW()
)
RETURNING id INTO v_vehicle_id;

FOR v_month IN 1..12 LOOP
    INSERT INTO vehicle_pricing_periods (id, vehicle_id, season, month, daily_rate, created_at, updated_at)
    VALUES (
        gen_random_uuid(), v_vehicle_id,
        CASE 
            WHEN v_month IN (12,1,2) THEN 'winter'
            WHEN v_month IN (3,4,5) THEN 'spring'
            WHEN v_month IN (6,7,8) THEN 'summer'
            ELSE 'autumn'
        END,
        v_month, 190.00, NOW(), NOW()
    );
END LOOP;

-- 7. HYUNDAI TUCSON (140€ + 30€ = 170€/gün)
SELECT vb.id, vm.id 
INTO v_brand_id, v_model_id
FROM vehicle_brands vb
JOIN vehicle_models vm ON vm.brand_id = vb.id
WHERE vb.name = 'Hyundai' AND vm.name = 'Tucson'
LIMIT 1;

INSERT INTO vehicles (
    id, tenant_id, name, brand_id, model_id, year,
    transmission, fuel_type, seats, luggage, large_luggage, small_luggage, doors,
    description, is_active, created_at, updated_at
)
VALUES (
    gen_random_uuid(), v_tenant_id, 'Hyundai Tucson', v_brand_id, v_model_id, 2023,
    'automatic', 'diesel', 5, 4, 3, 1, 5,
    'SUV - Otomatik - Dizel', true, NOW(), NOW()
)
RETURNING id INTO v_vehicle_id;

FOR v_month IN 1..12 LOOP
    INSERT INTO vehicle_pricing_periods (id, vehicle_id, season, month, daily_rate, created_at, updated_at)
    VALUES (
        gen_random_uuid(), v_vehicle_id,
        CASE 
            WHEN v_month IN (12,1,2) THEN 'winter'
            WHEN v_month IN (3,4,5) THEN 'spring'
            WHEN v_month IN (6,7,8) THEN 'summer'
            ELSE 'autumn'
        END,
        v_month, 170.00, NOW(), NOW()
    );
END LOOP;

-- 8. JEEP RENEGADE (160€ + 30€ = 190€/gün)
SELECT vb.id, vm.id 
INTO v_brand_id, v_model_id
FROM vehicle_brands vb
JOIN vehicle_models vm ON vm.brand_id = vb.id
WHERE vb.name = 'Jeep' AND vm.name = 'Renegade'
LIMIT 1;

INSERT INTO vehicles (
    id, tenant_id, name, brand_id, model_id, year,
    transmission, fuel_type, seats, luggage, large_luggage, small_luggage, doors,
    description, is_active, created_at, updated_at
)
VALUES (
    gen_random_uuid(), v_tenant_id, 'Jeep Renegade', v_brand_id, v_model_id, 2023,
    'automatic', 'diesel', 5, 3, 2, 1, 5,
    'Compact SUV - Otomatik - Dizel', true, NOW(), NOW()
)
RETURNING id INTO v_vehicle_id;

FOR v_month IN 1..12 LOOP
    INSERT INTO vehicle_pricing_periods (id, vehicle_id, season, month, daily_rate, created_at, updated_at)
    VALUES (
        gen_random_uuid(), v_vehicle_id,
        CASE 
            WHEN v_month IN (12,1,2) THEN 'winter'
            WHEN v_month IN (3,4,5) THEN 'spring'
            WHEN v_month IN (6,7,8) THEN 'summer'
            ELSE 'autumn'
        END,
        v_month, 190.00, NOW(), NOW()
    );
END LOOP;

-- 9. RENAULT MEGANE (80€ + 30€ = 110€/gün)
SELECT vb.id, vm.id 
INTO v_brand_id, v_model_id
FROM vehicle_brands vb
JOIN vehicle_models vm ON vm.brand_id = vb.id
WHERE vb.name = 'Renault' AND vm.name = 'Megane'
LIMIT 1;

INSERT INTO vehicles (
    id, tenant_id, name, brand_id, model_id, year,
    transmission, fuel_type, seats, luggage, large_luggage, small_luggage, doors,
    description, is_active, created_at, updated_at
)
VALUES (
    gen_random_uuid(), v_tenant_id, 'Renault Megane', v_brand_id, v_model_id, 2023,
    'manual', 'diesel', 5, 3, 2, 1, 5,
    'Konforlu hatchback - Manuel - Dizel', true, NOW(), NOW()
)
RETURNING id INTO v_vehicle_id;

FOR v_month IN 1..12 LOOP
    INSERT INTO vehicle_pricing_periods (id, vehicle_id, season, month, daily_rate, created_at, updated_at)
    VALUES (
        gen_random_uuid(), v_vehicle_id,
        CASE 
            WHEN v_month IN (12,1,2) THEN 'winter'
            WHEN v_month IN (3,4,5) THEN 'spring'
            WHEN v_month IN (6,7,8) THEN 'summer'
            ELSE 'autumn'
        END,
        v_month, 110.00, NOW(), NOW()
    );
END LOOP;

-- 10. RENAULT CLIO SPORT TOURER (50€ + 30€ = 80€/gün)
SELECT vb.id, vm.id 
INTO v_brand_id, v_model_id
FROM vehicle_brands vb
JOIN vehicle_models vm ON vm.brand_id = vb.id
WHERE vb.name = 'Renault' AND vm.name = 'Clio Sport Tourer'
LIMIT 1;

INSERT INTO vehicles (
    id, tenant_id, name, brand_id, model_id, year,
    transmission, fuel_type, seats, luggage, large_luggage, small_luggage, doors,
    description, is_active, created_at, updated_at
)
VALUES (
    gen_random_uuid(), v_tenant_id, 'Renault Clio Sport Tourer', v_brand_id, v_model_id, 2023,
    'manual', 'diesel', 5, 3, 2, 1, 5,
    'Ekonomik station wagon - Manuel - Dizel', true, NOW(), NOW()
)
RETURNING id INTO v_vehicle_id;

FOR v_month IN 1..12 LOOP
    INSERT INTO vehicle_pricing_periods (id, vehicle_id, season, month, daily_rate, created_at, updated_at)
    VALUES (
        gen_random_uuid(), v_vehicle_id,
        CASE 
            WHEN v_month IN (12,1,2) THEN 'winter'
            WHEN v_month IN (3,4,5) THEN 'spring'
            WHEN v_month IN (6,7,8) THEN 'summer'
            ELSE 'autumn'
        END,
        v_month, 80.00, NOW(), NOW()
    );
END LOOP;

-- 11. MINI COOPER COUNTRYMAN (160€ + 30€ = 190€/gün)
SELECT vb.id, vm.id 
INTO v_brand_id, v_model_id
FROM vehicle_brands vb
JOIN vehicle_models vm ON vm.brand_id = vb.id
WHERE vb.name = 'Mini' AND vm.name = 'Cooper Countryman'
LIMIT 1;

INSERT INTO vehicles (
    id, tenant_id, name, brand_id, model_id, year,
    transmission, fuel_type, seats, luggage, large_luggage, small_luggage, doors,
    description, is_active, created_at, updated_at
)
VALUES (
    gen_random_uuid(), v_tenant_id, 'Mini Cooper Countryman', v_brand_id, v_model_id, 2023,
    'automatic', 'gasoline', 5, 3, 2, 1, 5,
    'Premium compact SUV - Otomatik - Benzin', true, NOW(), NOW()
)
RETURNING id INTO v_vehicle_id;

FOR v_month IN 1..12 LOOP
    INSERT INTO vehicle_pricing_periods (id, vehicle_id, season, month, daily_rate, created_at, updated_at)
    VALUES (
        gen_random_uuid(), v_vehicle_id,
        CASE 
            WHEN v_month IN (12,1,2) THEN 'winter'
            WHEN v_month IN (3,4,5) THEN 'spring'
            WHEN v_month IN (6,7,8) THEN 'summer'
            ELSE 'autumn'
        END,
        v_month, 190.00, NOW(), NOW()
    );
END LOOP;

-- 12. HYUNDAI i20 (60€ + 30€ = 90€/gün)
SELECT vb.id, vm.id 
INTO v_brand_id, v_model_id
FROM vehicle_brands vb
JOIN vehicle_models vm ON vm.brand_id = vb.id
WHERE vb.name = 'Hyundai' AND vm.name = 'i20'
LIMIT 1;

INSERT INTO vehicles (
    id, tenant_id, name, brand_id, model_id, year,
    transmission, fuel_type, seats, luggage, large_luggage, small_luggage, doors,
    description, is_active, created_at, updated_at
)
VALUES (
    gen_random_uuid(), v_tenant_id, 'Hyundai i20', v_brand_id, v_model_id, 2023,
    'manual', 'gasoline', 5, 2, 1, 1, 5,
    'Ekonomik hatchback - Manuel - Benzin', true, NOW(), NOW()
)
RETURNING id INTO v_vehicle_id;

FOR v_month IN 1..12 LOOP
    INSERT INTO vehicle_pricing_periods (id, vehicle_id, season, month, daily_rate, created_at, updated_at)
    VALUES (
        gen_random_uuid(), v_vehicle_id,
        CASE 
            WHEN v_month IN (12,1,2) THEN 'winter'
            WHEN v_month IN (3,4,5) THEN 'spring'
            WHEN v_month IN (6,7,8) THEN 'summer'
            ELSE 'autumn'
        END,
        v_month, 90.00, NOW(), NOW()
    );
END LOOP;

-- 13. FIAT EGEA CROSS (60€ + 30€ = 90€/gün)
SELECT vb.id, vm.id 
INTO v_brand_id, v_model_id
FROM vehicle_brands vb
JOIN vehicle_models vm ON vm.brand_id = vb.id
WHERE vb.name = 'Fiat' AND vm.name = 'Egea Cross'
LIMIT 1;

INSERT INTO vehicles (
    id, tenant_id, name, brand_id, model_id, year,
    transmission, fuel_type, seats, luggage, large_luggage, small_luggage, doors,
    description, is_active, created_at, updated_at
)
VALUES (
    gen_random_uuid(), v_tenant_id, 'Fiat Egea Cross', v_brand_id, v_model_id, 2023,
    'manual', 'diesel', 5, 3, 2, 1, 4,
    'Cross sedan - Manuel - Dizel', true, NOW(), NOW()
)
RETURNING id INTO v_vehicle_id;

FOR v_month IN 1..12 LOOP
    INSERT INTO vehicle_pricing_periods (id, vehicle_id, season, month, daily_rate, created_at, updated_at)
    VALUES (
        gen_random_uuid(), v_vehicle_id,
        CASE 
            WHEN v_month IN (12,1,2) THEN 'winter'
            WHEN v_month IN (3,4,5) THEN 'spring'
            WHEN v_month IN (6,7,8) THEN 'summer'
            ELSE 'autumn'
        END,
        v_month, 90.00, NOW(), NOW()
    );
END LOOP;

-- 14. FIAT EGEA (50€ + 30€ = 80€/gün)
SELECT vb.id, vm.id 
INTO v_brand_id, v_model_id
FROM vehicle_brands vb
JOIN vehicle_models vm ON vm.brand_id = vb.id
WHERE vb.name = 'Fiat' AND vm.name = 'Egea'
LIMIT 1;

INSERT INTO vehicles (
    id, tenant_id, name, brand_id, model_id, year,
    transmission, fuel_type, seats, luggage, large_luggage, small_luggage, doors,
    description, is_active, created_at, updated_at
)
VALUES (
    gen_random_uuid(), v_tenant_id, 'Fiat Egea', v_brand_id, v_model_id, 2023,
    'manual', 'diesel', 5, 3, 2, 1, 4,
    'Ekonomik sedan - Manuel - Dizel', true, NOW(), NOW()
)
RETURNING id INTO v_vehicle_id;

FOR v_month IN 1..12 LOOP
    INSERT INTO vehicle_pricing_periods (id, vehicle_id, season, month, daily_rate, created_at, updated_at)
    VALUES (
        gen_random_uuid(), v_vehicle_id,
        CASE 
            WHEN v_month IN (12,1,2) THEN 'winter'
            WHEN v_month IN (3,4,5) THEN 'spring'
            WHEN v_month IN (6,7,8) THEN 'summer'
            ELSE 'autumn'
        END,
        v_month, 80.00, NOW(), NOW()
    );
END LOOP;

-- 15. RENAULT CLIO (60€ + 30€ = 90€/gün)
SELECT vb.id, vm.id 
INTO v_brand_id, v_model_id
FROM vehicle_brands vb
JOIN vehicle_models vm ON vm.brand_id = vb.id
WHERE vb.name = 'Renault' AND vm.name = 'Clio'
LIMIT 1;

INSERT INTO vehicles (
    id, tenant_id, name, brand_id, model_id, year,
    transmission, fuel_type, seats, luggage, large_luggage, small_luggage, doors,
    description, is_active, created_at, updated_at
)
VALUES (
    gen_random_uuid(), v_tenant_id, 'Renault Clio', v_brand_id, v_model_id, 2023,
    'manual', 'gasoline', 5, 2, 1, 1, 5,
    'Ekonomik hatchback - Manuel - Benzin', true, NOW(), NOW()
)
RETURNING id INTO v_vehicle_id;

FOR v_month IN 1..12 LOOP
    INSERT INTO vehicle_pricing_periods (id, vehicle_id, season, month, daily_rate, created_at, updated_at)
    VALUES (
        gen_random_uuid(), v_vehicle_id,
        CASE 
            WHEN v_month IN (12,1,2) THEN 'winter'
            WHEN v_month IN (3,4,5) THEN 'spring'
            WHEN v_month IN (6,7,8) THEN 'summer'
            ELSE 'autumn'
        END,
        v_month, 90.00, NOW(), NOW()
    );
END LOOP;

-- 16. RENAULT SYMBOL (50€ + 30€ = 80€/gün)
SELECT vb.id, vm.id 
INTO v_brand_id, v_model_id
FROM vehicle_brands vb
JOIN vehicle_models vm ON vm.brand_id = vb.id
WHERE vb.name = 'Renault' AND vm.name = 'Symbol'
LIMIT 1;

INSERT INTO vehicles (
    id, tenant_id, name, brand_id, model_id, year,
    transmission, fuel_type, seats, luggage, large_luggage, small_luggage, doors,
    description, is_active, created_at, updated_at
)
VALUES (
    gen_random_uuid(), v_tenant_id, 'Renault Symbol', v_brand_id, v_model_id, 2023,
    'manual', 'gasoline', 5, 3, 2, 1, 4,
    'Ekonomik sedan - Manuel - Benzin', true, NOW(), NOW()
)
RETURNING id INTO v_vehicle_id;

FOR v_month IN 1..12 LOOP
    INSERT INTO vehicle_pricing_periods (id, vehicle_id, season, month, daily_rate, created_at, updated_at)
    VALUES (
        gen_random_uuid(), v_vehicle_id,
        CASE 
            WHEN v_month IN (12,1,2) THEN 'winter'
            WHEN v_month IN (3,4,5) THEN 'spring'
            WHEN v_month IN (6,7,8) THEN 'summer'
            ELSE 'autumn'
        END,
        v_month, 80.00, NOW(), NOW()
    );
END LOOP;

-- 17. FORD TOURNEO (60€ + 30€ = 90€/gün)
SELECT vb.id, vm.id 
INTO v_brand_id, v_model_id
FROM vehicle_brands vb
JOIN vehicle_models vm ON vm.brand_id = vb.id
WHERE vb.name = 'Ford' AND vm.name = 'Tourneo'
LIMIT 1;

INSERT INTO vehicles (
    id, tenant_id, name, brand_id, model_id, year,
    transmission, fuel_type, seats, luggage, large_luggage, small_luggage, doors,
    description, is_active, created_at, updated_at
)
VALUES (
    gen_random_uuid(), v_tenant_id, 'Ford Tourneo', v_brand_id, v_model_id, 2023,
    'manual', 'diesel', 7, 4, 3, 1, 5,
    'Minivan - Manuel - Dizel - 7 Kişilik', true, NOW(), NOW()
)
RETURNING id INTO v_vehicle_id;

FOR v_month IN 1..12 LOOP
    INSERT INTO vehicle_pricing_periods (id, vehicle_id, season, month, daily_rate, created_at, updated_at)
    VALUES (
        gen_random_uuid(), v_vehicle_id,
        CASE 
            WHEN v_month IN (12,1,2) THEN 'winter'
            WHEN v_month IN (3,4,5) THEN 'spring'
            WHEN v_month IN (6,7,8) THEN 'summer'
            ELSE 'autumn'
        END,
        v_month, 90.00, NOW(), NOW()
    );
END LOOP;

-- 18. DACIA LODGY (80€ + 30€ = 110€/gün)
SELECT vb.id, vm.id 
INTO v_brand_id, v_model_id
FROM vehicle_brands vb
JOIN vehicle_models vm ON vm.brand_id = vb.id
WHERE vb.name = 'Dacia' AND vm.name = 'Lodgy'
LIMIT 1;

INSERT INTO vehicles (
    id, tenant_id, name, brand_id, model_id, year,
    transmission, fuel_type, seats, luggage, large_luggage, small_luggage, doors,
    description, is_active, created_at, updated_at
)
VALUES (
    gen_random_uuid(), v_tenant_id, 'Dacia Lodgy', v_brand_id, v_model_id, 2023,
    'manual', 'diesel', 7, 4, 3, 1, 5,
    'Ekonomik minivan - Manuel - Dizel - 7 Kişilik', true, NOW(), NOW()
)
RETURNING id INTO v_vehicle_id;

FOR v_month IN 1..12 LOOP
    INSERT INTO vehicle_pricing_periods (id, vehicle_id, season, month, daily_rate, created_at, updated_at)
    VALUES (
        gen_random_uuid(), v_vehicle_id,
        CASE 
            WHEN v_month IN (12,1,2) THEN 'winter'
            WHEN v_month IN (3,4,5) THEN 'spring'
            WHEN v_month IN (6,7,8) THEN 'summer'
            ELSE 'autumn'
        END,
        v_month, 110.00, NOW(), NOW()
    );
END LOOP;

-- 19. FORD CUSTOM (110€ + 30€ = 140€/gün)
SELECT vb.id, vm.id 
INTO v_brand_id, v_model_id
FROM vehicle_brands vb
JOIN vehicle_models vm ON vm.brand_id = vb.id
WHERE vb.name = 'Ford' AND vm.name = 'Custom'
LIMIT 1;

INSERT INTO vehicles (
    id, tenant_id, name, brand_id, model_id, year,
    transmission, fuel_type, seats, luggage, large_luggage, small_luggage, doors,
    description, is_active, created_at, updated_at
)
VALUES (
    gen_random_uuid(), v_tenant_id, 'Ford Custom', v_brand_id, v_model_id, 2023,
    'manual', 'diesel', 9, 5, 4, 1, 5,
    'Minivan - Manuel - Dizel - 9 Kişilik', true, NOW(), NOW()
)
RETURNING id INTO v_vehicle_id;

FOR v_month IN 1..12 LOOP
    INSERT INTO vehicle_pricing_periods (id, vehicle_id, season, month, daily_rate, created_at, updated_at)
    VALUES (
        gen_random_uuid(), v_vehicle_id,
        CASE 
            WHEN v_month IN (12,1,2) THEN 'winter'
            WHEN v_month IN (3,4,5) THEN 'spring'
            WHEN v_month IN (6,7,8) THEN 'summer'
            ELSE 'autumn'
        END,
        v_month, 140.00, NOW(), NOW()
    );
END LOOP;

-- 20. VW CARAVELLE (110€ + 30€ = 140€/gün)
SELECT vb.id, vm.id 
INTO v_brand_id, v_model_id
FROM vehicle_brands vb
JOIN vehicle_models vm ON vm.brand_id = vb.id
WHERE vb.name = 'Volkswagen' AND vm.name = 'Caravelle'
LIMIT 1;

INSERT INTO vehicles (
    id, tenant_id, name, brand_id, model_id, year,
    transmission, fuel_type, seats, luggage, large_luggage, small_luggage, doors,
    description, is_active, created_at, updated_at
)
VALUES (
    gen_random_uuid(), v_tenant_id, 'VW Caravelle', v_brand_id, v_model_id, 2023,
    'automatic', 'diesel', 9, 5, 4, 1, 5,
    'Premium minivan - Otomatik - Dizel - 9 Kişilik', true, NOW(), NOW()
)
RETURNING id INTO v_vehicle_id;

FOR v_month IN 1..12 LOOP
    INSERT INTO vehicle_pricing_periods (id, vehicle_id, season, month, daily_rate, created_at, updated_at)
    VALUES (
        gen_random_uuid(), v_vehicle_id,
        CASE 
            WHEN v_month IN (12,1,2) THEN 'winter'
            WHEN v_month IN (3,4,5) THEN 'spring'
            WHEN v_month IN (6,7,8) THEN 'summer'
            ELSE 'autumn'
        END,
        v_month, 140.00, NOW(), NOW()
    );
END LOOP;

RAISE NOTICE 'All 20 vehicles inserted successfully with pricing for all 12 months!';

END $$;

-- =====================================================
-- SUMMARY
-- =====================================================
-- Bu script şunları yapar:
-- 1. 12 marka ekler (Audi, BMW, Mercedes-Benz, VW, Peugeot, Hyundai, Jeep, Renault, Mini, Fiat, Ford, Dacia)
-- 2. 20 model ekler (her marka için ilgili modeller)
-- 3. 20 araç ekler (resimden alınan bilgilerle)
-- 4. Her araç için 12 aylık fiyatlandırma ekler (resimden alınan fiyat + 30 EUR)
--
-- Kullanım:
-- psql -h localhost -U postgres -d your_database_name -f insert-sunset-vehicles.sql
--
-- NOT: Tenant ID: 1c45e539-7117-420d-81af-bc79a075fec1
