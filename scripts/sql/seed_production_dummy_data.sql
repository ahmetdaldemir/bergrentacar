-- ============================================================
-- Production Dummy Data Seed Script
-- ============================================================
-- Bu script, Tenants ve Users tabloları hariç tüm tablolara
-- minimum 10'ar adet (Blog ve Reservation için daha fazla) dummy data ekler.
-- Tüm relation'lar göz önünde bulundurularak hazırlanmıştır.
-- Production ortamında çalıştırılmak üzere tasarlanmıştır.
-- ============================================================
-- ÖNEMLİ: Bu script önce mevcut verileri siler, sonra yeniden ekler!
-- Tenants ve Users tabloları etkilenmez.
-- ============================================================

-- ============================================================
-- VERİLERİ TEMİZLEME (Foreign Key sırasına göre)
-- ============================================================
-- Önce child tabloları, sonra parent tabloları temizle

-- Survey related
DELETE FROM survey_responses;
DELETE FROM survey_questions;
DELETE FROM surveys;

-- Reservation related
DELETE FROM reservations;

-- Tour related
DELETE FROM tour_pricing;
DELETE FROM tour_time_slots;
DELETE FROM tour_images;
DELETE FROM tour_info_items;
DELETE FROM tour_translations;
DELETE FROM tour_feature_translations;
DELETE FROM tour_feature_assignments;
DELETE FROM tour_languages;
DELETE FROM tour_sessions;
DELETE FROM tours;

-- Tour Features
DELETE FROM tour_features;

-- Blog related
DELETE FROM blog_translations;
DELETE FROM blogs;

-- Customer related
DELETE FROM customer_emails;
DELETE FROM customers;

-- Vehicle related
DELETE FROM vehicle_reservation_assignments;
DELETE FROM location_vehicle_pricing;
DELETE FROM location_delivery_pricing;
DELETE FROM vehicle_pricing_periods;
DELETE FROM vehicle_plates;
DELETE FROM vehicles;
DELETE FROM vehicle_category_translations;
DELETE FROM vehicle_models;
DELETE FROM vehicle_categories;
DELETE FROM vehicle_brands;

-- Location related
DELETE FROM rentacar_locations;

-- Extras
DELETE FROM rentacar_extras;

-- Operations
DELETE FROM operations;

-- Hotels ve Destinations
DELETE FROM hotels;
DELETE FROM destinations;

-- ============================================================
-- VERİ EKLEME (Foreign Key sırasına göre)
-- ============================================================

-- ============================================================
-- VERİ EKLEME
-- ============================================================


-- ============================================================
-- 1. DESTINATIONS (10 adet)
-- ============================================================
INSERT INTO destinations (id, created_at, updated_at, name, country, city)
SELECT 
    gen_random_uuid(),
    NOW(),
    NOW(),
    name_val,
    country_val,
    city_val
FROM (VALUES
    ('Kapadokya Balon Turu', 'Türkiye', 'Nevşehir'),
    ('Efes Antik Kenti', 'Türkiye', 'İzmir'),
    ('Pamukkale Travertenleri', 'Türkiye', 'Denizli'),
    ('Sultanahmet Camii', 'Türkiye', 'İstanbul'),
    ('Ayasofya Müzesi', 'Türkiye', 'İstanbul'),
    ('Ephesus Ancient City', 'Turkey', 'Selçuk'),
    ('Colosseum Tour', 'Italy', 'Rome'),
    ('Eiffel Tower Experience', 'France', 'Paris'),
    ('Sagrada Familia Visit', 'Spain', 'Barcelona'),
    ('Acropolis Tour', 'Greece', 'Athens')
) AS t(name_val, country_val, city_val)
WHERE NOT EXISTS (SELECT 1 FROM destinations WHERE name = t.name_val AND city = t.city_val);

-- ============================================================
-- 2. HOTELS (12 adet - Destination relation ile)
-- ============================================================
INSERT INTO hotels (id, created_at, updated_at, name, star_rating, address, city, country, description, destination_id)
SELECT 
    gen_random_uuid(),
    NOW(),
    NOW(),
    name_val,
    star_val::numeric,
    address_val,
    city_val,
    country_val,
    description_val,
    (SELECT id FROM destinations WHERE city = city_val LIMIT 1)
FROM (VALUES
    ('Cappadocia Cave Hotel', 4.5, 'Göreme Mahallesi, Nevşehir', 'Nevşehir', 'Türkiye', 'Lüks mağara oteli, balon turları için ideal konum'),
    ('Ephesus Boutique Hotel', 4.0, 'Selçuk Merkez, İzmir', 'İzmir', 'Türkiye', 'Efes antik kentine yakın butik otel'),
    ('Pamukkale Thermal Hotel', 5.0, 'Karahayıt Mevkii, Denizli', 'Denizli', 'Türkiye', 'Termal otel, travertenlere 5 dakika'),
    ('Sultanahmet Palace Hotel', 4.5, 'Sultanahmet Meydanı, İstanbul', 'İstanbul', 'Türkiye', 'Tarihi yarımadada lüks otel'),
    ('Grand Bazaar Hotel', 3.5, 'Beyazıt, İstanbul', 'İstanbul', 'Türkiye', 'Kapalıçarşı yakınında ekonomik otel'),
    ('Hagia Sophia Hotel', 4.0, 'Sultanahmet, İstanbul', 'İstanbul', 'Türkiye', 'Ayasofya karşısında butik otel'),
    ('Colosseum View Hotel', 4.5, 'Via dei Fori Imperiali, Rome', 'Rome', 'Italy', 'Kolezyum manzaralı otel'),
    ('Eiffel Tower Hotel', 5.0, 'Champ de Mars, Paris', 'Paris', 'France', 'Eyfel Kulesi yakınında lüks otel'),
    ('Sagrada Familia Hotel', 4.0, 'Carrer de Mallorca, Barcelona', 'Barcelona', 'Spain', 'Sagrada Familia yakınında modern otel'),
    ('Acropolis View Hotel', 4.5, 'Dionysiou Areopagitou, Athens', 'Athens', 'Greece', 'Akropolis manzaralı otel'),
    ('Blue Cave Hotel', 3.5, 'Kaş Merkez, Antalya', 'Kaş', 'Türkiye', 'Denize sıfır otel'),
    ('Mediterranean Resort', 5.0, 'Kalkan Sahil, Antalya', 'Kalkan', 'Türkiye', '5 yıldızlı sahil oteli')
) AS t(name_val, star_val, address_val, city_val, country_val, description_val)
WHERE NOT EXISTS (SELECT 1 FROM hotels WHERE name = t.name_val AND city = t.city_val);

-- ============================================================
-- 3. VEHICLE BRANDS (12 adet)
-- ============================================================
INSERT INTO vehicle_brands (id, created_at, updated_at, name, is_active, sort_order)
SELECT 
    gen_random_uuid(),
    NOW(),
    NOW(),
    name_val,
    true,
    row_number() OVER (ORDER BY name_val) - 1
FROM (VALUES
    ('Mercedes-Benz'), ('BMW'), ('Audi'), ('Volkswagen'), ('Toyota'),
    ('Ford'), ('Renault'), ('Peugeot'), ('Hyundai'), ('Kia'),
    ('Nissan'), ('Opel')
) AS t(name_val)
WHERE NOT EXISTS (SELECT 1 FROM vehicle_brands WHERE name = t.name_val)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 4. VEHICLE MODELS (30 adet - Brand relation ile)
-- ============================================================
INSERT INTO vehicle_models (id, created_at, updated_at, brand_id, name, is_active, sort_order)
SELECT 
    gen_random_uuid(),
    NOW(),
    NOW(),
    b.id,
    model_val,
    true,
    row_number() OVER (PARTITION BY b.id ORDER BY model_val) - 1
FROM (VALUES
    ('Mercedes-Benz', 'C-Class'),
    ('Mercedes-Benz', 'E-Class'),
    ('Mercedes-Benz', 'S-Class'),
    ('BMW', '3 Series'),
    ('BMW', '5 Series'),
    ('BMW', 'X5'),
    ('Audi', 'A4'),
    ('Audi', 'A6'),
    ('Audi', 'Q7'),
    ('Volkswagen', 'Golf'),
    ('Volkswagen', 'Passat'),
    ('Volkswagen', 'Tiguan'),
    ('Toyota', 'Corolla'),
    ('Toyota', 'Camry'),
    ('Toyota', 'RAV4'),
    ('Ford', 'Focus'),
    ('Ford', 'Mondeo'),
    ('Renault', 'Clio'),
    ('Renault', 'Megane'),
    ('Peugeot', '208'),
    ('Peugeot', '308'),
    ('Hyundai', 'i20'),
    ('Hyundai', 'Elantra'),
    ('Kia', 'Rio'),
    ('Kia', 'Sportage'),
    ('Nissan', 'Micra'),
    ('Nissan', 'Altima'),
    ('Opel', 'Corsa'),
    ('Opel', 'Astra')
) AS t(brand_val, model_val)
JOIN vehicle_brands b ON b.name = t.brand_val
WHERE NOT EXISTS (
    SELECT 1 FROM vehicle_models vm 
    JOIN vehicle_brands vb ON vb.id = vm.brand_id 
    WHERE vb.name = t.brand_val AND vm.name = t.model_val
);

-- ============================================================
-- 5. VEHICLE CATEGORIES (8 adet)
-- ============================================================
INSERT INTO vehicle_categories (id, created_at, updated_at, is_active, sort_order)
SELECT 
    gen_random_uuid(),
    NOW(),
    NOW(),
    true,
    generate_series - 1
FROM generate_series(1, 8)
WHERE NOT EXISTS (
    SELECT 1 FROM vehicle_categories WHERE sort_order = generate_series - 1 LIMIT 1
);

-- Vehicle Category Translations
DO $$
DECLARE
    v_category RECORD;
    v_lang RECORD;
    v_trans_names TEXT[][] := ARRAY[
        ARRAY['Ekonomik', 'Economy'],
        ARRAY['Komfort', 'Comfort'],
        ARRAY['Premium', 'Premium'],
        ARRAY['Lüks', 'Luxury'],
        ARRAY['SUV', 'SUV'],
        ARRAY['Minivan', 'Minivan'],
        ARRAY['Spor', 'Sports'],
        ARRAY['Elektrikli', 'Electric']
    ];
    v_name TEXT;
BEGIN
    FOR v_category IN SELECT * FROM vehicle_categories ORDER BY sort_order LOOP
        FOR v_lang IN SELECT * FROM languages WHERE code IN ('tr', 'en', 'de') LOOP
            IF NOT EXISTS (
                SELECT 1 FROM vehicle_category_translations 
                WHERE category_id = v_category.id AND language_id = v_lang.id
            ) THEN
                v_name := CASE 
                    WHEN v_lang.code = 'tr' THEN v_trans_names[v_category.sort_order + 1][1]
                    ELSE v_trans_names[v_category.sort_order + 1][2]
                END;
                
                INSERT INTO vehicle_category_translations (
                    id, created_at, updated_at, category_id, language_id, name
                ) VALUES (
                    gen_random_uuid(),
                    NOW(),
                    NOW(),
                    v_category.id,
                    v_lang.id,
                    v_name
                );
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- ============================================================
-- 6. VEHICLES (15 adet - Tenant, Brand, Model, Category relation)
-- ============================================================
DO $$
DECLARE
    v_rentacar_tenant_id UUID;
    v_category_ids UUID[];
    v_transmission_type TEXT;
    v_fuel_type TEXT;
BEGIN
    -- RENTACAR tenant ID'sini al
    SELECT id INTO v_rentacar_tenant_id FROM tenants WHERE category = 'rentacar' LIMIT 1;
    
    -- Category ID'lerini al
    SELECT ARRAY_AGG(id) INTO v_category_ids FROM vehicle_categories LIMIT 8;
    
    -- Vehicles ekle
    INSERT INTO vehicles (
        id, created_at, updated_at, tenant_id, name, category_id, brand_id, model_id,
        "brandName", "modelName", year, transmission, "fuelType", seats, luggage,
        large_luggage, small_luggage, doors, engine_size, horsepower, body_type,
        description, base_rate, currency_code, is_active
    )
    SELECT 
        gen_random_uuid(),
        NOW(),
        NOW(),
        v_rentacar_tenant_id,
        name_val,
        v_category_ids[1 + (row_number() OVER () % array_length(v_category_ids, 1))],
        (SELECT id FROM vehicle_brands WHERE name = brand_val LIMIT 1),
        (SELECT vm.id FROM vehicle_models vm 
         JOIN vehicle_brands vb ON vb.id = vm.brand_id 
         WHERE vb.name = brand_val AND vm.name = model_val LIMIT 1),
        brand_val,
        model_val,
        year_val,
        transmission_val::vehicles_transmission_enum,
        fuel_val::vehicles_fueltype_enum,
        seats_val,
        luggage_val,
        large_luggage_val,
        small_luggage_val,
        doors_val,
        engine_val,
        hp_val,
        body_val,
        desc_val,
        price_val::numeric,
        'EUR',
        true
    FROM (VALUES
        ('Mercedes C-Class Premium', 'Mercedes-Benz', 'C-Class', 2023, 'automatic', 'gasoline', 5, 3, 2, 1, 4, '2.0L', '184 HP', 'Sedan', 'Lüks sedan, otomatik vites, full options', 120),
        ('BMW 3 Series Komfort', 'BMW', '3 Series', 2022, 'automatic', 'gasoline', 5, 2, 1, 1, 4, '2.0L', '150 HP', 'Sedan', 'Konforlu sedan araç', 95),
        ('Audi Q7 SUV', 'Audi', 'Q7', 2023, 'automatic', 'diesel', 7, 5, 3, 2, 5, '3.0L', '272 HP', 'SUV', 'Geniş aile SUV, 7 kişilik', 180),
        ('VW Golf Ekonomik', 'Volkswagen', 'Golf', 2022, 'manual', 'diesel', 5, 2, 1, 1, 4, '1.6L', '115 HP', 'Hatchback', 'Ekonomik şehir içi araç', 45),
        ('Toyota Corolla Hybrid', 'Toyota', 'Corolla', 2023, 'automatic', 'hybrid', 5, 3, 2, 1, 4, '1.8L Hybrid', '122 HP', 'Sedan', 'Yakıt tasarruflu hibrit araç', 65),
        ('Ford Focus Komfort', 'Ford', 'Focus', 2022, 'automatic', 'gasoline', 5, 2, 1, 1, 4, '1.5L', '150 HP', 'Hatchback', 'Konforlu orta segment araç', 55),
        ('Renault Clio Ekonomik', 'Renault', 'Clio', 2022, 'manual', 'diesel', 5, 2, 1, 1, 4, '1.5L', '90 HP', 'Hatchback', 'Ucuz ve ekonomik araç', 35),
        ('Peugeot 308 Premium', 'Peugeot', '308', 2023, 'automatic', 'gasoline', 5, 3, 2, 1, 4, '1.6L', '130 HP', 'Hatchback', 'Fransız tasarımı premium araç', 70),
        ('Hyundai Elantra Komfort', 'Hyundai', 'Elantra', 2022, 'automatic', 'gasoline', 5, 3, 2, 1, 4, '2.0L', '147 HP', 'Sedan', 'Güvenilir ve konforlu', 60),
        ('Kia Sportage SUV', 'Kia', 'Sportage', 2023, 'automatic', 'diesel', 5, 4, 2, 2, 5, '2.0L', '185 HP', 'SUV', 'Dayanıklı SUV araç', 110),
        ('Mercedes E-Class Lüks', 'Mercedes-Benz', 'E-Class', 2023, 'automatic', 'gasoline', 5, 4, 3, 1, 4, '2.0L', '258 HP', 'Sedan', 'Ultra lüks executive sedan', 150),
        ('BMW X5 Premium SUV', 'BMW', 'X5', 2023, 'automatic', 'diesel', 5, 5, 3, 2, 5, '3.0L', '265 HP', 'SUV', 'Premium SUV, geniş bagaj', 200),
        ('Audi A6 Executive', 'Audi', 'A6', 2023, 'automatic', 'gasoline', 5, 3, 2, 1, 4, '2.0L', '245 HP', 'Sedan', 'İş dünyası için ideal', 130),
        ('VW Passat Komfort', 'Volkswagen', 'Passat', 2022, 'automatic', 'diesel', 5, 4, 2, 2, 4, '2.0L', '150 HP', 'Sedan', 'Aile için ideal geniş araç', 80),
        ('Toyota RAV4 Hybrid', 'Toyota', 'RAV4', 2023, 'automatic', 'hybrid', 5, 4, 2, 2, 5, '2.5L Hybrid', '218 HP', 'SUV', 'Eko-friendly SUV', 100)
    ) AS t(name_val, brand_val, model_val, year_val, transmission_val, fuel_val, seats_val, luggage_val, large_luggage_val, small_luggage_val, doors_val, engine_val, hp_val, body_val, desc_val, price_val)
    WHERE NOT EXISTS (SELECT 1 FROM vehicles WHERE name = t.name_val LIMIT 1);
END $$;

-- ============================================================
-- 7. VEHICLE PLATES (20 adet - Vehicle relation ile)
-- ============================================================
DO $$
DECLARE
    v_vehicle RECORD;
    v_plate_num INTEGER := 1;
    v_plate_code TEXT[] := ARRAY['ABC', 'DEF', 'GHJ', 'KLM', 'NPR', 'STV', 'XYZ'];
    v_code_idx INTEGER := 1;
    v_plate_seq INTEGER;
    v_plate_text TEXT;
BEGIN
    FOR v_vehicle IN SELECT * FROM vehicles ORDER BY id LIMIT 20 LOOP
        FOR v_plate_seq IN 1..2 LOOP
            v_plate_text := '34 ' || v_plate_code[v_code_idx] || ' ' || LPAD(v_plate_num::text, 3, '0');
            
            IF NOT EXISTS (
                SELECT 1 FROM vehicle_plates 
                WHERE plate_number = v_plate_text
            ) THEN
                INSERT INTO vehicle_plates (id, created_at, updated_at, vehicle_id, plate_number)
                VALUES (
                    gen_random_uuid(),
                    NOW(),
                    NOW(),
                    v_vehicle.id,
                    v_plate_text
                );
                v_plate_num := v_plate_num + 1;
                IF v_plate_num > 999 THEN
                    v_plate_num := 1;
                    v_code_idx := (v_code_idx % array_length(v_plate_code, 1)) + 1;
                END IF;
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- ============================================================
-- 8. VEHICLE PRICING PERIODS (Vehicle başına 12 ay)
-- ============================================================
INSERT INTO vehicle_pricing_periods (
    id, created_at, updated_at, vehicle_id, season, month, daily_rate, weekly_rate
)
SELECT 
    gen_random_uuid(),
    NOW(),
    NOW(),
    v.id,
    CASE 
        WHEN month_val BETWEEN 6 AND 8 THEN 'summer'::vehicle_pricing_periods_season_enum
        WHEN month_val IN (12, 1, 2) THEN 'winter'::vehicle_pricing_periods_season_enum
        WHEN month_val BETWEEN 3 AND 5 THEN 'spring'::vehicle_pricing_periods_season_enum
        ELSE 'autumn'::vehicle_pricing_periods_season_enum
    END,
    month_val,
    CASE 
        WHEN month_val BETWEEN 6 AND 8 THEN (v.base_rate::numeric * 1.3)
        WHEN month_val IN (12, 1, 2) THEN (v.base_rate::numeric * 1.2)
        ELSE v.base_rate::numeric
    END,
    CASE 
        WHEN month_val BETWEEN 6 AND 8 THEN (v.base_rate::numeric * 7 * 1.3 * 0.85)
        WHEN month_val IN (12, 1, 2) THEN (v.base_rate::numeric * 7 * 1.2 * 0.85)
        ELSE (v.base_rate::numeric * 7 * 0.85)
    END
FROM vehicles v
CROSS JOIN generate_series(1, 12) AS month_val
WHERE NOT EXISTS (
    SELECT 1 FROM vehicle_pricing_periods vpp 
    WHERE vpp.vehicle_id = v.id AND vpp.month = month_val
);

-- ============================================================
-- 9. LOCATIONS (15 adet - Tenant, Parent relation ile)
-- ============================================================
DO $$
DECLARE
    v_rentacar_tenant_id UUID;
BEGIN
    SELECT id INTO v_rentacar_tenant_id FROM tenants WHERE category = 'rentacar' LIMIT 1;
    
    -- Merkez lokasyonlar
    INSERT INTO rentacar_locations (
        id, created_at, updated_at, tenant_id, name, meta_title, parent_id, type, sort, 
        delivery_fee, drop_fee, min_day_count, is_active
    )
    SELECT 
        gen_random_uuid(),
        NOW(),
        NOW(),
        v_rentacar_tenant_id,
        name_val,
        meta_val,
        NULL,
        type_val::rentacar_locations_type_enum,
        sort_val,
        delivery_val::numeric,
        drop_val::numeric,
        CASE WHEN min_days_val > 0 THEN min_days_val ELSE NULL END,
        true
    FROM (VALUES
        ('İstanbul Merkez', 'İstanbul Araç Kiralama Merkez', 'merkez', 1, 50.00, 50.00, 3),
        ('Ankara Merkez', 'Ankara Araç Kiralama Merkez', 'merkez', 2, 40.00, 40.00, 2),
        ('İzmir Merkez', 'İzmir Araç Kiralama Merkez', 'merkez', 3, 45.00, 45.00, 2),
        ('Antalya Merkez', 'Antalya Araç Kiralama Merkez', 'merkez', 4, 60.00, 60.00, 3)
    ) AS t(name_val, meta_val, type_val, sort_val, delivery_val, drop_val, min_days_val)
    WHERE NOT EXISTS (SELECT 1 FROM rentacar_locations WHERE name = t.name_val);
    
    -- Alt lokasyonlar
    INSERT INTO rentacar_locations (
        id, created_at, updated_at, tenant_id, name, meta_title, parent_id, type, sort, 
        delivery_fee, drop_fee, min_day_count, is_active
    )
    SELECT 
        gen_random_uuid(),
        NOW(),
        NOW(),
        v_rentacar_tenant_id,
        name_val,
        meta_val,
        (SELECT id FROM rentacar_locations WHERE name = parent_val LIMIT 1),
        type_val::rentacar_locations_type_enum,
        sort_val,
        delivery_val::numeric,
        0.00,
        NULL,
        true
    FROM (VALUES
        ('İstanbul Havalimanı', 'İstanbul Havalimanı Teslimat', 'İstanbul Merkez', 'havalimani', 5, 150.00),
        ('Sabiha Gökçen Havalimanı', 'Sabiha Gökçen Teslimat', 'İstanbul Merkez', 'havalimani', 6, 120.00),
        ('Taksim Otel Bölgesi', 'Taksim Otel Teslimat', 'İstanbul Merkez', 'otel', 7, 80.00),
        ('Esenboğa Havalimanı', 'Esenboğa Teslimat', 'Ankara Merkez', 'havalimani', 8, 100.00),
        ('Ankara Otel Bölgesi', 'Ankara Otel Teslimat', 'Ankara Merkez', 'otel', 9, 60.00),
        ('Adnan Menderes Havalimanı', 'Adnan Menderes Teslimat', 'İzmir Merkez', 'havalimani', 10, 90.00),
        ('Antalya Havalimanı', 'Antalya Havalimanı Teslimat', 'Antalya Merkez', 'havalimani', 11, 80.00),
        ('Lara Otel Bölgesi', 'Lara Otel Teslimat', 'Antalya Merkez', 'otel', 12, 70.00),
        ('Kemer Otel Bölgesi', 'Kemer Otel Teslimat', 'Antalya Merkez', 'otel', 13, 100.00),
        ('İstanbul Kadıköy', 'Kadıköy Adres Teslimat', 'İstanbul Merkez', 'adres', 14, 100.00),
        ('Ankara Çankaya', 'Çankaya Adres Teslimat', 'Ankara Merkez', 'adres', 15, 80.00)
    ) AS t(name_val, meta_val, parent_val, type_val, sort_val, delivery_val)
    WHERE NOT EXISTS (SELECT 1 FROM rentacar_locations WHERE name = t.name_val);
END $$;


-- ============================================================
-- 10. LOCATION VEHICLE PRICING (Location ve Vehicle başına fiyat)
-- ============================================================
INSERT INTO location_vehicle_pricing (
    id, created_at, updated_at, location_id, vehicle_id, month, day_range, price, discount, min_days, is_active
)
SELECT 
    gen_random_uuid(),
    NOW(),
    NOW(),
    loc.id,
    v.id,
    month_val,
    CASE 
        WHEN day_range_idx = 1 THEN '1-3'::location_vehicle_pricing_day_range_enum
        WHEN day_range_idx = 2 THEN '4-6'::location_vehicle_pricing_day_range_enum
        WHEN day_range_idx = 3 THEN '7-10'::location_vehicle_pricing_day_range_enum
        WHEN day_range_idx = 4 THEN '14-20'::location_vehicle_pricing_day_range_enum
        WHEN day_range_idx = 5 THEN '30++'::location_vehicle_pricing_day_range_enum
        ELSE '1-3'::location_vehicle_pricing_day_range_enum
    END,
    CASE 
        WHEN day_range_idx = 1 THEN v.base_rate::numeric * 1.2
        WHEN day_range_idx = 2 THEN v.base_rate::numeric * 1.1
        WHEN day_range_idx = 3 THEN v.base_rate::numeric * 1.0
        WHEN day_range_idx = 4 THEN v.base_rate::numeric * 0.95
        WHEN day_range_idx = 5 THEN v.base_rate::numeric * 0.9
        ELSE v.base_rate::numeric
    END,
    0.00,
    CASE 
        WHEN day_range_idx = 1 THEN 1
        WHEN day_range_idx = 2 THEN 4
        WHEN day_range_idx = 3 THEN 7
        WHEN day_range_idx = 4 THEN 14
        WHEN day_range_idx = 5 THEN 30
        ELSE 1
    END,
    true
FROM rentacar_locations loc
CROSS JOIN vehicles v
CROSS JOIN generate_series(1, 12) AS month_val
CROSS JOIN generate_series(1, 5) AS day_range_idx
WHERE loc.type = 'merkez'
  AND NOT EXISTS (
      SELECT 1 FROM location_vehicle_pricing lvp 
      WHERE lvp.location_id = loc.id 
        AND lvp.vehicle_id = v.id 
        AND lvp.month = month_val
        AND lvp.day_range = CASE 
            WHEN day_range_idx = 1 THEN '1-3'::location_vehicle_pricing_day_range_enum
            WHEN day_range_idx = 2 THEN '4-6'::location_vehicle_pricing_day_range_enum
            WHEN day_range_idx = 3 THEN '7-10'::location_vehicle_pricing_day_range_enum
            WHEN day_range_idx = 4 THEN '14-20'::location_vehicle_pricing_day_range_enum
            WHEN day_range_idx = 5 THEN '30++'::location_vehicle_pricing_day_range_enum
            ELSE '1-3'::location_vehicle_pricing_day_range_enum
        END
  )
LIMIT 100;

-- ============================================================
-- 11. LOCATION DELIVERY PRICING (Merkez lokasyonlar için alt lokasyonlara teslimat ücretleri)
-- ============================================================
INSERT INTO location_delivery_pricing (
    id, created_at, updated_at, location_id, delivery_location_id, distance, fee, is_active
)
SELECT 
    gen_random_uuid(),
    NOW(),
    NOW(),
    parent_loc.id,
    child_loc.id,
    CASE 
        WHEN child_loc.type = 'havalimani' THEN 25.0
        WHEN child_loc.type = 'otel' THEN 15.0
        WHEN child_loc.type = 'adres' THEN 10.0
        ELSE 5.0
    END,
    child_loc.delivery_fee,
    true
FROM rentacar_locations parent_loc
INNER JOIN rentacar_locations child_loc ON child_loc.parent_id = parent_loc.id
WHERE parent_loc.type = 'merkez'
  AND NOT EXISTS (
      SELECT 1 FROM location_delivery_pricing ldp 
      WHERE ldp.location_id = parent_loc.id 
        AND ldp.delivery_location_id = child_loc.id
  );

-- ============================================================
-- 12. EXTRAS (12 adet - Tenant relation)
-- ============================================================
INSERT INTO rentacar_extras (
    id, created_at, updated_at, tenant_id, name, price, currency_code, 
    is_mandatory, is_active, sales_type, description
)
SELECT 
    gen_random_uuid(),
    NOW(),
    NOW(),
    (SELECT id FROM tenants WHERE category = 'rentacar' LIMIT 1),
    name_val,
    price_val::numeric,
    'EUR',
    mandatory_val,
    true,
    sales_type_val::rentacar_extras_sales_type_enum,
    desc_val
FROM (VALUES
    ('Ekstra Sürücü', 15.00, false, 'daily', 'İkinci sürücü ekleme ücreti'),
    ('Bebek Koltuğu (0-12 ay)', 5.00, false, 'daily', 'Bebek koltuğu kiralama'),
    ('Çocuk Koltuğu (1-4 yaş)', 5.00, false, 'daily', 'Çocuk koltuğu kiralama'),
    ('Çocuk Koltuğu (4-12 yaş)', 5.00, false, 'daily', 'Yükseltilmiş çocuk koltuğu'),
    ('Navigasyon Sistemi', 8.00, false, 'daily', 'GPS navigasyon cihazı'),
    ('Wi-Fi Hotspot', 10.00, false, 'daily', 'Araç içi internet bağlantısı'),
    ('Ek Sigorta (Full Coverage)', 25.00, false, 'daily', 'Kapsamlı sigorta paketi'),
    ('Zincir (Kış)', 20.00, false, 'per_rental', 'Karlı yollar için zincir seti'),
    ('Roof Box', 12.00, false, 'daily', 'Tavan bagaj kutusu'),
    ('GPS Takip Sistemi', 0.00, true, 'per_rental', 'Zorunlu GPS takip'),
    ('Havaalanı Transfer', 50.00, false, 'per_rental', 'Havaalanı transfer hizmeti'),
    ('Ek Temizlik Paketi', 30.00, false, 'per_rental', 'Detaylı temizlik paketi')
) AS t(name_val, price_val, mandatory_val, sales_type_val, desc_val)
WHERE NOT EXISTS (SELECT 1 FROM rentacar_extras WHERE name = t.name_val);

-- ============================================================
-- 13. CUSTOMERS (20 adet - Tenant, Language relation)
-- ============================================================
DO $$
DECLARE
    v_rentacar_tenant_id UUID;
BEGIN
    SELECT id INTO v_rentacar_tenant_id FROM tenants WHERE category = 'rentacar' LIMIT 1;
    
    INSERT INTO customers (
        id, created_at, updated_at, tenant_id, first_name, last_name, full_name,
        birth_place, birth_date, gender, language_id, country, mobile_phone,
        home_phone, email, tax_office, tax_number, home_address, work_address,
        id_type, id_number, id_issue_place, id_issue_date, license_number,
        license_class, license_issue_place, license_issue_date, is_active, is_blacklisted
    )
    SELECT 
        gen_random_uuid(),
        NOW(),
        NOW(),
        v_rentacar_tenant_id,
        first_val,
        last_val,
        first_val || ' ' || last_val,
        birth_place_val,
        birth_date_val::date,
        gender_val::customers_gender_enum,
        (SELECT id FROM languages WHERE code = lang_code_val LIMIT 1),
        country_val,
        phone_val,
        CASE WHEN home_phone_val IS NOT NULL THEN home_phone_val ELSE NULL END,
        email_val,
        CASE WHEN tax_office_val IS NOT NULL THEN tax_office_val ELSE NULL END,
        CASE WHEN tax_num_val IS NOT NULL THEN tax_num_val ELSE NULL END,
        address_val,
        CASE WHEN work_addr_val IS NOT NULL THEN work_addr_val ELSE NULL END,
        id_type_val::customers_id_type_enum,
        id_num_val,
        id_issue_place_val,
        id_issue_date_val::date,
        license_num_val,
        license_class_val,
        license_issue_place_val,
        license_issue_date_val::date,
        true,
        false
    FROM (VALUES
        ('Ahmet', 'Yılmaz', 'İstanbul', '1990-05-15', 'male', 'tr', 'TR', '5321234567', NULL, 'ahmet.yilmaz@email.com', 'Kadıköy', '1234567890', 'Kadıköy, İstanbul', NULL, 'tc', '12345678901', 'İstanbul', '2010-01-15', 'A12345678', 'B', 'İstanbul', '2015-06-20'),
        ('Ayşe', 'Demir', 'Ankara', '1988-08-22', 'female', 'tr', 'TR', '5329876543', NULL, 'ayse.demir@email.com', 'Çankaya', '9876543210', 'Çankaya, Ankara', NULL, 'tc', '98765432109', 'Ankara', '2008-03-10', 'B87654321', 'B', 'Ankara', '2013-09-15'),
        ('Mehmet', 'Kaya', 'İzmir', '1992-11-30', 'male', 'tr', 'TR', '5325551234', '2321234567', 'mehmet.kaya@email.com', 'Karşıyaka', '5555666677', 'Karşıyaka, İzmir', NULL, 'tc', '55556666779', 'İzmir', '2012-05-20', 'C55556666', 'B', 'İzmir', '2017-11-10'),
        ('Fatma', 'Özkan', 'Antalya', '1995-03-18', 'female', 'tr', 'TR', '5324445678', NULL, 'fatma.ozkan@email.com', 'Muratpaşa', '4444555566', 'Muratpaşa, Antalya', NULL, 'tc', '44445555661', 'Antalya', '2013-07-08', 'D44445555', 'B', 'Antalya', '2018-05-22'),
        ('John', 'Smith', 'London', '1985-12-05', 'male', 'en', 'GB', '+447911123456', NULL, 'john.smith@email.com', NULL, NULL, 'London, UK', NULL, 'passport', 'GB123456789', 'London', '2005-01-10', 'GB987654', 'B', 'London', '2010-06-15'),
        ('Maria', 'Garcia', 'Madrid', '1990-07-25', 'female', 'en', 'ES', '+34612345678', NULL, 'maria.garcia@email.com', NULL, NULL, 'Madrid, Spain', NULL, 'passport', 'ES987654321', 'Madrid', '2010-03-20', 'ES123456', 'B', 'Madrid', '2015-08-30'),
        ('Hans', 'Müller', 'Berlin', '1987-04-12', 'male', 'de', 'DE', '+4915123456789', NULL, 'hans.muller@email.com', NULL, NULL, 'Berlin, Germany', NULL, 'passport', 'DE123456789', 'Berlin', '2007-02-14', 'DE987654', 'B', 'Berlin', '2012-07-25'),
        ('Emma', 'Johnson', 'New York', '1993-09-08', 'female', 'en', 'US', '+12125551234', NULL, 'emma.johnson@email.com', NULL, NULL, 'New York, USA', NULL, 'passport', 'US123456789', 'New York', '2011-04-18', 'US987654', 'B', 'New York', '2016-09-12'),
        ('Ali', 'Şahin', 'Bursa', '1989-06-20', 'male', 'tr', 'TR', '5327778888', NULL, 'ali.sahin@email.com', 'Osmangazi', '7777888899', 'Osmangazi, Bursa', NULL, 'tc', '77778888993', 'Bursa', '2009-08-25', 'E77778888', 'B', 'Bursa', '2014-10-05'),
        ('Zeynep', 'Arslan', 'Kocaeli', '1991-02-14', 'female', 'tr', 'TR', '5326667777', NULL, 'zeynep.arslan@email.com', 'İzmit', '6666777788', 'İzmit, Kocaeli', NULL, 'tc', '66667777885', 'Kocaeli', '2011-01-30', 'F66667777', 'B', 'Kocaeli', '2016-03-18')
    ) AS t(first_val, last_val, birth_place_val, birth_date_val, gender_val, lang_code_val, country_val, phone_val, home_phone_val, email_val, tax_office_val, tax_num_val, address_val, work_addr_val, id_type_val, id_num_val, id_issue_place_val, id_issue_date_val, license_num_val, license_class_val, license_issue_place_val, license_issue_date_val)
    WHERE NOT EXISTS (SELECT 1 FROM customers WHERE email = t.email_val);
END $$;

-- ============================================================
-- 14. CUSTOMER EMAILS (Customer relation ile)
-- ============================================================
INSERT INTO customer_emails (
    id, created_at, updated_at, tenant_id, customer_id, email, first_name, last_name,
    is_subscribed, subscription_date, email_verified, bounce_count
)
SELECT 
    gen_random_uuid(),
    NOW(),
    NOW(),
    c.tenant_id,
    c.id,
    c.email,
    c.first_name,
    c.last_name,
    true,
    NOW(),
    true,
    0
FROM customers c
WHERE c.email IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM customer_emails WHERE email = c.email);

-- ============================================================
-- 15. BLOGS (20 adet - Tenant, Location relation ile)
-- ============================================================
INSERT INTO blogs (
    id, created_at, updated_at, tenant_id, location_id, title, slug, content, 
    status, published_at
)
SELECT 
    gen_random_uuid(),
    NOW(),
    NOW(),
    CASE 
        WHEN tenant_type = 'rentacar' THEN (SELECT id FROM tenants WHERE category = 'rentacar' LIMIT 1)
        ELSE (SELECT id FROM tenants WHERE category = 'tour' LIMIT 1)
    END,
    CASE 
        WHEN loc_name IS NOT NULL THEN (SELECT id FROM rentacar_locations WHERE name = loc_name LIMIT 1)
        ELSE NULL
    END,
    title_val,
    slug_val,
    content_val,
    status_val::blogs_status_enum,
    CASE WHEN status_val = 'published' THEN NOW() - (random() * INTERVAL '30 days') ELSE NULL END
FROM (VALUES
    ('İstanbul''da En İyi Araç Kiralama Noktaları', 'istanbul-en-iyi-arac-kiralama', 'İstanbul şehir merkezinde ve havalimanlarında araç kiralama hizmetlerimiz hakkında bilgi...', 'published', 'rentacar', 'İstanbul Merkez'),
    ('Kapadokya Balon Turu Rehberi', 'kapadokya-balon-turu-rehberi', 'Kapadokya''da balon turu yapmak istiyorsanız bu rehberi mutlaka okuyun...', 'published', 'tour', NULL),
    ('Yaz Tatili İçin Araç Kiralama İpuçları', 'yaz-tatili-arac-kiralama-ipuclari', 'Yaz sezonunda araç kiralarken dikkat edilmesi gerekenler...', 'published', 'rentacar', NULL),
    ('Efes Antik Kenti Gezi Rehberi', 'efes-antik-kenti-gezi-rehberi', 'Efes Antik Kenti''ni gezmek için detaylı rehber...', 'published', 'tour', NULL),
    ('Havalimanı Teslimat Hizmeti Nasıl Çalışır?', 'havalimani-teslimat-hizmeti', 'Havalimanında araç teslimi ve alımı süreçleri hakkında bilgi...', 'published', 'rentacar', 'İstanbul Havalimanı'),
    ('Kış Lastiği Kiralama', 'kis-lastigi-kiralama', 'Kış aylarında güvenli sürüş için kış lastiği kiralama seçenekleri...', 'published', 'rentacar', NULL),
    ('Pamukkale Travertenleri Turu', 'pamukkale-travertenleri-turu', 'Pamukkale''nin doğal güzelliklerini keşfedin...', 'published', 'tour', NULL),
    ('Ekonomik Araç Kiralama Rehberi', 'ekonomik-arac-kiralama-rehberi', 'Bütçenize uygun araç kiralama seçenekleri...', 'published', 'rentacar', NULL),
    ('Lüks Araç Kiralama Avantajları', 'luks-arac-kiralama-avantajlari', 'Premium araç kiralama hizmetlerimiz ve avantajları...', 'published', 'rentacar', NULL),
    ('İstanbul Tarihi Yarımada Turu', 'istanbul-tarihi-yarimada-turu', 'Sultanahmet bölgesini keşfedin...', 'published', 'tour', NULL),
    ('Araç Kiralama Sigorta Seçenekleri', 'arac-kiralama-sigorta-secenekleri', 'Hangi sigorta paketini seçmelisiniz?...', 'draft', 'rentacar', NULL),
    ('Kapadokya Gece Konaklama Önerileri', 'kapadokya-gece-konaklama-onerileri', 'Kapadokya''da nerede kalınır?...', 'published', 'tour', NULL),
    ('SUV Araç Kiralama İpuçları', 'suv-arac-kiralama-ipuclari', 'SUV araç kiralarken dikkat edilmesi gerekenler...', 'published', 'rentacar', NULL),
    ('Ayasofya ve Sultanahmet Camii Gezi', 'ayasofya-sultanahmet-camii-gezi', 'İstanbul''un en önemli tarihi yapıları...', 'published', 'tour', NULL),
    ('Uzun Dönem Araç Kiralama', 'uzun-donem-arac-kiralama', '1 aydan uzun süreli kiralama avantajları...', 'published', 'rentacar', NULL),
    ('Roma Kolezyum Turu', 'roma-kolezyum-turu', 'Roma''nın simgesi Kolezyum hakkında bilgiler...', 'published', 'tour', NULL),
    ('Araç Kiralama Sıkça Sorulan Sorular', 'arac-kiralama-sik-sorulan-sorular', 'Araç kiralama hakkında merak ettikleriniz...', 'published', 'rentacar', NULL),
    ('Paris Eyfel Kulesi Deneyimi', 'paris-eyfel-kulesi-deneyimi', 'Paris''in simgesi Eyfel Kulesi turu...', 'published', 'tour', NULL),
    ('Hibrit Araç Kiralama', 'hibrit-arac-kiralama', 'Çevre dostu hibrit araç kiralama seçenekleri...', 'published', 'rentacar', NULL),
    ('Barselona Sagrada Familia Ziyareti', 'barselona-sagrada-familia-ziyareti', 'Gaudi''nin şaheseri Sagrada Familia...', 'published', 'tour', NULL)
) AS t(title_val, slug_val, content_val, status_val, tenant_type, loc_name)
WHERE NOT EXISTS (SELECT 1 FROM blogs WHERE slug = t.slug_val);


-- ============================================================
-- 16. TOURS (12 adet - Tenant, Destination relation ile)
-- ============================================================
DO $$
DECLARE
    v_tour_tenant_id UUID;
    v_en_lang_id UUID;
BEGIN
    SELECT id INTO v_tour_tenant_id FROM tenants WHERE category = 'tour' LIMIT 1;
    SELECT id INTO v_en_lang_id FROM languages WHERE code = 'en' LIMIT 1;
    
    INSERT INTO tours (
        id, created_at, updated_at, tenant_id, destination_id, title, slug, summary,
        description, base_price, currency_code, duration_hours, duration, duration_unit,
        max_capacity, days, video, tags, is_active, default_language_id
    )
    SELECT 
        gen_random_uuid(),
        NOW(),
        NOW(),
        v_tour_tenant_id,
        d.id,
        title_val,
        slug_val,
        summary_val,
        description_val,
        price_val::numeric,
        'EUR',
        duration_val,
        duration_val,
        'hour',
        capacity_val,
        days_val,
        video_val,
        tags_val,
        true,
        v_en_lang_id
    FROM destinations d
    CROSS JOIN (VALUES
        ('Kapadokya Balon Turu', 'kapadokya-balon-turu', 'Gün doğumunda balon uçuşu', 'Profesyonel pilotlarla 60 dakikalık balon turu...', 250, 4, 20, ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']::text[], 'https://youtube.com/watch?v=example1', ARRAY['balloon', 'sunrise', 'cappadocia']::text[]),
        ('Efes Antik Kenti Turu', 'efes-antik-kenti-turu', 'Tarihi Efes kentini keşfedin', 'Efes antik kentinin tarihi yapılarını gezin...', 80, 3, 25, ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday']::text[], NULL, ARRAY['historical', 'ephesus', 'ancient']::text[]),
        ('Pamukkale Travertenleri', 'pamukkale-travertenleri', 'Doğal traverten havuzları', 'Pamukkale''nin eşsiz doğal güzelliklerini görün...', 100, 6, 30, ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']::text[], NULL, ARRAY['nature', 'travertine', 'thermal']::text[]),
        ('Sultanahmet Gezi Turu', 'sultanahmet-gezi-turu', 'Tarihi yarımada turu', 'Ayasofya, Sultanahmet Camii ve Topkapı Sarayı...', 60, 4, 35, ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']::text[], NULL, ARRAY['istanbul', 'historical', 'cultural']::text[]),
        ('Ayasofya Müze Turu', 'ayasofya-muze-turu', 'Ayasofya''yı keşfedin', 'Tarihi Ayasofya müzesini rehberli tur ile gezin...', 50, 2, 40, ARRAY['tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']::text[], NULL, ARRAY['museum', 'historical', 'istanbul']::text[]),
        ('Colosseum Tour', 'colosseum-tour', 'Ancient Rome Experience', 'Explore the iconic Colosseum in Rome...', 150, 3, 30, ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']::text[], 'https://youtube.com/watch?v=example2', ARRAY['rome', 'colosseum', 'ancient']::text[]),
        ('Eiffel Tower Experience', 'eiffel-tower-experience', 'Paris Iconic Tower', 'Visit the Eiffel Tower in Paris...', 180, 2, 25, ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']::text[], NULL, ARRAY['paris', 'eiffel', 'iconic']::text[]),
        ('Sagrada Familia Visit', 'sagrada-familia-visit', 'Gaudi Masterpiece', 'Explore Gaudi''s masterpiece in Barcelona...', 120, 2, 30, ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']::text[], NULL, ARRAY['barcelona', 'gaudi', 'architecture']::text[]),
        ('Acropolis Tour', 'acropolis-tour', 'Ancient Athens', 'Discover the Acropolis in Athens...', 100, 3, 35, ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']::text[], NULL, ARRAY['athens', 'acropolis', 'ancient']::text[]),
        ('Kapadokya Gece Turu', 'kapadokya-gece-turu', 'Kapadokya''yı gece görün', 'Kapadokya''nın büyüleyici gece manzarası...', 90, 3, 20, ARRAY['friday', 'saturday']::text[], NULL, ARRAY['cappadocia', 'night', 'scenic']::text[]),
        ('Ephesus Ancient City', 'ephesus-ancient-city', 'Historical Ephesus', 'Detailed tour of Ephesus ancient city...', 85, 4, 28, ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday']::text[], NULL, ARRAY['ephesus', 'ancient', 'historical']::text[]),
        ('İstanbul Boğaz Turu', 'istanbul-bogaz-turu', 'Boğaz manzarası', 'İstanbul Boğazı''nda tekne turu...', 70, 2, 50, ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']::text[], NULL, ARRAY['bosphorus', 'cruise', 'istanbul']::text[])
    ) AS t(title_val, slug_val, summary_val, description_val, price_val, duration_val, capacity_val, days_val, video_val, tags_val)
    WHERE (d.name LIKE '%Kapadokya%' OR d.name LIKE '%Ephesus%' OR d.name LIKE '%Pamukkale%' OR d.name LIKE '%Sultanahmet%' OR d.name LIKE '%Ayasofya%' OR d.name LIKE '%Colosseum%' OR d.name LIKE '%Eiffel%' OR d.name LIKE '%Sagrada%' OR d.name LIKE '%Acropolis%' OR d.city = 'İstanbul')
      AND NOT EXISTS (SELECT 1 FROM tours WHERE slug = t.slug_val)
    LIMIT 12;
END $$;

-- Tour Languages (Many-to-Many)
INSERT INTO tour_languages (tour_id, language_id)
SELECT DISTINCT
    t.id,
    l.id
FROM tours t
CROSS JOIN languages l
WHERE l.code IN ('tr', 'en')
  AND NOT EXISTS (
      SELECT 1 FROM tour_languages tl 
      WHERE tl.tour_id = t.id AND tl.language_id = l.id
  );

-- ============================================================
-- 17. TOUR SESSIONS (Tour başına 5-8 adet)
-- ============================================================
INSERT INTO tour_sessions (
    id, created_at, updated_at, tour_id, starts_at, ends_at, capacity, available_slots, price_override
)
SELECT 
    gen_random_uuid(),
    NOW(),
    NOW(),
    t.id,
    NOW() + (session_num * INTERVAL '3 days') + (random() * INTERVAL '60 days'),
    NOW() + (session_num * INTERVAL '3 days') + (random() * INTERVAL '60 days') + (t.duration_hours || ' hours')::interval,
    t.max_capacity,
    GREATEST(0, t.max_capacity - FLOOR(random() * 10)::int),
    CASE WHEN random() > 0.7 THEN t.base_price * 1.2 ELSE NULL END
FROM tours t
CROSS JOIN generate_series(1, 8) AS session_num
WHERE NOT EXISTS (
    SELECT 1 FROM tour_sessions ts 
    WHERE ts.tour_id = t.id 
      AND ts.starts_at = NOW() + (session_num * INTERVAL '3 days')
    LIMIT 1
)
LIMIT (SELECT COUNT(*) * 8 FROM tours WHERE id NOT IN (SELECT DISTINCT tour_id FROM tour_sessions WHERE tour_id IS NOT NULL));

-- ============================================================
-- 18. RESERVATIONS (40 adet - Tenant, Tour/TourSession, Customer relation)
-- ============================================================
DO $$
DECLARE
    v_reservation_count INTEGER := 0;
    v_max_reservations INTEGER := 40;
BEGIN
    -- Tour reservations
    INSERT INTO reservations (
        id, created_at, updated_at, tenant_id, reference, type, status, customer_name,
        customer_email, customer_phone, customer_phone_country_id, customer_language_id,
        check_in, check_out, metadata, tour_id, tour_session_id
    )
    SELECT 
        gen_random_uuid(),
        NOW() - (random() * INTERVAL '90 days'),
        NOW() - (random() * INTERVAL '90 days'),
        (SELECT id FROM tenants WHERE category = 'tour' LIMIT 1),
        'RES-' || UPPER(SUBSTRING(MD5(RANDOM()::text), 1, 8)),
        'tour',
        CASE 
            WHEN random() > 0.7 THEN 'confirmed'
            WHEN random() > 0.5 THEN 'completed'
            WHEN random() > 0.3 THEN 'pending'
            ELSE 'cancelled'
        END::reservations_status_enum,
        c.first_name || ' ' || c.last_name,
        c.email,
        '532' || LPAD((FLOOR(random() * 10000000))::text, 7, '0'),
        (SELECT id FROM phone_countries WHERE dial_code = '+90' LIMIT 1),
        c.language_id,
        ts.starts_at,
        ts.ends_at,
        jsonb_build_object(
            'paymentMethod', CASE WHEN random() > 0.5 THEN 'credit_card' ELSE 'bank_transfer' END,
            'totalAmount', (t.base_price * (1 + random() * 0.2))::numeric,
            'currency', 'EUR'
        ),
        t.id,
        ts.id
    FROM customers c
    CROSS JOIN tours t
    INNER JOIN tour_sessions ts ON ts.tour_id = t.id
    WHERE c.email IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM reservations 
          WHERE customer_email = c.email 
            AND tour_id = t.id 
            AND tour_session_id = ts.id
      )
    ORDER BY RANDOM()
    LIMIT 20;
    
    GET DIAGNOSTICS v_reservation_count = ROW_COUNT;
    
    -- Rentacar reservations
    INSERT INTO reservations (
        id, created_at, updated_at, tenant_id, reference, type, status, customer_name,
        customer_email, customer_phone, customer_phone_country_id, customer_language_id,
        check_in, check_out, metadata
    )
    SELECT 
        gen_random_uuid(),
        NOW() - (random() * INTERVAL '90 days'),
        NOW() - (random() * INTERVAL '90 days'),
        (SELECT id FROM tenants WHERE category = 'rentacar' LIMIT 1),
        'RES-' || UPPER(SUBSTRING(MD5(RANDOM()::text), 1, 8)),
        'rentacar',
        CASE 
            WHEN random() > 0.7 THEN 'confirmed'
            WHEN random() > 0.5 THEN 'completed'
            WHEN random() > 0.3 THEN 'pending'
            ELSE 'cancelled'
        END::reservations_status_enum,
        c.first_name || ' ' || c.last_name,
        c.email,
        '532' || LPAD((FLOOR(random() * 10000000))::text, 7, '0'),
        (SELECT id FROM phone_countries WHERE dial_code = '+90' LIMIT 1),
        c.language_id,
        NOW() - (random() * INTERVAL '60 days'),
        NOW() - (random() * INTERVAL '60 days') + (FLOOR(random() * 14 + 1) || ' days')::interval,
        jsonb_build_object(
            'paymentMethod', CASE WHEN random() > 0.5 THEN 'credit_card' ELSE 'cash' END,
            'totalAmount', (200 + random() * 800)::numeric,
            'currency', 'EUR',
            'vehicleType', 'SUV'
        )
    FROM customers c
    WHERE c.email IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM reservations 
          WHERE customer_email = c.email 
            AND type = 'rentacar'
            AND check_in = NOW() - (random() * INTERVAL '60 days')
      )
    ORDER BY RANDOM()
    LIMIT (v_max_reservations - v_reservation_count);
END $$;


-- ============================================================
-- 19. SURVEYS (12 adet - Tenant, Language relation)
-- ============================================================
INSERT INTO surveys (
    id, created_at, updated_at, tenant_id, language_id, title, description,
    status, is_active, auto_send, send_after_days, email_subject, email_template
)
SELECT 
    gen_random_uuid(),
    NOW(),
    NOW(),
    CASE 
        WHEN tenant_type_val = 'rentacar' THEN (SELECT id FROM tenants WHERE category = 'rentacar' LIMIT 1)
        ELSE (SELECT id FROM tenants WHERE category = 'tour' LIMIT 1)
    END,
    (SELECT id FROM languages WHERE code = lang_code_val LIMIT 1),
    title_val,
    description_val,
    status_val::surveys_status_enum,
    true,
    auto_send_val,
    CASE WHEN auto_send_val THEN send_days_val ELSE NULL END,
    email_subject_val,
    email_template_val
FROM (VALUES
    ('Araç Kiralama Memnuniyet Anketi', 'Araç kiralama deneyiminizi değerlendirin', 'active', 'rentacar', 'tr', true, 1, 'Memnuniyet Anketi', 'Lütfen deneyiminizi değerlendirin'),
    ('Tour Experience Survey', 'Rate your tour experience', 'active', 'tour', 'en', true, 2, 'Experience Survey', 'Please rate your experience'),
    ('Hizmet Kalitesi Anketi', 'Hizmet kalitemizi değerlendirin', 'active', 'rentacar', 'tr', false, NULL, NULL, NULL),
    ('Kundenzufriedenheitsumfrage', 'Bewerten Sie Ihre Erfahrung', 'active', 'tour', 'de', true, 1, 'Umfrage', 'Bitte bewerten Sie'),
    ('Rezervasyon Süreci Değerlendirme', 'Rezervasyon sürecimizi nasıl buldunuz?', 'active', 'rentacar', 'tr', true, 1, 'Değerlendirme', 'Görüşleriniz bizim için önemli'),
    ('Post-Tour Feedback', 'Share your feedback after the tour', 'active', 'tour', 'en', true, 3, 'Feedback Request', 'We value your opinion'),
    ('Araç Durumu Anketi', 'Kiraladığınız aracın durumunu değerlendirin', 'draft', 'rentacar', 'tr', false, NULL, NULL, NULL),
    ('Tour Guide Evaluation', 'Evaluate your tour guide', 'active', 'tour', 'en', true, 1, 'Guide Evaluation', 'Rate your guide'),
    ('Genel Memnuniyet', 'Genel memnuniyet seviyeniz nedir?', 'active', 'rentacar', 'tr', true, 7, 'Memnuniyet Anketi', 'Görüşlerinizi bekliyoruz'),
    ('Destination Experience', 'How was your destination experience?', 'active', 'tour', 'en', true, 5, 'Destination Feedback', 'Share your thoughts'),
    ('Tekrar Kiralama Niyeti', 'Tekrar bizimle çalışır mısınız?', 'active', 'rentacar', 'tr', true, 14, 'Anket', 'Görüşleriniz değerli'),
    ('Recommendation Survey', 'Would you recommend us?', 'active', 'tour', 'en', true, 7, 'Recommendation', 'Your opinion matters')
) AS t(title_val, description_val, status_val, tenant_type_val, lang_code_val, auto_send_val, send_days_val, email_subject_val, email_template_val)
WHERE NOT EXISTS (SELECT 1 FROM surveys WHERE title = t.title_val);

-- ============================================================
-- 20. SURVEY QUESTIONS (Survey başına 3-4 adet)
-- ============================================================
INSERT INTO survey_questions (
    id, created_at, updated_at, survey_id, question_text, question_type, is_required, 
    options, sort_order
)
SELECT 
    gen_random_uuid(),
    NOW(),
    NOW(),
    s.id,
    question_text_val,
    question_type_val,
    required_val,
    CASE WHEN options_val IS NOT NULL THEN options_val::jsonb ELSE NULL END,
    row_number() OVER (PARTITION BY s.id ORDER BY question_num)
FROM surveys s
CROSS JOIN generate_series(1, 4) AS question_num
CROSS JOIN LATERAL (VALUES
    ('Genel memnuniyet seviyeniz nedir? (1-10)', 'rating', true, '{"min": 1, "max": 10}'::jsonb),
    ('Hizmet kalitesini nasıl değerlendirirsiniz?', 'multiple_choice', true, '["Mükemmel", "İyi", "Orta", "Kötü"]'::jsonb),
    ('Tekrar bizimle çalışır mısınız?', 'yes_no', true, NULL::jsonb),
    ('Ek görüşleriniz var mı?', 'text', false, NULL::jsonb)
) AS t(question_text_val, question_type_val, required_val, options_val)
WHERE NOT EXISTS (
    SELECT 1 FROM survey_questions sq 
    WHERE sq.survey_id = s.id 
      AND sq.sort_order = question_num
    LIMIT 1
)
LIMIT (SELECT COUNT(*) * 4 FROM surveys WHERE id NOT IN (SELECT DISTINCT survey_id FROM survey_questions WHERE survey_id IS NOT NULL));

-- ============================================================
-- 21. SURVEY RESPONSES (Survey başına 5-10 adet)
-- ============================================================
INSERT INTO survey_responses (
    id, created_at, updated_at, survey_id, question_id, customer_email, response_text,
    response_value, completed_at
)
SELECT 
    gen_random_uuid(),
    NOW() - (random() * INTERVAL '30 days'),
    NOW() - (random() * INTERVAL '30 days'),
    sq.survey_id,
    sq.id,
    c.email,
    CASE 
        WHEN sq.question_type = 'rating' THEN NULL
        WHEN sq.question_type = 'yes_no' THEN CASE WHEN random() > 0.5 THEN 'Evet' ELSE 'Hayır' END
        WHEN sq.question_type = 'multiple_choice' THEN (ARRAY['Mükemmel', 'İyi', 'Orta', 'Kötü'])[FLOOR(random() * 4 + 1)::int]
        ELSE 'Görüşlerim var...'
    END,
    CASE 
        WHEN sq.question_type = 'rating' THEN (FLOOR(random() * 10 + 1))::text
        ELSE NULL
    END,
    NOW() - (random() * INTERVAL '30 days')
FROM survey_questions sq
INNER JOIN surveys s ON s.id = sq.survey_id
CROSS JOIN (SELECT email FROM customers WHERE email IS NOT NULL LIMIT 20) AS c
WHERE NOT EXISTS (
    SELECT 1 FROM survey_responses sr 
    WHERE sr.survey_id = sq.survey_id 
      AND sr.question_id = sq.id 
      AND sr.customer_email = c.email
    LIMIT 1
)
ORDER BY RANDOM()
LIMIT 150;

-- ============================================================
-- 22. OPERATIONS (30 adet - Tenant relation)
-- ============================================================
INSERT INTO operations (
    id, created_at, updated_at, tenant_id, type, performed_by, performed_at, details
)
SELECT 
    gen_random_uuid(),
    NOW() - (random() * INTERVAL '60 days'),
    NOW() - (random() * INTERVAL '60 days'),
    CASE 
        WHEN type_val LIKE '%vehicle%' OR type_val LIKE '%rentacar%' THEN (SELECT id FROM tenants WHERE category = 'rentacar' LIMIT 1)
        ELSE (SELECT id FROM tenants WHERE category = 'tour' LIMIT 1)
    END,
    type_val,
    performed_by_val,
    NOW() - (random() * INTERVAL '60 days'),
    jsonb_build_object('action', type_val, 'timestamp', EXTRACT(EPOCH FROM NOW()))
FROM (VALUES
    ('vehicle_created'), ('vehicle_updated'), ('vehicle_deleted'),
    ('reservation_created'), ('reservation_confirmed'), ('reservation_cancelled'),
    ('customer_created'), ('customer_updated'),
    ('tour_created'), ('tour_updated'), ('tour_session_created'),
    ('location_created'), ('location_updated'),
    ('extra_created'), ('extra_updated'),
    ('payment_received'), ('refund_processed'),
    ('email_sent'), ('survey_sent'), ('survey_response_received')
) AS t(type_val)
CROSS JOIN (VALUES
    ('System'), ('Admin User'), ('Auto Process'), ('Customer Service')
) AS p(performed_by_val)
CROSS JOIN generate_series(1, 2) AS dup
ORDER BY RANDOM()
LIMIT 30;

-- ============================================================
-- 23. TOUR FEATURES (10 adet)
-- ============================================================
DO $$
DECLARE
    v_tour_tenant_id UUID;
BEGIN
    SELECT id INTO v_tour_tenant_id FROM tenants WHERE category = 'tour' LIMIT 1;
    
    INSERT INTO tour_features (
        id, created_at, updated_at, tenant_id, name, icon, is_active, sort_order
    )
    SELECT 
        gen_random_uuid(),
        NOW(),
        NOW(),
        v_tour_tenant_id,
        name_val,
        icon_val,
        true,
        row_number() OVER (ORDER BY name_val) - 1
    FROM (VALUES
        ('Rehberli Tur', 'mdi-account-tie'),
        ('Otel Transferi', 'mdi-car'),
        ('Kahvaltı Dahil', 'mdi-silverware-fork-knife'),
        ('Giriş Bileti', 'mdi-ticket'),
        ('Fotoğraf Çekimi', 'mdi-camera'),
        ('Dil Desteği', 'mdi-translate'),
        ('Grup İndirimi', 'mdi-account-group'),
        ('İptal İmkanı', 'mdi-cancel'),
        ('Sigorta Dahil', 'mdi-shield-check'),
        ('Wi-Fi', 'mdi-wifi')
    ) AS t(name_val, icon_val)
    WHERE NOT EXISTS (SELECT 1 FROM tour_features WHERE name = t.name_val);
END $$;

-- Tour Feature Translations
DO $$
DECLARE
    v_feature RECORD;
    v_lang RECORD;
    v_trans_data RECORD[];
    v_trans RECORD;
BEGIN
    -- Her feature için translation data (sort_order'a göre)
    FOR v_feature IN SELECT * FROM tour_features ORDER BY sort_order LOOP
        FOR v_lang IN SELECT * FROM languages WHERE code IN ('tr', 'en', 'de') LOOP
            IF NOT EXISTS (
                SELECT 1 FROM tour_feature_translations 
                WHERE feature_id = v_feature.id AND language_id = v_lang.id
            ) THEN
                INSERT INTO tour_feature_translations (
                    id, created_at, updated_at, feature_id, language_id, name, description
                )
                SELECT 
                    gen_random_uuid(),
                    NOW(),
                    NOW(),
                    v_feature.id,
                    v_lang.id,
                    CASE 
                        WHEN v_lang.code = 'tr' THEN t.trans_tr
                        ELSE t.trans_en
                    END,
                    CASE 
                        WHEN v_lang.code = 'tr' THEN t.desc_tr
                        ELSE t.desc_en
                    END
                FROM (VALUES
                    (0, 'Rehberli Tur', 'Guided Tour', 'Profesyonel rehber eşliğinde', 'Professional guide included'),
                    (1, 'Otel Transferi', 'Hotel Transfer', 'Otelinizden alınıp bırakılma', 'Pick up and drop off from hotel'),
                    (2, 'Kahvaltı Dahil', 'Breakfast Included', 'Kahvaltı masrafı dahil', 'Breakfast cost included'),
                    (3, 'Giriş Bileti', 'Entrance Ticket', 'Tüm giriş biletleri dahil', 'All entrance tickets included'),
                    (4, 'Fotoğraf Çekimi', 'Photo Service', 'Profesyonel fotoğraf hizmeti', 'Professional photography service'),
                    (5, 'Dil Desteği', 'Language Support', 'Çoklu dil desteği', 'Multi-language support'),
                    (6, 'Grup İndirimi', 'Group Discount', 'Grup için özel indirim', 'Special discount for groups'),
                    (7, 'İptal İmkanı', 'Cancellation Option', 'Ücretsiz iptal seçeneği', 'Free cancellation option'),
                    (8, 'Sigorta Dahil', 'Insurance Included', 'Seyahat sigortası dahil', 'Travel insurance included'),
                    (9, 'Wi-Fi', 'Wi-Fi', 'Ücretsiz internet', 'Free internet')
                ) AS t(sort_idx, trans_tr, trans_en, desc_tr, desc_en)
                WHERE t.sort_idx = v_feature.sort_order;
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- ============================================================
-- ÖZET RAPOR
-- ============================================================
DO $$
DECLARE
    v_destinations INTEGER;
    v_hotels INTEGER;
    v_blogs INTEGER;
    v_reservations INTEGER;
    v_customers INTEGER;
    v_tours INTEGER;
    v_vehicles INTEGER;
    v_extras INTEGER;
    v_surveys INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_destinations FROM destinations;
    SELECT COUNT(*) INTO v_hotels FROM hotels;
    SELECT COUNT(*) INTO v_blogs FROM blogs;
    SELECT COUNT(*) INTO v_reservations FROM reservations;
    SELECT COUNT(*) INTO v_customers FROM customers;
    SELECT COUNT(*) INTO v_tours FROM tours;
    SELECT COUNT(*) INTO v_vehicles FROM vehicles;
    SELECT COUNT(*) INTO v_extras FROM rentacar_extras;
    SELECT COUNT(*) INTO v_surveys FROM surveys;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DUMMY DATA SEED TAMAMLANDI!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Destinations: %', v_destinations;
    RAISE NOTICE 'Hotels: %', v_hotels;
    RAISE NOTICE 'Blogs: %', v_blogs;
    RAISE NOTICE 'Reservations: %', v_reservations;
    RAISE NOTICE 'Customers: %', v_customers;
    RAISE NOTICE 'Tours: %', v_tours;
    RAISE NOTICE 'Vehicles: %', v_vehicles;
    RAISE NOTICE 'Extras: %', v_extras;
    RAISE NOTICE 'Surveys: %', v_surveys;
    RAISE NOTICE '========================================';
END $$;

