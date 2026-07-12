// =============================================================================
// SpireOps — Supabase TypeScript Type Definitions
// Mirrors the PostgreSQL schema exactly.
// Use these types throughout the application for full type safety.
// =============================================================================

export type UserRole =
  | 'admin'
  | 'fleet_manager'
  | 'driver'
  | 'safety_officer'
  | 'financial_analyst'

export type VehicleStatus = 'Available' | 'On Trip' | 'In Shop' | 'Retired'
export type DriverStatus = 'Available' | 'On Trip' | 'Off Duty' | 'Suspended'
export type TripStatus = 'Draft' | 'Dispatched' | 'In Transit' | 'Completed' | 'Cancelled'
export type MaintenanceCategory = 'Scheduled' | 'Breakdown' | 'Accident' | 'Recall' | 'Inspection'
export type AnomalySeverity = 'Critical' | 'High' | 'Medium' | 'None'

// ---------------------------------------------------------------------------
// Row types (what you get back from SELECT queries)
// ---------------------------------------------------------------------------

export interface Profile {
  id: string
  full_name: string
  email: string
  role: UserRole
  avatar_url: string | null
  phone: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Vehicle {
  id: string
  registration_plate: string
  make: string
  model: string
  year: number
  capacity_kg: number
  acquisition_cost: number
  status: VehicleStatus
  current_odometer_km: number
  total_revenue: number
  total_fuel_cost: number
  total_maintenance_cost: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Driver {
  id: string
  profile_id: string | null
  employee_id: string
  full_name: string
  license_number: string
  license_class: string
  license_expiry: string // ISO date string
  status: DriverStatus
  phone: string
  emergency_contact: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Trip {
  id: string
  vehicle_id: string
  driver_id: string
  source: string
  destination: string
  planned_distance_km: number
  actual_distance_km: number | null
  cargo_description: string | null
  cargo_weight_kg: number
  revenue: number
  status: TripStatus
  scheduled_at: string
  dispatched_at: string | null
  completed_at: string | null
  created_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface MaintenanceLog {
  id: string
  vehicle_id: string
  title: string
  description: string | null
  category: MaintenanceCategory
  cost: number
  start_date: string  // ISO date
  end_date: string | null  // NULL = currently in shop
  vendor_name: string | null
  vendor_contact: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface FuelLog {
  id: string
  vehicle_id: string
  driver_id: string | null
  trip_id: string | null
  litres: number
  cost_per_litre: number | null
  total_cost: number
  odometer_km: number
  km_since_last_fill: number | null
  km_per_litre: number | null  // STORED GENERATED column
  station_name: string | null
  station_location: string | null
  receipt_url: string | null
  currency: string
  logged_at: string
  ocr_extracted: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Materialized view types
// ---------------------------------------------------------------------------

export interface VehicleRoi {
  vehicle_id: string
  registration_plate: string
  make: string
  model: string
  acquisition_cost: number
  total_revenue: number
  total_fuel_cost: number
  total_maintenance_cost: number
  net_profit: number
  roi_percent: number | null
  computed_at: string
}

// ---------------------------------------------------------------------------
// Function return types
// ---------------------------------------------------------------------------

export interface FuelAnomalyResult {
  vehicle_id: string
  registration_plate: string
  make: string
  model: string
  baseline_km_per_litre: number
  baseline_data_points: number
  baseline_period_days: number
  recent_km_per_litre: number
  recent_fill_count: number
  deviation_pct: number
  is_anomaly: boolean
  anomaly_severity: AnomalySeverity
  last_fill_at: string
  last_fill_litres: number
  last_fill_cost: number
  last_fill_odometer: number
}

export interface FuelTrendPoint {
  fill_date: string
  km_per_litre: number
  litres: number
  total_cost: number
  station_name: string | null
}

export interface FleetDashboardMetrics {
  fleet_utilization_pct: number
  vehicles_available: number
  vehicles_on_trip: number
  vehicles_in_shop: number
  vehicles_retired: number
  active_trips_today: number
  avg_fuel_efficiency_km_per_litre: number
  avg_portfolio_roi_pct: number
  fuel_anomaly_count: number
  total_revenue_this_month: number
  computed_at: string
}

// ---------------------------------------------------------------------------
// Insert types (what you send on INSERT — excludes generated/auto fields)
// ---------------------------------------------------------------------------

export type VehicleInsert = Omit<
  Vehicle,
  'id' | 'current_odometer_km' | 'total_revenue' | 'total_fuel_cost' | 'total_maintenance_cost' | 'created_at' | 'updated_at'
>

export type DriverInsert = Omit<Driver, 'id' | 'created_at' | 'updated_at'>

export type TripInsert = Omit<
  Trip,
  'id' | 'dispatched_at' | 'completed_at' | 'created_at' | 'updated_at'
> & {
  status?: TripStatus  // defaults to 'Draft'
}

export type MaintenanceLogInsert = Omit<
  MaintenanceLog,
  'id' | 'created_at' | 'updated_at'
>

export type FuelLogInsert = Omit<
  FuelLog,
  'id' | 'km_per_litre' | 'created_at' | 'updated_at'
>

// ---------------------------------------------------------------------------
// API response types (for the Next.js API routes)
// ---------------------------------------------------------------------------

export interface ApiSuccessResponse<T> {
  data: T
  error: null
}

export interface ApiErrorResponse {
  data: null
  error: {
    code: string
    message: string
    details?: string
  }
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

// OCR endpoint
export interface OcrReceiptResult {
  litres: number | null
  cost: number | null
  date: string | null          // ISO date string YYYY-MM-DD
  currency: string | null      // e.g. "INR", "USD"
  station: string | null       // fuel station name if detectable
  cost_per_litre: number | null
  confidence: 'high' | 'medium' | 'low'  // Gemini's assessment
  raw_text: string             // full extracted text for audit
}

// ---------------------------------------------------------------------------
// Supabase Database schema type (for createClient<Database>())
// ---------------------------------------------------------------------------

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
      }
      vehicles: {
        Row: Vehicle
        Insert: VehicleInsert
        Update: Partial<VehicleInsert>
      }
      drivers: {
        Row: Driver
        Insert: DriverInsert
        Update: Partial<DriverInsert>
      }
      trips: {
        Row: Trip
        Insert: TripInsert
        Update: Partial<Omit<Trip, 'id' | 'created_at' | 'updated_at'>>
      }
      maintenance_logs: {
        Row: MaintenanceLog
        Insert: MaintenanceLogInsert
        Update: Partial<MaintenanceLogInsert>
      }
      fuel_logs: {
        Row: FuelLog
        Insert: FuelLogInsert
        Update: Partial<Omit<FuelLog, 'id' | 'km_per_litre' | 'created_at' | 'updated_at'>>
      }
    }
    Views: {
      vehicle_roi_mv: {
        Row: VehicleRoi
      }
    }
    Functions: {
      detect_fuel_anomaly: {
        Args: {
          p_vehicle_id?: string
          p_anomaly_threshold_pct?: number
          p_baseline_days?: number
          p_recent_fills?: number
        }
        Returns: FuelAnomalyResult[]
      }
      get_vehicle_fuel_trend: {
        Args: { p_vehicle_id: string; p_days?: number }
        Returns: FuelTrendPoint[]
      }
      get_fleet_dashboard_metrics: {
        Args: Record<string, never>
        Returns: FleetDashboardMetrics
      }
    }
    Enums: {
      user_role: UserRole
      vehicle_status: VehicleStatus
      driver_status: DriverStatus
      trip_status: TripStatus
    }
  }
}
