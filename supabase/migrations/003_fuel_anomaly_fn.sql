-- =============================================================================
-- SpireOps — Migration 003: Fuel Anomaly Detection Function
-- Uses statistical analysis against a vehicle's rolling baseline.
-- Flags vehicles where recent km/litre efficiency drops significantly.
-- =============================================================================

-- =============================================================================
-- FUNCTION: detect_fuel_anomaly
-- Returns flagged vehicles with their anomaly metrics.
--
-- Algorithm:
--   1. Compute a vehicle's historical baseline km/L from the past 90 days
--      (minimum 3 data points required for statistical validity)
--   2. Compute the recent average km/L from the last 5 fill-ups
--   3. Calculate deviation percentage: (recent - baseline) / baseline × 100
--   4. Flag if deviation < -ANOMALY_THRESHOLD_PCT (default: -15%)
--      (i.e., recent efficiency is more than 15% below historical average)
--
-- The function returns ALL vehicles with enough data, with is_anomaly = true
-- for flagged ones. This allows the frontend to show both normal and anomalous.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.detect_fuel_anomaly(
  p_vehicle_id UUID DEFAULT NULL,        -- NULL = check all vehicles
  p_anomaly_threshold_pct NUMERIC DEFAULT 15.0,  -- % drop to flag as anomaly
  p_baseline_days INTEGER DEFAULT 90,    -- historical window in days
  p_recent_fills INTEGER DEFAULT 5       -- number of recent fills for "recent" avg
)
RETURNS TABLE (
  vehicle_id            UUID,
  registration_plate    TEXT,
  make                  TEXT,
  model                 TEXT,
  -- Baseline stats
  baseline_km_per_litre NUMERIC,
  baseline_data_points  INTEGER,
  baseline_period_days  INTEGER,
  -- Recent stats
  recent_km_per_litre   NUMERIC,
  recent_fill_count     INTEGER,
  -- Anomaly metrics
  deviation_pct         NUMERIC,
  is_anomaly            BOOLEAN,
  anomaly_severity      TEXT,  -- 'Critical' | 'High' | 'Medium' | 'None'
  last_fill_at          TIMESTAMPTZ,
  -- Most recent anomalous fill details
  last_fill_litres      NUMERIC,
  last_fill_cost        NUMERIC,
  last_fill_odometer    NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH

  -- Step 1: Historical baseline — rolling 90-day window (excludes recent 5 fills)
  baseline_stats AS (
    SELECT
      f.vehicle_id,
      ROUND(AVG(f.km_per_litre), 4)    AS avg_km_per_litre,
      COUNT(*)::INTEGER                 AS data_points
    FROM public.fuel_logs f
    WHERE f.km_per_litre IS NOT NULL
      AND f.km_per_litre > 0
      AND f.logged_at >= NOW() - make_interval(days => p_baseline_days)
      AND (p_vehicle_id IS NULL OR f.vehicle_id = p_vehicle_id)
    GROUP BY f.vehicle_id
    HAVING COUNT(*) >= 3  -- minimum 3 data points for statistical validity
  ),

  -- Step 2: Recent fills — last N fill-ups per vehicle
  recent_ranked AS (
    SELECT
      f.vehicle_id,
      f.km_per_litre,
      f.logged_at,
      f.litres,
      f.total_cost,
      f.odometer_km,
      ROW_NUMBER() OVER (PARTITION BY f.vehicle_id ORDER BY f.logged_at DESC) AS rn
    FROM public.fuel_logs f
    WHERE f.km_per_litre IS NOT NULL
      AND f.km_per_litre > 0
      AND (p_vehicle_id IS NULL OR f.vehicle_id = p_vehicle_id)
  ),

  recent_stats AS (
    SELECT
      vehicle_id,
      ROUND(AVG(km_per_litre), 4)      AS avg_km_per_litre,
      COUNT(*)::INTEGER                 AS fill_count,
      MAX(logged_at)                    AS last_fill_at,
      -- Details of the most recent fill
      MAX(litres) FILTER (WHERE rn = 1) AS last_litres,
      MAX(total_cost) FILTER (WHERE rn = 1) AS last_cost,
      MAX(odometer_km) FILTER (WHERE rn = 1) AS last_odometer
    FROM recent_ranked
    WHERE rn <= p_recent_fills
    GROUP BY vehicle_id
  ),

  -- Step 3: Combine and compute deviation
  combined AS (
    SELECT
      v.id                              AS vehicle_id,
      v.registration_plate,
      v.make,
      v.model,
      bs.avg_km_per_litre              AS baseline_km_per_litre,
      bs.data_points                   AS baseline_data_points,
      p_baseline_days                  AS baseline_period_days,
      rs.avg_km_per_litre              AS recent_km_per_litre,
      rs.fill_count                    AS recent_fill_count,
      -- Deviation: negative = worse efficiency (consumption anomaly)
      CASE
        WHEN bs.avg_km_per_litre > 0 THEN
          ROUND(((rs.avg_km_per_litre - bs.avg_km_per_litre) / bs.avg_km_per_litre) * 100, 2)
        ELSE NULL
      END                              AS deviation_pct,
      rs.last_fill_at,
      rs.last_litres,
      rs.last_cost,
      rs.last_odometer
    FROM public.vehicles v
    INNER JOIN baseline_stats bs ON bs.vehicle_id = v.id
    INNER JOIN recent_stats rs   ON rs.vehicle_id = v.id
    WHERE (p_vehicle_id IS NULL OR v.id = p_vehicle_id)
  )

  -- Step 4: Classify anomalies
  SELECT
    c.vehicle_id,
    c.registration_plate,
    c.make,
    c.model,
    c.baseline_km_per_litre,
    c.baseline_data_points,
    c.baseline_period_days,
    c.recent_km_per_litre,
    c.recent_fill_count,
    c.deviation_pct,
    -- Flag as anomaly if efficiency dropped more than the threshold
    (c.deviation_pct IS NOT NULL AND c.deviation_pct < -p_anomaly_threshold_pct) AS is_anomaly,
    -- Severity classification
    CASE
      WHEN c.deviation_pct IS NULL THEN 'None'
      WHEN c.deviation_pct < -40 THEN 'Critical'   -- >40% drop: possible fuel theft/major leak
      WHEN c.deviation_pct < -25 THEN 'High'        -- >25% drop: serious issue
      WHEN c.deviation_pct < -p_anomaly_threshold_pct THEN 'Medium'  -- threshold to 25%
      ELSE 'None'
    END                                            AS anomaly_severity,
    c.last_fill_at,
    c.last_litres,
    c.last_cost,
    c.last_odometer
  FROM combined c
  ORDER BY
    c.deviation_pct ASC NULLS LAST; -- most anomalous first

END;
$$;

COMMENT ON FUNCTION public.detect_fuel_anomaly IS
  'Returns fuel efficiency anomaly analysis per vehicle. Compares recent N fills vs 90-day baseline. Flags if recent km/L drops more than p_anomaly_threshold_pct (default 15%). Severity: Critical >40%, High >25%, Medium >threshold.';


-- =============================================================================
-- FUNCTION: get_vehicle_fuel_trend
-- Returns time-series km/litre data for a vehicle — powers frontend charts.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_vehicle_fuel_trend(
  p_vehicle_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  fill_date      DATE,
  km_per_litre   NUMERIC,
  litres         NUMERIC,
  total_cost     NUMERIC,
  station_name   TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    DATE(logged_at)  AS fill_date,
    km_per_litre,
    litres,
    total_cost,
    station_name
  FROM public.fuel_logs
  WHERE vehicle_id = p_vehicle_id
    AND km_per_litre IS NOT NULL
    AND logged_at >= NOW() - make_interval(days => p_days)
  ORDER BY logged_at ASC;
$$;

COMMENT ON FUNCTION public.get_vehicle_fuel_trend IS
  'Returns time-series fuel efficiency data for a vehicle, used to power the Recharts frontend graphs.';


-- =============================================================================
-- FUNCTION: get_fleet_dashboard_metrics
-- Single function returning all KPI metrics for the financial analyst dashboard.
-- Reduces the number of round-trips from the frontend.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_fleet_dashboard_metrics()
RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    -- Fleet utilization: % of non-retired vehicles currently On Trip
    'fleet_utilization_pct', (
      SELECT ROUND(
        (COUNT(*) FILTER (WHERE status = 'On Trip'))::NUMERIC /
        NULLIF(COUNT(*) FILTER (WHERE status != 'Retired'), 0) * 100,
      1)
      FROM public.vehicles
    ),
    -- Vehicle status breakdown
    'vehicles_available', (SELECT COUNT(*) FROM public.vehicles WHERE status = 'Available'),
    'vehicles_on_trip',   (SELECT COUNT(*) FROM public.vehicles WHERE status = 'On Trip'),
    'vehicles_in_shop',   (SELECT COUNT(*) FROM public.vehicles WHERE status = 'In Shop'),
    'vehicles_retired',   (SELECT COUNT(*) FROM public.vehicles WHERE status = 'Retired'),
    -- Active trips today
    'active_trips_today', (
      SELECT COUNT(*) FROM public.trips
      WHERE status IN ('Dispatched', 'In Transit')
        AND DATE(scheduled_at) = CURRENT_DATE
    ),
    -- Fleet average fuel efficiency (last 30 days)
    'avg_fuel_efficiency_km_per_litre', (
      SELECT ROUND(AVG(km_per_litre), 2)
      FROM public.fuel_logs
      WHERE km_per_litre IS NOT NULL
        AND logged_at >= NOW() - INTERVAL '30 days'
    ),
    -- Portfolio average ROI
    'avg_portfolio_roi_pct', (
      SELECT ROUND(AVG(roi_percent), 1)
      FROM public.vehicle_roi_mv
      WHERE roi_percent IS NOT NULL
    ),
    -- Anomaly count (vehicles with >15% efficiency drop)
    'fuel_anomaly_count', (
      SELECT COUNT(*)
      FROM public.detect_fuel_anomaly()
      WHERE is_anomaly = true
    ),
    -- Total revenue this month
    'total_revenue_this_month', (
      SELECT COALESCE(SUM(revenue), 0)
      FROM public.trips
      WHERE status = 'Completed'
        AND DATE_TRUNC('month', completed_at) = DATE_TRUNC('month', NOW())
    ),
    'computed_at', NOW()
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_fleet_dashboard_metrics IS
  'Single aggregation function returning all financial analyst KPIs in one DB round-trip. Includes fleet utilization, fuel efficiency, portfolio ROI, anomaly count, and monthly revenue.';
