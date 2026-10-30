-- Fix NULL start_date and end_date values in vehicle_reservation_assignments
-- This script updates NULL values by using reservation data

-- ============================================
-- FIX START_DATE
-- ============================================

-- Step 1: Update start_date from reservation checkIn date (best source)
UPDATE vehicle_reservation_assignments vra
SET start_date = DATE(r.check_in)
FROM reservations r
WHERE vra.reservation_id = r.id
  AND vra.start_date IS NULL
  AND r.check_in IS NOT NULL;

-- Step 2: Update start_date from reservation metadata pickupDate
UPDATE vehicle_reservation_assignments vra
SET start_date = (r.metadata->>'pickupDate')::date
FROM reservations r
WHERE vra.reservation_id = r.id
  AND vra.start_date IS NULL
  AND r.metadata IS NOT NULL
  AND r.metadata->>'pickupDate' IS NOT NULL;

-- Step 3: Use end_date as fallback for start_date (if available)
UPDATE vehicle_reservation_assignments vra
SET start_date = vra.end_date
WHERE vra.start_date IS NULL
  AND vra.end_date IS NOT NULL;

-- Step 4: Last resort for start_date - use current date
UPDATE vehicle_reservation_assignments vra
SET start_date = CURRENT_DATE
WHERE vra.start_date IS NULL;

-- ============================================
-- FIX END_DATE
-- ============================================

-- Step 1: Update end_date from reservation checkOut date (best source)
UPDATE vehicle_reservation_assignments vra
SET end_date = DATE(r.check_out)
FROM reservations r
WHERE vra.reservation_id = r.id
  AND vra.end_date IS NULL
  AND r.check_out IS NOT NULL;

-- Step 2: Update end_date from reservation metadata dropoffDate/returnDate
UPDATE vehicle_reservation_assignments vra
SET end_date = COALESCE(
  (r.metadata->>'dropoffDate')::date,
  (r.metadata->>'returnDate')::date
)
FROM reservations r
WHERE vra.reservation_id = r.id
  AND vra.end_date IS NULL
  AND r.metadata IS NOT NULL
  AND (
    r.metadata->>'dropoffDate' IS NOT NULL OR
    r.metadata->>'returnDate' IS NOT NULL
  );

-- Step 3: Use start_date + 1 day as fallback for end_date
UPDATE vehicle_reservation_assignments vra
SET end_date = vra.start_date + INTERVAL '1 day'
WHERE vra.end_date IS NULL
  AND vra.start_date IS NOT NULL;

-- Step 4: Last resort for end_date - use current date + 1 day
UPDATE vehicle_reservation_assignments vra
SET end_date = CURRENT_DATE + INTERVAL '1 day'
WHERE vra.end_date IS NULL;

-- ============================================
-- VERIFY: Check remaining NULL values
-- ============================================
SELECT 
  COUNT(*) FILTER (WHERE start_date IS NULL) as null_start_dates,
  COUNT(*) FILTER (WHERE end_date IS NULL) as null_end_dates,
  COUNT(*) as total_rows
FROM vehicle_reservation_assignments;
