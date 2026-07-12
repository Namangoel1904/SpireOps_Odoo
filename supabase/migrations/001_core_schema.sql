-- =============================================================================
-- SpireOps — Migration 001: Core Schema & Security
-- Database-first architecture: all business rules enforced at the DB level
-- =============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fast text search on vehicle plates / names

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE public.user_role AS ENUM (
  'admin',
  'fleet_manager',
  'driver',
  'safety_officer',
  'financial_analyst'
);

CREATE TYPE public.vehicle_status AS ENUM (
  'Available',
  'On Trip',
  'In Shop',
  'Retired'
);

CREATE TYPE public.driver_status AS ENUM (
  'Available',
  'On Trip',
  'Off Duty',
  'Suspended'
);

CREATE TYPE public.trip_status AS ENUM (
  'Draft',
  'Dispatched',
  'In Transit',
  'Completed',
  'Cancelled'
);

-- =============================================================================
-- TABLE: profiles
-- Extends Supabase auth.users — one row per authenticated user
-- =============================================================================

CREATE TABLE public.profiles (
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT        NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 100),
  email         TEXT        NOT NULL UNIQUE CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$'),
  role          public.user_role NOT NULL DEFAULT 'driver',
  avatar_url    TEXT,
  phone         TEXT        CHECK (phone IS NULL OR phone ~* '^\+?[0-9\s\-]{7,20}$'),
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'User profiles extending Supabase auth. Role determines RBAC access.';

-- =============================================================================
-- TABLE: vehicles
-- The central asset table. Status is strictly enum-controlled.
-- =============================================================================

CREATE TABLE public.vehicles (
  id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_plate   TEXT        NOT NULL UNIQUE CHECK (char_length(registration_plate) BETWEEN 3 AND 20),
  make                 TEXT        NOT NULL CHECK (char_length(make) BETWEEN 2 AND 50),
  model                TEXT        NOT NULL CHECK (char_length(model) BETWEEN 2 AND 50),
  year                 INTEGER     NOT NULL CHECK (year BETWEEN 1980 AND EXTRACT(YEAR FROM NOW())::INTEGER + 1),
  capacity_kg          NUMERIC(10,2) NOT NULL CHECK (capacity_kg > 0),
  acquisition_cost     NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (acquisition_cost >= 0),
  status               public.vehicle_status NOT NULL DEFAULT 'Available',
  -- Mileage tracking
  current_odometer_km  NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (current_odometer_km >= 0),
  -- Financial aggregates — updated by triggers when trips/fuel/maintenance change
  total_revenue        NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_revenue >= 0),
  total_fuel_cost      NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_fuel_cost >= 0),
  total_maintenance_cost NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_maintenance_cost >= 0),
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.vehicles IS 'Fleet asset registry. Status transitions enforced by triggers (state machine).';
COMMENT ON COLUMN public.vehicles.status IS 'Strict enum: Available | On Trip | In Shop | Retired';

-- Index for fast status filtering (e.g., find all Available vehicles)
CREATE INDEX idx_vehicles_status ON public.vehicles(status);
CREATE INDEX idx_vehicles_plate ON public.vehicles USING gin(registration_plate gin_trgm_ops);

-- =============================================================================
-- TABLE: drivers
-- =============================================================================

CREATE TABLE public.drivers (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id        UUID        UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL,
  employee_id       TEXT        NOT NULL UNIQUE CHECK (char_length(employee_id) BETWEEN 3 AND 20),
  full_name         TEXT        NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 100),
  license_number    TEXT        NOT NULL UNIQUE CHECK (char_length(license_number) BETWEEN 5 AND 30),
  license_class     TEXT        NOT NULL DEFAULT 'HGV',
  license_expiry    DATE        NOT NULL CHECK (license_expiry > CURRENT_DATE),
  status            public.driver_status NOT NULL DEFAULT 'Available',
  phone             TEXT        NOT NULL CHECK (phone ~* '^\+?[0-9\s\-]{7,20}$'),
  emergency_contact TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.drivers IS 'Driver roster. Status transitions enforced by trip dispatch triggers.';
COMMENT ON COLUMN public.drivers.status IS 'Strict enum: Available | On Trip | Off Duty | Suspended';

CREATE INDEX idx_drivers_status ON public.drivers(status);
CREATE INDEX idx_drivers_profile ON public.drivers(profile_id);

-- =============================================================================
-- TABLE: trips
-- The core operational entity. Capacity validation via trigger.
-- =============================================================================

CREATE TABLE public.trips (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id        UUID          NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  driver_id         UUID          NOT NULL REFERENCES public.drivers(id) ON DELETE RESTRICT,
  -- Route
  source            TEXT          NOT NULL CHECK (char_length(source) BETWEEN 2 AND 200),
  destination       TEXT          NOT NULL CHECK (char_length(destination) BETWEEN 2 AND 200),
  planned_distance_km NUMERIC(10,2) NOT NULL CHECK (planned_distance_km > 0),
  actual_distance_km  NUMERIC(10,2) CHECK (actual_distance_km IS NULL OR actual_distance_km > 0),
  -- Cargo
  cargo_description TEXT,
  cargo_weight_kg   NUMERIC(10,2) NOT NULL CHECK (cargo_weight_kg > 0),
  -- Financial
  revenue           NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (revenue >= 0),
  -- Status & Timestamps
  status            public.trip_status NOT NULL DEFAULT 'Draft',
  scheduled_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  dispatched_at     TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  -- Audit
  created_by        UUID          REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes             TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- Enforce: a vehicle can only have ONE active trip at a time
  CONSTRAINT chk_trip_dates CHECK (
    dispatched_at IS NULL OR dispatched_at >= scheduled_at
  ),
  CONSTRAINT chk_completed_after_dispatched CHECK (
    completed_at IS NULL OR dispatched_at IS NULL OR completed_at >= dispatched_at
  )
);

COMMENT ON TABLE public.trips IS 'Core dispatch entity. Capacity enforced by trg_capacity_lock trigger. State transitions atomic via trg_atomic_dispatch.';

CREATE INDEX idx_trips_vehicle ON public.trips(vehicle_id);
CREATE INDEX idx_trips_driver  ON public.trips(driver_id);
CREATE INDEX idx_trips_status  ON public.trips(status);
CREATE INDEX idx_trips_scheduled ON public.trips(scheduled_at DESC);

-- =============================================================================
-- TABLE: maintenance_logs
-- Inserting a record automatically locks the vehicle to 'In Shop' (via trigger)
-- =============================================================================

CREATE TABLE public.maintenance_logs (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id    UUID        NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  -- Work details
  title         TEXT        NOT NULL CHECK (char_length(title) BETWEEN 3 AND 200),
  description   TEXT,
  category      TEXT        NOT NULL DEFAULT 'Scheduled' CHECK (category IN ('Scheduled', 'Breakdown', 'Accident', 'Recall', 'Inspection')),
  -- Financials
  cost          NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
  -- Timeline — end_date being set releases the vehicle back to 'Available'
  start_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  end_date      DATE        CHECK (end_date IS NULL OR end_date >= start_date),
  -- Vendor
  vendor_name   TEXT,
  vendor_contact TEXT,
  -- Audit
  created_by    UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.maintenance_logs IS 'Maintenance records. INSERT sets vehicle to In Shop. UPDATE with end_date releases vehicle to Available.';

CREATE INDEX idx_maintenance_vehicle ON public.maintenance_logs(vehicle_id);
CREATE INDEX idx_maintenance_open    ON public.maintenance_logs(vehicle_id) WHERE end_date IS NULL;

-- =============================================================================
-- TABLE: fuel_logs
-- Captures per-fill data. Powers anomaly detection.
-- =============================================================================

CREATE TABLE public.fuel_logs (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id      UUID        NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id       UUID        REFERENCES public.drivers(id) ON DELETE SET NULL,
  trip_id         UUID        REFERENCES public.trips(id) ON DELETE SET NULL,
  -- Fuel data
  litres          NUMERIC(8,2)  NOT NULL CHECK (litres > 0),
  cost_per_litre  NUMERIC(8,4),
  total_cost      NUMERIC(14,2) NOT NULL CHECK (total_cost > 0),
  -- Efficiency calculation inputs
  odometer_km     NUMERIC(10,2) NOT NULL CHECK (odometer_km >= 0),
  -- km driven since last fill (set by trigger or application logic)
  km_since_last_fill NUMERIC(10,2) CHECK (km_since_last_fill IS NULL OR km_since_last_fill >= 0),
  -- Computed efficiency (km/litre) — stored for fast anomaly queries
  km_per_litre    NUMERIC(8,4) GENERATED ALWAYS AS (
    CASE
      WHEN km_since_last_fill IS NOT NULL AND km_since_last_fill > 0 AND litres > 0
      THEN ROUND(km_since_last_fill / litres, 4)
      ELSE NULL
    END
  ) STORED,
  -- Location & metadata
  station_name    TEXT,
  station_location TEXT,
  receipt_url     TEXT,
  currency        TEXT        NOT NULL DEFAULT 'INR' CHECK (char_length(currency) = 3),
  logged_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- OCR flag: was this entry auto-filled by the AI OCR pipeline?
  ocr_extracted   BOOLEAN     NOT NULL DEFAULT false,
  -- Audit
  created_by      UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.fuel_logs IS 'Per-fill fuel records. km_per_litre is a STORED generated column. Powers anomaly detection.';

CREATE INDEX idx_fuel_vehicle   ON public.fuel_logs(vehicle_id);
CREATE INDEX idx_fuel_logged_at ON public.fuel_logs(logged_at DESC);
CREATE INDEX idx_fuel_vehicle_time ON public.fuel_logs(vehicle_id, logged_at DESC);

-- =============================================================================
-- VEHICLE ROI — MATERIALIZED VIEW
-- Formula: ROI% = (Revenue - (Maintenance + Fuel)) / Acquisition_Cost × 100
-- Cannot be a STORED column (requires cross-table aggregation),
-- so we use a CONCURRENTLY-refreshable materialized view instead.
-- Refreshed by triggers on trips, fuel_logs, maintenance_logs.
-- =============================================================================

CREATE MATERIALIZED VIEW public.vehicle_roi_mv AS
SELECT
  v.id                         AS vehicle_id,
  v.registration_plate,
  v.make,
  v.model,
  v.acquisition_cost,
  -- Aggregate trip revenue
  COALESCE(SUM(t.revenue), 0)  AS total_revenue,
  -- Aggregate fuel costs
  COALESCE(fl.total_fuel, 0)   AS total_fuel_cost,
  -- Aggregate maintenance costs
  COALESCE(ml.total_maintenance, 0) AS total_maintenance_cost,
  -- Net profit
  (COALESCE(SUM(t.revenue), 0)
    - COALESCE(fl.total_fuel, 0)
    - COALESCE(ml.total_maintenance, 0))
    AS net_profit,
  -- ROI percentage
  CASE
    WHEN v.acquisition_cost > 0 THEN
      ROUND(
        (
          (COALESCE(SUM(t.revenue), 0)
            - COALESCE(fl.total_fuel, 0)
            - COALESCE(ml.total_maintenance, 0))
          / v.acquisition_cost
        ) * 100,
      2)
    ELSE NULL
  END                          AS roi_percent,
  NOW()                        AS computed_at
FROM public.vehicles v
LEFT JOIN public.trips t
  ON t.vehicle_id = v.id AND t.status = 'Completed'
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(f.total_cost), 0) AS total_fuel
  FROM public.fuel_logs f
  WHERE f.vehicle_id = v.id
) fl ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(m.cost), 0) AS total_maintenance
  FROM public.maintenance_logs m
  WHERE m.vehicle_id = v.id
) ml ON true
GROUP BY v.id, v.registration_plate, v.make, v.model, v.acquisition_cost,
         fl.total_fuel, ml.total_maintenance
WITH DATA;

-- Unique index required for CONCURRENTLY refresh
CREATE UNIQUE INDEX idx_vehicle_roi_mv_vehicle_id ON public.vehicle_roi_mv(vehicle_id);

COMMENT ON MATERIALIZED VIEW public.vehicle_roi_mv IS
  'Per-vehicle ROI: (Revenue - Fuel - Maintenance) / Acquisition_Cost × 100. Refreshed concurrently by triggers.';

-- =============================================================================
-- AUTOMATIC updated_at TIMESTAMPS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_maintenance_updated_at
  BEFORE UPDATE ON public.maintenance_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_fuel_updated_at
  BEFORE UPDATE ON public.fuel_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- ROW-LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all user-facing tables
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_logs        ENABLE ROW LEVEL SECURITY;

-- Helper function: get the calling user's role without multiple round-trips
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Helper function: get the calling user's driver record id
CREATE OR REPLACE FUNCTION public.get_my_driver_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT id FROM public.drivers WHERE profile_id = auth.uid();
$$;

-- ----------------------------------------------------------------------------
-- profiles policies
-- ----------------------------------------------------------------------------

-- Everyone can read their own profile
CREATE POLICY "profiles: owner read"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

-- Admins and fleet managers can read all profiles
CREATE POLICY "profiles: manager/admin read all"
  ON public.profiles FOR SELECT
  USING (public.get_my_role() IN ('admin', 'fleet_manager'));

-- Users can update their own profile (not their role)
CREATE POLICY "profiles: owner update"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

-- Only admins can create/modify/delete any profile
CREATE POLICY "profiles: admin full"
  ON public.profiles FOR ALL
  USING (public.get_my_role() = 'admin');

-- ----------------------------------------------------------------------------
-- vehicles policies
-- ----------------------------------------------------------------------------

-- Admins, fleet managers, safety officers, financial analysts: full read
CREATE POLICY "vehicles: operational roles read"
  ON public.vehicles FOR SELECT
  USING (public.get_my_role() IN ('admin', 'fleet_manager', 'safety_officer', 'financial_analyst'));

-- Drivers can read vehicles (to see their assigned vehicle)
CREATE POLICY "vehicles: driver read"
  ON public.vehicles FOR SELECT
  USING (public.get_my_role() = 'driver');

-- Admins and fleet managers can write vehicles
CREATE POLICY "vehicles: manager/admin write"
  ON public.vehicles FOR INSERT
  WITH CHECK (public.get_my_role() IN ('admin', 'fleet_manager'));

CREATE POLICY "vehicles: manager/admin update"
  ON public.vehicles FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'fleet_manager'));

CREATE POLICY "vehicles: admin delete"
  ON public.vehicles FOR DELETE
  USING (public.get_my_role() = 'admin');

-- ----------------------------------------------------------------------------
-- drivers policies
-- ----------------------------------------------------------------------------

-- All operational roles can read drivers
CREATE POLICY "drivers: all roles read"
  ON public.drivers FOR SELECT
  USING (public.get_my_role() IN ('admin', 'fleet_manager', 'safety_officer', 'financial_analyst', 'driver'));

-- Admins and fleet managers can write
CREATE POLICY "drivers: manager/admin write"
  ON public.drivers FOR INSERT
  WITH CHECK (public.get_my_role() IN ('admin', 'fleet_manager'));

CREATE POLICY "drivers: manager/admin update"
  ON public.drivers FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'fleet_manager'));

CREATE POLICY "drivers: admin delete"
  ON public.drivers FOR DELETE
  USING (public.get_my_role() = 'admin');

-- ----------------------------------------------------------------------------
-- trips policies
-- ----------------------------------------------------------------------------

-- Fleet managers, admins, safety officers, financial analysts: read all trips
CREATE POLICY "trips: operational roles read all"
  ON public.trips FOR SELECT
  USING (public.get_my_role() IN ('admin', 'fleet_manager', 'safety_officer', 'financial_analyst'));

-- Drivers can only see trips assigned to them
CREATE POLICY "trips: driver read own"
  ON public.trips FOR SELECT
  USING (
    public.get_my_role() = 'driver'
    AND driver_id = public.get_my_driver_id()
  );

-- Fleet managers and admins can create trips
CREATE POLICY "trips: manager/admin insert"
  ON public.trips FOR INSERT
  WITH CHECK (public.get_my_role() IN ('admin', 'fleet_manager'));

-- Fleet managers and admins can update trips
CREATE POLICY "trips: manager/admin update"
  ON public.trips FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'fleet_manager'));

-- Drivers can update their assigned trips (e.g., mark In Transit / Completed)
CREATE POLICY "trips: driver update own"
  ON public.trips FOR UPDATE
  USING (
    public.get_my_role() = 'driver'
    AND driver_id = public.get_my_driver_id()
  );

-- Only admin can delete trips
CREATE POLICY "trips: admin delete"
  ON public.trips FOR DELETE
  USING (public.get_my_role() = 'admin');

-- ----------------------------------------------------------------------------
-- maintenance_logs policies
-- ----------------------------------------------------------------------------

-- Admins, fleet managers, safety officers: full read
CREATE POLICY "maintenance: operational roles read"
  ON public.maintenance_logs FOR SELECT
  USING (public.get_my_role() IN ('admin', 'fleet_manager', 'safety_officer', 'financial_analyst'));

-- Admins, fleet managers: create maintenance records
CREATE POLICY "maintenance: manager/admin insert"
  ON public.maintenance_logs FOR INSERT
  WITH CHECK (public.get_my_role() IN ('admin', 'fleet_manager'));

-- Admins, fleet managers: update maintenance records (setting end_date releases vehicle)
CREATE POLICY "maintenance: manager/admin update"
  ON public.maintenance_logs FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'fleet_manager'));

CREATE POLICY "maintenance: admin delete"
  ON public.maintenance_logs FOR DELETE
  USING (public.get_my_role() = 'admin');

-- ----------------------------------------------------------------------------
-- fuel_logs policies
-- ----------------------------------------------------------------------------

-- All operational roles can read fuel logs
CREATE POLICY "fuel: operational roles read"
  ON public.fuel_logs FOR SELECT
  USING (public.get_my_role() IN ('admin', 'fleet_manager', 'safety_officer', 'financial_analyst'));

-- Drivers can read their own fuel logs
CREATE POLICY "fuel: driver read own"
  ON public.fuel_logs FOR SELECT
  USING (
    public.get_my_role() = 'driver'
    AND driver_id = public.get_my_driver_id()
  );

-- Drivers can insert fuel logs (core workflow: log fuel after fillup)
CREATE POLICY "fuel: driver insert own"
  ON public.fuel_logs FOR INSERT
  WITH CHECK (
    public.get_my_role() IN ('admin', 'fleet_manager', 'driver')
    AND (
      public.get_my_role() != 'driver'
      OR driver_id = public.get_my_driver_id()
    )
  );

-- Drivers can update their own fuel logs (before final submission)
CREATE POLICY "fuel: driver update own"
  ON public.fuel_logs FOR UPDATE
  USING (
    public.get_my_role() IN ('admin', 'fleet_manager')
    OR (public.get_my_role() = 'driver' AND driver_id = public.get_my_driver_id())
  );

CREATE POLICY "fuel: admin delete"
  ON public.fuel_logs FOR DELETE
  USING (public.get_my_role() = 'admin');

-- =============================================================================
-- AUTO-CREATE PROFILE ON SIGNUP (Supabase Auth hook)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'driver')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
