-- =============================================================================
-- SpireOps — Seed Data
-- Run this in the Supabase SQL Editor to populate your database with dummy data
-- so your dashboards and charts have something to show!
-- =============================================================================

-- 1. Insert 5 Vehicles (matching the frontend mockups)
INSERT INTO public.vehicles (id, registration_plate, make, model, year, capacity_kg, acquisition_cost, status, current_odometer_km) VALUES
('b3b1e325-1e35-46b5-9a86-7a7183e20e8a', 'TR-077', 'Volvo', 'FH16', 2022, 16000, 12000000, 'Available', 45000),
('b3b1e325-1e35-46b5-9a86-7a7183e20e8b', 'TR-204', 'Scania', 'R500', 2023, 24000, 15000000, 'Available', 25000),
('b3b1e325-1e35-46b5-9a86-7a7183e20e8c', 'TR-118', 'Tata', 'Prima', 2021, 12000, 8000000, 'Available', 85000),
('b3b1e325-1e35-46b5-9a86-7a7183e20e8d', 'TR-321', 'Ashok Leyland', 'Blag', 2020, 18000, 9500000, 'Available', 110000),
('b3b1e325-1e35-46b5-9a86-7a7183e20e8e', 'TR-410', 'Mahindra', 'Blazo', 2022, 20000, 10500000, 'Available', 60000)
ON CONFLICT (registration_plate) DO NOTHING;

-- 2. Insert 3 Drivers (matching the frontend mockups)
INSERT INTO public.drivers (id, employee_id, full_name, license_number, license_expiry, phone) VALUES
('d4b1e325-1e35-46b5-9a86-7a7183e20e8a', 'EMP-001', 'Jane D''Souza', 'DL-MH-01-123', '2028-05-12', '+919876543210'),
('d4b1e325-1e35-46b5-9a86-7a7183e20e8b', 'EMP-002', 'Arjun Patel', 'DL-GJ-04-456', '2027-11-20', '+919876543211'),
('d4b1e325-1e35-46b5-9a86-7a7183e20e8c', 'EMP-003', 'Samira Khan', 'DL-DL-09-789', '2029-01-15', '+919876543212')
ON CONFLICT (employee_id) DO NOTHING;

-- 3. Generate historical Fuel Logs (for anomaly detection) and Trips (for ROI)
DO $$
DECLARE
  v_tr077 UUID := 'b3b1e325-1e35-46b5-9a86-7a7183e20e8a'; 
  v_tr204 UUID := 'b3b1e325-1e35-46b5-9a86-7a7183e20e8b';
  v_driver1 UUID := 'd4b1e325-1e35-46b5-9a86-7a7183e20e8a';
  i INT;
  v_date TIMESTAMPTZ;
  v_odometer NUMERIC := 40000;
  v_litres NUMERIC;
BEGIN
  -- A. Baseline for TR-077 (10 fills over last 90 days), avg ~ 4.7 km/L
  FOR i IN 1..10 LOOP
    v_date := NOW() - (90 - i * 7) * INTERVAL '1 day';
    v_odometer := v_odometer + 470; 
    v_litres := 100;
    INSERT INTO public.fuel_logs (vehicle_id, litres, total_cost, odometer_km, logged_at)
    VALUES (v_tr077, v_litres, v_litres * 100, v_odometer, v_date);
  END LOOP;

  -- B. Recent anomaly for TR-077 (5 fills), avg ~ 3.2 km/L -> ~31% drop!
  -- This will trigger the "Fuel Anomaly" warning on the Financial Analyst dashboard.
  FOR i IN 1..5 LOOP
    v_date := NOW() - (15 - i * 2) * INTERVAL '1 day';
    v_odometer := v_odometer + 470;
    v_litres := 146;
    INSERT INTO public.fuel_logs (vehicle_id, litres, total_cost, odometer_km, logged_at)
    VALUES (v_tr077, v_litres, v_litres * 100, v_odometer, v_date);
  END LOOP;
  
  -- C. Baseline for TR-204 (Good efficiency all the way ~ 5.8 km/l)
  v_odometer := 20000;
  FOR i IN 1..15 LOOP
    v_date := NOW() - (90 - i * 5) * INTERVAL '1 day';
    v_odometer := v_odometer + 580;
    v_litres := 100;
    INSERT INTO public.fuel_logs (vehicle_id, litres, total_cost, odometer_km, logged_at)
    VALUES (v_tr204, v_litres, v_litres * 100, v_odometer, v_date);
  END LOOP;
  
  -- D. Completed trips for Revenue (so ROI % shows up)
  INSERT INTO public.trips (vehicle_id, driver_id, source, destination, planned_distance_km, actual_distance_km, cargo_weight_kg, revenue, status, scheduled_at, dispatched_at, completed_at)
  VALUES 
  (v_tr077, v_driver1, 'Bhiwandi Hub', 'Pune FC', 150, 155, 10000, 450000, 'Completed', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days'),
  (v_tr204, v_driver1, 'Pune FC', 'Nashik', 210, 215, 12000, 650000, 'Completed', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days');
END $$;
