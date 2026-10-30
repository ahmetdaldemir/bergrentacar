-- Example: Insert Transfer Pricing (New KM-Based System)
-- 
-- Pricing Formula:
-- Total Price = (Distance × Base KM Price × Passenger Multiplier × Round Trip Multiplier) + Night Surcharge + Extra Services
--
-- Example Scenario:
-- - Vehicle: VIP Sedan
-- - Base KM Price: 2 EUR/km
-- - Distance: 50 km (from airport to hotel)
-- - Passengers: 3
-- - Passenger Multiplier for 3: 1.5
-- - Round Trip: Yes (×2)
-- - Night Rate: 10 EUR
-- - Total: (50 × 2 × 1.5 × 2) + 10 = 310 EUR

-- Step 1: Get tenant's default currency
-- Assuming tenant has EUR as default currency

-- Step 2: Insert pricing for VIP vehicles
INSERT INTO transfer_pricings (
  id,
  tenant_id,
  vehicle_id,
  route_id,
  pricing_model,
  base_km_price,
  passenger_multipliers,
  currency_id,
  is_round_trip,
  is_night_rate,
  night_rate_surcharge,
  extra_service_prices,
  is_active,
  notes,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '/* YOUR_TENANT_ID */',
  '/* YOUR_VEHICLE_ID */',
  NULL, -- Route is optional now
  'per_km_per_person',
  2.00, -- 2 EUR per kilometer
  '{
    "1": 0.8,
    "2": 1.0,
    "3": 1.5,
    "4": 2.0,
    "5": 2.5,
    "6": 3.0,
    "7": 3.5,
    "8": 4.0
  }'::jsonb,
  (SELECT id FROM currencies WHERE code = 'EUR' LIMIT 1),
  false,
  false,
  10.00, -- 10 EUR night surcharge
  '{
    "baby_seat": 15.00,
    "waiting_time": 20.00,
    "meet_greet": 10.00
  }'::jsonb,
  true,
  'VIP vehicle pricing - 2 EUR/km with passenger multipliers',
  NOW(),
  NOW()
);

-- Example 2: Shuttle pricing (cheaper per km)
INSERT INTO transfer_pricings (
  id,
  tenant_id,
  vehicle_id,
  route_id,
  pricing_model,
  base_km_price,
  passenger_multipliers,
  currency_id,
  is_round_trip,
  is_night_rate,
  night_rate_surcharge,
  extra_service_prices,
  is_active,
  notes,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '/* YOUR_TENANT_ID */',
  '/* YOUR_SHUTTLE_VEHICLE_ID */',
  NULL,
  'per_km_per_person',
  1.20, -- 1.20 EUR per kilometer (cheaper)
  '{
    "1": 0.8,
    "2": 1.0,
    "3": 1.2,
    "4": 1.4,
    "5": 1.6,
    "6": 1.8,
    "7": 2.0,
    "8": 2.2
  }'::jsonb,
  (SELECT id FROM currencies WHERE code = 'EUR' LIMIT 1),
  false,
  false,
  5.00, -- 5 EUR night surcharge (less than VIP)
  '{
    "baby_seat": 10.00,
    "waiting_time": 15.00
  }'::jsonb,
  true,
  'Shuttle pricing - economical option',
  NOW(),
  NOW()
);

-- Example 3: Luxury pricing (most expensive)
INSERT INTO transfer_pricings (
  id,
  tenant_id,
  vehicle_id,
  route_id,
  pricing_model,
  base_km_price,
  passenger_multipliers,
  currency_id,
  is_round_trip,
  is_night_rate,
  night_rate_surcharge,
  extra_service_prices,
  is_active,
  notes,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '/* YOUR_TENANT_ID */',
  '/* YOUR_LUXURY_VEHICLE_ID */',
  NULL,
  'per_km_per_person',
  3.50, -- 3.50 EUR per kilometer (premium)
  '{
    "1": 1.0,
    "2": 1.3,
    "3": 2.0,
    "4": 2.5,
    "5": 3.0,
    "6": 3.5,
    "7": 4.0,
    "8": 4.5
  }'::jsonb,
  (SELECT id FROM currencies WHERE code = 'EUR' LIMIT 1),
  false,
  false,
  20.00, -- 20 EUR night surcharge
  '{
    "baby_seat": 20.00,
    "waiting_time": 30.00,
    "meet_greet": 20.00,
    "champagne": 50.00
  }'::jsonb,
  true,
  'Luxury vehicle pricing - premium service',
  NOW(),
  NOW()
);

-- Verification Query
SELECT 
  v.name as vehicle_name,
  v.type as vehicle_type,
  tp.base_km_price,
  tp.passenger_multipliers,
  c.code as currency,
  tp.night_rate_surcharge,
  tp.is_active
FROM transfer_pricings tp
JOIN transfer_vehicles v ON v.id = tp.vehicle_id
LEFT JOIN currencies c ON c.id = tp.currency_id
WHERE tp.tenant_id = '/* YOUR_TENANT_ID */'
ORDER BY tp.base_km_price ASC;

-- Price Calculation Examples:
--
-- Example 1: VIP, 50km, 2 passengers, one way
-- = 50 × 2.00 × 1.0 × 1 = 100 EUR
--
-- Example 2: VIP, 50km, 3 passengers, round trip
-- = 50 × 2.00 × 1.5 × 2 = 300 EUR
--
-- Example 3: VIP, 50km, 3 passengers, round trip, night rate
-- = (50 × 2.00 × 1.5 × 2) + 10 = 310 EUR
--
-- Example 4: Luxury, 100km, 4 passengers, one way, with champagne
-- = (100 × 3.50 × 2.5 × 1) + 50 = 925 EUR
