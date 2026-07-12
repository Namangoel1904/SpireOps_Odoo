// =============================================================================
// SpireOps — /api/trips
//
// GET  /api/trips              — List trips (paginated, filterable by status/vehicle/driver)
// POST /api/trips              — Create a new trip (capacity enforcement via DB trigger)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import type { TripInsert, ApiResponse, Trip } from '@/lib/supabase/types'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// GET /api/trips
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } },
      { status: 401 }
    )
  }

  const params = request.nextUrl.searchParams

  // Build query — RLS automatically scopes results by role
  let query = supabase
    .from('trips')
    .select(`
      *,
      vehicle:vehicles(id, registration_plate, make, model, capacity_kg, status),
      driver:drivers(id, full_name, employee_id, license_number, status)
    `)
    .order('scheduled_at', { ascending: false })

  // Optional filters
  const status = params.get('status')
  if (status) query = query.eq('status', status)

  const vehicleId = params.get('vehicle_id')
  if (vehicleId) query = query.eq('vehicle_id', vehicleId)

  const driverId = params.get('driver_id')
  if (driverId) query = query.eq('driver_id', driverId)

  const dateFrom = params.get('date_from')
  if (dateFrom) query = query.gte('scheduled_at', dateFrom)

  const dateTo = params.get('date_to')
  if (dateTo) query = query.lte('scheduled_at', dateTo)

  // Pagination
  const page = Math.max(1, parseInt(params.get('page') ?? '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(params.get('page_size') ?? '25', 10)))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  query = query.range(from, to)

  const { data: trips, error, count } = await query.returns<Trip[]>()

  if (error) {
    console.error('[GET /api/trips]', error)
    return NextResponse.json(
      { data: null, error: { code: 'DATABASE_ERROR', message: error.message } },
      { status: 500 }
    )
  }

  return NextResponse.json({
    data: trips,
    meta: { page, page_size: pageSize, total: count ?? 0 },
    error: null,
  })
}

// ---------------------------------------------------------------------------
// POST /api/trips
// The DB trigger (trg_capacity_lock) will hard-reject if cargo > capacity.
// We translate the PostgreSQL exception into a readable API error.
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } },
      { status: 401 }
    )
  }

  // Role check: only fleet managers and admins can create trips
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null; error: unknown }

  if (!profile || !['admin', 'fleet_manager'].includes(profile.role)) {
    return NextResponse.json(
      { data: null, error: { code: 'FORBIDDEN', message: 'Only fleet managers can create trips.' } },
      { status: 403 }
    )
  }

  // Parse body
  let body: Partial<TripInsert>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } },
      { status: 400 }
    )
  }

  // Validate required fields
  const required: Array<keyof TripInsert> = [
    'vehicle_id', 'driver_id', 'source', 'destination',
    'planned_distance_km', 'cargo_weight_kg',
  ]

  const missing = required.filter((field) => body[field] === undefined || body[field] === null)
  if (missing.length > 0) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Missing required fields: ${missing.join(', ')}`,
        },
      },
      { status: 422 }
    )
  }

  if ((body.cargo_weight_kg as number) <= 0 || (body.planned_distance_km as number) <= 0) {
    return NextResponse.json(
      {
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'cargo_weight_kg and planned_distance_km must be positive numbers.' },
      },
      { status: 422 }
    )
  }

  // Insert — capacity lock trigger fires automatically on the DB side
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data: trip, error: insertError } = await sb
    .from('trips')
    .insert({
      vehicle_id: body.vehicle_id!,
      driver_id: body.driver_id!,
      source: body.source!,
      destination: body.destination!,
      planned_distance_km: body.planned_distance_km!,
      cargo_weight_kg: body.cargo_weight_kg!,
      cargo_description: body.cargo_description ?? null,
      revenue: body.revenue ?? 0,
      status: body.status ?? 'Draft',
      scheduled_at: body.scheduled_at ?? new Date().toISOString(),
      notes: body.notes ?? null,
      created_by: user.id,
    })
    .select()
    .single() as { data: Trip | null; error: { message: string } | null }

  if (insertError) {
    // Translate PostgreSQL trigger exceptions (ERRCODE P0001) into readable API errors
    const pgMessage = insertError.message ?? ''

    if (pgMessage.includes('SPIREOPS_ERR_002') || pgMessage.includes('Capacity lock violation')) {
      return NextResponse.json(
        { data: null, error: { code: 'CAPACITY_EXCEEDED', message: pgMessage } },
        { status: 422 }
      )
    }
    if (pgMessage.includes('SPIREOPS_ERR_003') || pgMessage.includes('Retired')) {
      return NextResponse.json(
        { data: null, error: { code: 'VEHICLE_RETIRED', message: pgMessage } },
        { status: 422 }
      )
    }
    if (pgMessage.includes('SPIREOPS_ERR_004') || pgMessage.includes('already On Trip')) {
      return NextResponse.json(
        { data: null, error: { code: 'VEHICLE_OCCUPIED', message: pgMessage } },
        { status: 409 }
      )
    }
    if (pgMessage.includes('SPIREOPS_ERR_005') || pgMessage.includes('In Shop')) {
      return NextResponse.json(
        { data: null, error: { code: 'VEHICLE_IN_MAINTENANCE', message: pgMessage } },
        { status: 409 }
      )
    }

    console.error('[POST /api/trips]', insertError)
    return NextResponse.json(
      { data: null, error: { code: 'DATABASE_ERROR', message: insertError.message } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: trip!, error: null }, { status: 201 })
}
