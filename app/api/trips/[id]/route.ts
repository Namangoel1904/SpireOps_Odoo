// =============================================================================
// SpireOps — /api/trips/[id]
//
// GET    /api/trips/:id        — Get a single trip (with joins)
// PATCH  /api/trips/:id        — Update trip status (drives the state machine)
// DELETE /api/trips/:id        — Cancel/delete a trip (admin only)
//
// The PATCH endpoint is the primary state machine driver:
//   Draft → Dispatched   (triggers: lock vehicle + driver to On Trip)
//   Dispatched → In Transit
//   In Transit → Completed (triggers: release vehicle + driver to Available, update revenue)
//   Any → Cancelled     (triggers: safe revert of On Trip assets)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import type { TripStatus, ApiResponse, Trip } from '@/lib/supabase/types'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Valid state machine transitions
const ALLOWED_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  Draft:       ['Dispatched', 'Cancelled'],
  Dispatched:  ['In Transit', 'Cancelled'],
  'In Transit': ['Completed', 'Cancelled'],
  Completed:   [],  // Terminal state — no further transitions
  Cancelled:   [],  // Terminal state
}

type RouteContext = { params: Promise<{ id: string }> }

// ---------------------------------------------------------------------------
// GET /api/trips/:id
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse<Trip>>> {
  const { id } = await context.params
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } },
      { status: 401 }
    )
  }

  const { data: trip, error } = await supabase
    .from('trips')
    .select(`
      *,
      vehicle:vehicles(id, registration_plate, make, model, capacity_kg, status),
      driver:drivers(id, full_name, employee_id, phone, status),
      fuel_logs(id, litres, total_cost, logged_at, station_name),
      created_by_profile:profiles!trips_created_by_fkey(full_name, email)
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') { // Row not found
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: `Trip ${id} not found.` } },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { data: null, error: { code: 'DATABASE_ERROR', message: error.message } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: trip as unknown as Trip, error: null })
}

// ---------------------------------------------------------------------------
// PATCH /api/trips/:id
// The atomic dispatch trigger fires automatically on status update.
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse<Trip>>> {
  const { id } = await context.params
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } },
      { status: 401 }
    )
  }

  // Parse body
  let body: {
    status?: TripStatus
    actual_distance_km?: number
    revenue?: number
    notes?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } },
      { status: 400 }
    )
  }

  // Fetch current trip state to validate transition
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sbPatch = supabase as any
  const { data: currentTrip, error: fetchError } = await sbPatch
    .from('trips')
    .select('id, status, driver_id, vehicle_id')
    .eq('id', id)
    .single() as { data: { id: string; status: string; driver_id: string; vehicle_id: string } | null; error: { message: string; code?: string } | null }

  if (fetchError || !currentTrip) {
    return NextResponse.json(
      { data: null, error: { code: 'NOT_FOUND', message: `Trip ${id} not found.` } },
      { status: 404 }
    )
  }

  // Validate state transition if status is being changed
  if (body.status && body.status !== currentTrip.status) {
    const allowedNext = ALLOWED_TRANSITIONS[currentTrip.status as TripStatus] ?? []

    if (!allowedNext.includes(body.status)) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'INVALID_TRANSITION',
            message: `Cannot transition trip from "${currentTrip.status}" to "${body.status}". Allowed transitions: ${allowedNext.length > 0 ? allowedNext.join(', ') : 'none (terminal state)'}.`,
          },
        },
        { status: 422 }
      )
    }

    // Require actual_distance_km when completing a trip
    if (body.status === 'Completed' && !body.actual_distance_km) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'actual_distance_km is required when marking a trip as Completed.',
          },
        },
        { status: 422 }
      )
    }
  }

  // Build update payload (only include fields that were provided)
  const updatePayload: Record<string, unknown> = {}
  if (body.status !== undefined) updatePayload.status = body.status
  if (body.actual_distance_km !== undefined) updatePayload.actual_distance_km = body.actual_distance_km
  if (body.revenue !== undefined) updatePayload.revenue = body.revenue
  if (body.notes !== undefined) updatePayload.notes = body.notes

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json(
      { data: null, error: { code: 'NO_CHANGES', message: 'No updatable fields provided.' } },
      { status: 400 }
    )
  }

  // Perform the update — the trg_atomic_dispatch trigger fires automatically
  const { data: updatedTrip, error: updateError } = await sbPatch
    .from('trips')
    .update(updatePayload)
    .eq('id', id)
    .select(`
      *,
      vehicle:vehicles(id, registration_plate, make, model, status),
      driver:drivers(id, full_name, employee_id, status)
    `)
    .single() as { data: Trip | null; error: { message: string } | null }

  if (updateError) {
    const pgMessage = updateError.message ?? ''

    if (pgMessage.includes('SPIREOPS_ERR_006') || pgMessage.includes('already On Trip')) {
      return NextResponse.json(
        { data: null, error: { code: 'DRIVER_OCCUPIED', message: pgMessage } },
        { status: 409 }
      )
    }
    if (pgMessage.includes('SPIREOPS_ERR_007') || pgMessage.includes('Suspended')) {
      return NextResponse.json(
        { data: null, error: { code: 'DRIVER_SUSPENDED', message: pgMessage } },
        { status: 422 }
      )
    }

    console.error('[PATCH /api/trips/:id]', updateError)
    return NextResponse.json(
      { data: null, error: { code: 'DATABASE_ERROR', message: updateError.message } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: updatedTrip as unknown as Trip, error: null })
}

// ---------------------------------------------------------------------------
// DELETE /api/trips/:id (admin only — soft delete by Cancelling)
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse<{ id: string }>>> {
  const { id } = await context.params
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } },
      { status: 401 }
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sbDel = supabase as any
  const { data: profile } = await sbDel
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null; error: unknown }

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json(
      { data: null, error: { code: 'FORBIDDEN', message: 'Only administrators can permanently delete trips. Use PATCH to cancel.' } },
      { status: 403 }
    )
  }

  const { error: deleteError } = await supabase
    .from('trips')
    .delete()
    .eq('id', id)

  if (deleteError) {
    return NextResponse.json(
      { data: null, error: { code: 'DATABASE_ERROR', message: deleteError.message } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: { id }, error: null })
}
