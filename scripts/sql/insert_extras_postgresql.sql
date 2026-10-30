-- Rentacar Extras Sample Data Insert Script (PostgreSQL)
-- Tablo: rentacar_extras
-- 
-- KULLANIM: 
-- 1. Aşağıdaki '30119880-b233-4896-b612-1463e32617f2' kısmını kendi tenant_id'niz ile değiştirin
-- 2. SQL script'ini PostgreSQL veritabanınızda çalıştırın

INSERT INTO rentacar_extras (
  id,
  tenant_id,
  name,
  price,
  currency_code,
  is_mandatory,
  is_active,
  sales_type,
  description,
  image_url,
  created_at,
  updated_at
) VALUES
-- Mini Hasar Paketi
(
  gen_random_uuid(),
  '30119880-b233-4896-b612-1463e32617f2', -- Buraya tenant_id yazın
  'Mini Hasar Paketi',
  2.00,
  'TRY',
  true,
  true,
  'daily',
  NULL,
  NULL,
  NOW(),
  NOW()
),
-- Navigasyon
(
  gen_random_uuid(),
  '30119880-b233-4896-b612-1463e32617f2',
  'Navigasyon',
  3.00,
  'TRY',
  false,
  true,
  'daily',
  NULL,
  NULL,
  NOW(),
  NOW()
),
-- Kış Lastiği
(
  gen_random_uuid(),
  '30119880-b233-4896-b612-1463e32617f2',
  'Kış Lastiği',
  2.00,
  'TRY',
  false,
  false,
  'daily',
  NULL,
  NULL,
  NOW(),
  NOW()
),
-- Hızlı Geçiş HGS
(
  gen_random_uuid(),
  '30119880-b233-4896-b612-1463e32617f2',
  'Hızlı Geçiş HGS',
  19.00,
  'TRY',
  false,
  true,
  'per_rental',
  NULL,
  NULL,
  NOW(),
  NOW()
),
-- Çocuk Koltuğu
(
  gen_random_uuid(),
  '30119880-b233-4896-b612-1463e32617f2',
  'Çocuk Koltuğu',
  3.00,
  'TRY',
  false,
  true,
  'daily',
  NULL,
  NULL,
  NOW(),
  NOW()
),
-- Kar Lastik Paleti
(
  gen_random_uuid(),
  '30119880-b233-4896-b612-1463e32617f2',
  'Kar Lastik Paleti',
  2.00,
  'TRY',
  false,
  false,
  'daily',
  NULL,
  NULL,
  NOW(),
  NOW()
),
-- Kapsamlı Sigorta
(
  gen_random_uuid(),
  '30119880-b233-4896-b612-1463e32617f2',
  'Kapsamlı Sigorta',
  3.00,
  'TRY',
  true,
  true,
  'daily',
  NULL,
  NULL,
  NOW(),
  NOW()
),
-- Ek 400 Km Paketi
(
  gen_random_uuid(),
  '30119880-b233-4896-b612-1463e32617f2',
  'Ek 400 Km Paketi',
  39.00,
  'TRY',
  false,
  true,
  'per_rental',
  NULL,
  NULL,
  NOW(),
  NOW()
),
-- Çocuk Koltuk Yükseltici
(
  gen_random_uuid(),
  '30119880-b233-4896-b612-1463e32617f2',
  'Çocuk Koltuk Yükseltici',
  3.00,
  'TRY',
  false,
  true,
  'daily',
  NULL,
  NULL,
  NOW(),
  NOW()
),
-- Wifi-İnternet
(
  gen_random_uuid(),
  '30119880-b233-4896-b612-1463e32617f2',
  'Wifi-İnternet',
  4.00,
  'TRY',
  false,
  true,
  'daily',
  NULL,
  NULL,
  NOW(),
  NOW()
);

