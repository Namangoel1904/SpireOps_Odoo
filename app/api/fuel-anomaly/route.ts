// =============================================================================
// SpireOps — GET /api/fuel-anomaly
// Queries the detect_fuel_anomaly() PostgreSQL function and returns
// flagged vehicles to power the Financial Analyst dashboard alert.
//
// Query params:
//   ?vehicle_id=<uuid>          — filter to a specific vehicle (optional)
//   ?threshold=<number>         — anomaly % threshold, default 15 (optional)
//   ?anomalies_only=true|false  — return only flagged vehicles (default: true)
//
// Response: { data: FuelAnomalyResult[] } | { error: ... }
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import type { FuelAnomalyResult, ApiResponse } from '@/lib/supabase/types'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<FuelAnomalyResult[]>>> {

  // ── 1. Auth check ─────────────────────────────────────────────────────
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } },
      { status: 401 }
    )
  }

  // ── 2. Role check — only analytical/management roles ──────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null; error: unknown }

  const allowedRoles = ['admin', 'fleet_manager', 'financial_analyst', 'safety_officer']
  if (!profile || !allowedRoles.includes(profile.role)) {
    return NextResponse.json(
      { data: null, error: { code: 'FORBIDDEN', message: 'You do not have permission to view fuel anomaly data.' } },
      { status: 403 }
    )
  }

  // ── 3. Parse query parameters ─────────────────────────────────────────
  const searchParams = request.nextUrl.searchParams
  const vehicleId = searchParams.get('vehicle_id') || undefined

  const thresholdRaw = searchParams.get('threshold')
  const threshold = thresholdRaw ? parseFloat(thresholdRaw) : 15.0
  if (isNaN(threshold) || threshold < 1 || threshold > 100) {
    return NextResponse.json(
      { data: null, error: { code: 'INVALID_THRESHOLD', message: 'threshold must be a number between 1 and 100.' } },
      { status: 400 }
    )
  }

  const anomaliesOnly = searchParams.get('anomalies_only') !== 'false' // default true

  // Validate vehicle_id is a valid UUID if provided
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (vehicleId && !uuidRegex.test(vehicleId)) {
    return NextResponse.json(
      { data: null, error: { code: 'INVALID_VEHICLE_ID', message: 'vehicle_id must be a valid UUID.' } },
      { status: 400 }
    )
  }

  // ── 4. Call the PostgreSQL anomaly detection function ─────────────────
  const { data: rawResults, error: rpcError } = await (supabase as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
  }).rpc(
    'detect_fuel_anomaly',
    {
      p_vehicle_id: vehicleId ?? null,
      p_anomaly_threshold_pct: threshold,
      p_baseline_days: 90,
      p_recent_fills: 5,
    }
  )

  if (rpcError) {
    console.error('[fuel-anomaly] RPC error:', rpcError)
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to run anomaly detection.',
          details: rpcError.message,
        },
      },
      { status: 500 }
    )
  }

  // ── 5. Filter and format results ──────────────────────────────────────
  const results = rawResults as FuelAnomalyResult[]

  const filtered = anomaliesOnly
    ? results.filter((r) => r.is_anomaly)
    : results

  // Enrich with a human-readable summary string for easy frontend consumption
  const enriched = filtered.map((r) => ({
    ...r,
    summary: r.is_anomaly
      ? `${r.registration_plate} recorded a ${Math.abs(r.deviation_pct).toFixed(1)}% fuel-consumption drop against its route baseline.`
      : null,
  }))

  return NextResponse.json(
    { data: enriched, error: null },
    {
      status: 200,
      headers: {
        // Anomaly data is time-sensitive — short cache, revalidate frequently
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=30',
      },
    }
  )
}
