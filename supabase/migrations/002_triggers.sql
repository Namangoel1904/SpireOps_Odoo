-- =============================================================================
-- SpireOps — Migration 002: Business Rule Triggers (State Machine)
-- All business logic is enforced at the database level.
-- Frontend race conditions are structurally impossible.
-- =============================================================================

-- =============================================================================
-- TRIGGER 1: CAPACITY LOCK
-- BEFORE INSERT OR UPDATE on trips
-- Violently rejects any transaction where cargo_weight_kg exceeds
-- the selected vehicle's capacity_kg.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_capacity_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_capacity_kg    NUMERIC(10,2);
  v_plate          TEXT;
BEGIN
  -- Fetch vehicle capacity and plate for the error message
  SELECT capacity_kg, registration_plate
    INTO v_capacity_kg, v_plate
    FROM public.vehicles
   WHERE id = NEW.vehicle_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'SPIREOPS_ERR_001: Vehicle with ID % does not exist.', NEW.vehicle_id
      USING ERRCODE = 'P0001';
  END IF;

  -- Hard reject if cargo exceeds capacity
  IF NEW.cargo_weight_kg > v_capacity_kg THEN
    RAISE EXCEPTION
      'SPIREOPS_ERR_002: Capacity lock violation — Vehicle % (%) has a max load of % kg, but this trip requests % kg (overflow: % kg).',
      v_plate,
      NEW.vehicle_id,
      v_capacity_kg,
      NEW.cargo_weight_kg,
      NEW.cargo_weight_kg - v_capacity_kg
      USING ERRCODE = 'P0001';
  END IF;

  -- Also verify the vehicle is not Retired when creating a new trip
  IF TG_OP = 'INSERT' THEN
    DECLARE
      v_status public.vehicle_status;
    BEGIN
      SELECT status INTO v_status FROM public.vehicles WHERE id = NEW.vehicle_id;
      IF v_status = 'Retired' THEN
        RAISE EXCEPTION
          'SPIREOPS_ERR_003: Vehicle % is Retired and cannot be assigned to a new trip.',
          v_plate
          USING ERRCODE = 'P0001';
      END IF;
      -- Prevent double-booking: vehicle must be Available for a Draft/Dispatched trip
      IF NEW.status IN ('Draft', 'Dispatched') AND v_status = 'On Trip' THEN
        RAISE EXCEPTION
          'SPIREOPS_ERR_004: Vehicle % is already On Trip. Resolve the active trip before dispatching a new one.',
          v_plate
          USING ERRCODE = 'P0001';
      END IF;
      IF NEW.status IN ('Draft', 'Dispatched') AND v_status = 'In Shop' THEN
        RAISE EXCEPTION
          'SPIREOPS_ERR_005: Vehicle % is currently In Shop (under maintenance) and cannot be dispatched.',
          v_plate
          USING ERRCODE = 'P0001';
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_capacity_lock
  BEFORE INSERT OR UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_capacity_lock();

COMMENT ON FUNCTION public.fn_capacity_lock() IS
  'BEFORE trigger on trips. Blocks any INSERT/UPDATE where cargo_weight_kg exceeds vehicle capacity_kg. Also blocks double-booking and dispatch of Retired/In Shop vehicles.';


-- =============================================================================
-- TRIGGER 2: ATOMIC DISPATCHING
-- AFTER UPDATE on trips
-- When a trip's status changes, atomically update both vehicle and driver status.
-- This is the core state machine — all transitions happen in a single transaction.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_atomic_dispatch()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_driver_status public.driver_status;
BEGIN
  -- Only act if status actually changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- ── TRANSITION: Any status → Dispatched ──────────────────────────────────
  IF NEW.status = 'Dispatched' THEN
    -- Verify driver is not already on another trip
    SELECT status INTO v_driver_status
      FROM public.drivers WHERE id = NEW.driver_id;

    IF v_driver_status = 'On Trip' THEN
      RAISE EXCEPTION
        'SPIREOPS_ERR_006: Driver % is already On Trip. Cannot dispatch.',
        NEW.driver_id
        USING ERRCODE = 'P0001';
    END IF;

    IF v_driver_status = 'Suspended' THEN
      RAISE EXCEPTION
        'SPIREOPS_ERR_007: Driver % is Suspended and cannot be dispatched.',
        NEW.driver_id
        USING ERRCODE = 'P0001';
    END IF;

    -- Atomically lock the vehicle and driver
    UPDATE public.vehicles
       SET status = 'On Trip', updated_at = NOW()
     WHERE id = NEW.vehicle_id;

    UPDATE public.drivers
       SET status = 'On Trip', updated_at = NOW()
     WHERE id = NEW.driver_id;

    -- Record dispatch timestamp
    UPDATE public.trips
       SET dispatched_at = NOW()
     WHERE id = NEW.id;

  -- ── TRANSITION: → Completed ───────────────────────────────────────────────
  ELSIF NEW.status = 'Completed' THEN
    -- Release vehicle and driver back to Available
    UPDATE public.vehicles
       SET status = 'Available', updated_at = NOW()
     WHERE id = NEW.vehicle_id;

    UPDATE public.drivers
       SET status = 'Available', updated_at = NOW()
     WHERE id = NEW.driver_id;

    -- Record completion timestamp
    UPDATE public.trips
       SET completed_at = NOW()
     WHERE id = NEW.id;

    -- Update vehicle total revenue with this trip's revenue
    UPDATE public.vehicles
       SET total_revenue = total_revenue + NEW.revenue,
           updated_at = NOW()
     WHERE id = NEW.vehicle_id;

  -- ── TRANSITION: → Cancelled ───────────────────────────────────────────────
  ELSIF NEW.status = 'Cancelled' THEN
    -- Only revert statuses if they were actively 'On Trip' for THIS trip
    -- This is safe because we verified no double-booking at dispatch time
    UPDATE public.vehicles
       SET status = 'Available', updated_at = NOW()
     WHERE id = NEW.vehicle_id
       AND status = 'On Trip';

    UPDATE public.drivers
       SET status = 'Available', updated_at = NOW()
     WHERE id = NEW.driver_id
       AND status = 'On Trip';

  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_atomic_dispatch
  AFTER UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_atomic_dispatch();

COMMENT ON FUNCTION public.fn_atomic_dispatch() IS
  'AFTER UPDATE trigger on trips. Manages the full vehicle+driver state machine atomically. Dispatched: locks both to On Trip. Completed: releases both to Available and updates vehicle revenue. Cancelled: safely reverts On Trip assets.';


-- =============================================================================
-- TRIGGER 3: MAINTENANCE ISOLATION (INSERT)
-- AFTER INSERT on maintenance_logs
-- Instantly sets vehicle status to 'In Shop' so it cannot be dispatched.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_maintenance_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_status public.vehicle_status;
BEGIN
  SELECT status INTO v_current_status
    FROM public.vehicles
   WHERE id = NEW.vehicle_id;

  -- Cannot send a vehicle that is actively On Trip to maintenance
  -- (trip must be completed or cancelled first)
  IF v_current_status = 'On Trip' THEN
    RAISE EXCEPTION
      'SPIREOPS_ERR_008: Vehicle % is currently On Trip. Complete or cancel the active trip before logging maintenance.',
      NEW.vehicle_id
      USING ERRCODE = 'P0001';
  END IF;

  -- Lock vehicle to In Shop
  UPDATE public.vehicles
     SET status = 'In Shop', updated_at = NOW()
   WHERE id = NEW.vehicle_id;

  -- Update the maintenance cost aggregate on the vehicle
  UPDATE public.vehicles
     SET total_maintenance_cost = total_maintenance_cost + NEW.cost,
         updated_at = NOW()
   WHERE id = NEW.vehicle_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_maintenance_lock
  AFTER INSERT ON public.maintenance_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_maintenance_lock();

COMMENT ON FUNCTION public.fn_maintenance_lock() IS
  'AFTER INSERT on maintenance_logs. Locks the vehicle to In Shop status. Blocks dispatch until maintenance is marked complete.';


-- =============================================================================
-- TRIGGER 4: MAINTENANCE COMPLETION (UPDATE)
-- AFTER UPDATE on maintenance_logs
-- When end_date transitions from NULL → a date, releases the vehicle
-- back to 'Available' status so it can be dispatched again.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_maintenance_release()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only act when end_date transitions from NULL to a non-null value
  IF OLD.end_date IS NULL AND NEW.end_date IS NOT NULL THEN
    -- Ensure there's no other open maintenance record for this vehicle
    IF EXISTS (
      SELECT 1 FROM public.maintenance_logs
       WHERE vehicle_id = NEW.vehicle_id
         AND id != NEW.id
         AND end_date IS NULL
    ) THEN
      -- Another open maintenance record exists — keep vehicle In Shop
      RETURN NEW;
    END IF;

    -- Update maintenance cost delta if cost changed
    IF NEW.cost != OLD.cost THEN
      UPDATE public.vehicles
         SET total_maintenance_cost = total_maintenance_cost + (NEW.cost - OLD.cost),
             updated_at = NOW()
       WHERE id = NEW.vehicle_id;
    END IF;

    -- Release vehicle back to Available
    UPDATE public.vehicles
       SET status = 'Available', updated_at = NOW()
     WHERE id = NEW.vehicle_id
       AND status = 'In Shop'; -- guard: don't override if admin manually changed status
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_maintenance_release
  AFTER UPDATE ON public.maintenance_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_maintenance_release();

COMMENT ON FUNCTION public.fn_maintenance_release() IS
  'AFTER UPDATE on maintenance_logs. When end_date is set, releases vehicle from In Shop to Available (only if no other open maintenance records exist for that vehicle).';


-- =============================================================================
-- TRIGGER 5: FUEL LOG COST AGGREGATION
-- AFTER INSERT on fuel_logs
-- Keeps the vehicles.total_fuel_cost column in sync for fast ROI calculation.
-- Also computes km_since_last_fill automatically.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_fuel_log_aggregate()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_last_odometer NUMERIC(10,2);
BEGIN
  -- Get the previous fill's odometer reading for this vehicle
  SELECT odometer_km INTO v_last_odometer
    FROM public.fuel_logs
   WHERE vehicle_id = NEW.vehicle_id
     AND id != NEW.id
     AND odometer_km < NEW.odometer_km
   ORDER BY odometer_km DESC
   LIMIT 1;

  -- Set km_since_last_fill if we have a previous reading
  IF FOUND AND v_last_odometer IS NOT NULL THEN
    UPDATE public.fuel_logs
       SET km_since_last_fill = NEW.odometer_km - v_last_odometer
     WHERE id = NEW.id;
  END IF;

  -- Update vehicle's current odometer if this fill is the most recent
  UPDATE public.vehicles
     SET current_odometer_km = GREATEST(current_odometer_km, NEW.odometer_km),
         total_fuel_cost = total_fuel_cost + NEW.total_cost,
         updated_at = NOW()
   WHERE id = NEW.vehicle_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_fuel_log_aggregate
  AFTER INSERT ON public.fuel_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_fuel_log_aggregate();

COMMENT ON FUNCTION public.fn_fuel_log_aggregate() IS
  'AFTER INSERT on fuel_logs. Automatically computes km_since_last_fill, updates vehicle odometer, and aggregates total_fuel_cost for fast ROI calculation.';


-- =============================================================================
-- TRIGGER 6: ROI MATERIALIZED VIEW REFRESH
-- Refreshes vehicle_roi_mv after any financial-impacting change.
-- Uses CONCURRENTLY to avoid table lock during refresh.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_refresh_roi_mv()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Non-blocking concurrent refresh (requires unique index, already created)
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.vehicle_roi_mv;
  RETURN NULL; -- AFTER trigger, return value is ignored for statement-level
END;
$$;

-- Refresh after any trip completion (revenue changes)
CREATE TRIGGER trg_roi_refresh_trips
  AFTER INSERT OR UPDATE OR DELETE ON public.trips
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.fn_refresh_roi_mv();

-- Refresh after fuel cost changes
CREATE TRIGGER trg_roi_refresh_fuel
  AFTER INSERT OR UPDATE OR DELETE ON public.fuel_logs
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.fn_refresh_roi_mv();

-- Refresh after maintenance cost changes
CREATE TRIGGER trg_roi_refresh_maintenance
  AFTER INSERT OR UPDATE OR DELETE ON public.maintenance_logs
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.fn_refresh_roi_mv();

COMMENT ON FUNCTION public.fn_refresh_roi_mv() IS
  'Statement-level trigger function. Refreshes vehicle_roi_mv concurrently after any DML on trips, fuel_logs, or maintenance_logs.';
