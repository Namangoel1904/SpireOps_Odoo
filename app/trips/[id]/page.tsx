import { redirect, notFound } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { TransitOpsShell } from "@/components/layout/transit-ops-shell"
import { MapPin, Truck, UserRound, Package, Calendar, ArrowLeft, CheckCircle2, Clock, Route } from "lucide-react"
import Link from "next/link"

function statusConfig(status: string) {
  if (status === 'Completed') return { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' }
  if (status === 'In Transit') return { color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/30' }
  if (status === 'Dispatched') return { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' }
  if (status === 'Cancelled') return { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' }
  return { color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30' }
}

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect("/login")

  const { data: profile } = await (supabase as any)
    .from('profiles').select('role, full_name').eq('id', user.id).single() as { data: { role: string; full_name: string } | null }

  const name = profile?.full_name || user.email || ''
  const role = profile?.role ?? ''
  const userInfo = {
    name,
    email: user.email ?? '',
    role: role === 'admin' ? 'Super Admin' : role.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
    initials: name.substring(0, 2).toUpperCase(),
  }

  const { data: trip } = await (supabase as any)
    .from('trips')
    .select(`
      *,
      vehicles(registration_plate, make, model, capacity_kg),
      drivers(full_name, license_number, phone, employee_id),
      profiles!trips_created_by_fkey(full_name, email)
    `)
    .eq('id', id)
    .single()

  if (!trip) notFound()

  const sc = statusConfig(trip.status)

  return (
    <TransitOpsShell user={userInfo}>
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Back nav */}
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-400">Trip Details</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-50">{trip.source} → {trip.destination}</h1>
            <p className="mt-1 text-xs text-slate-500">ID: {trip.id}</p>
          </div>
          <span className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${sc.color} ${sc.bg} ${sc.border}`}>
            {trip.status}
          </span>
        </div>

        {/* Route Card */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-200">Route Information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/10 shrink-0">
                <MapPin className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Origin</p>
                <p className="mt-0.5 text-sm font-medium text-slate-200">{trip.source}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-rose-500/10 shrink-0">
                <MapPin className="h-4 w-4 text-rose-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Destination</p>
                <p className="mt-0.5 text-sm font-medium text-slate-200">{trip.destination}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-sky-500/10 shrink-0">
                <Route className="h-4 w-4 text-sky-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Planned Distance</p>
                <p className="mt-0.5 text-sm font-medium text-slate-200">{trip.planned_distance_km} km</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-amber-500/10 shrink-0">
                <Package className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Cargo Weight</p>
                <p className="mt-0.5 text-sm font-medium text-slate-200">{trip.cargo_weight_kg?.toLocaleString()} kg</p>
              </div>
            </div>
          </div>
        </section>

        {/* Resources */}
        <div className="grid gap-4 sm:grid-cols-2">
          <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <h2 className="mb-4 text-sm font-semibold text-slate-200">Assigned Vehicle</h2>
            {trip.vehicles ? (
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-sky-500/10">
                  <Truck className="h-5 w-5 text-sky-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">{trip.vehicles.registration_plate}</p>
                  <p className="text-xs text-slate-500">{trip.vehicles.make} {trip.vehicles.model}</p>
                  <p className="text-xs text-slate-500">{trip.vehicles.capacity_kg?.toLocaleString()} kg capacity</p>
                </div>
              </div>
            ) : <p className="text-xs text-slate-500">No vehicle assigned</p>}
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <h2 className="mb-4 text-sm font-semibold text-slate-200">Assigned Driver</h2>
            {trip.drivers ? (
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-violet-500/10">
                  <UserRound className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">{trip.drivers.full_name}</p>
                  <p className="text-xs text-slate-500">License: {trip.drivers.license_number}</p>
                  <p className="text-xs text-slate-500">{trip.drivers.phone}</p>
                </div>
              </div>
            ) : <p className="text-xs text-slate-500">No driver assigned</p>}
          </section>
        </div>

        {/* Timeline */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-200">Trip Timeline</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-medium text-slate-300">Created</p>
                <p className="text-[10px] text-slate-500">{new Date(trip.created_at).toLocaleString('en-IN')}</p>
              </div>
            </div>
            {trip.dispatched_at && (
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-sky-400 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-slate-300">Dispatched</p>
                  <p className="text-[10px] text-slate-500">{new Date(trip.dispatched_at).toLocaleString('en-IN')}</p>
                </div>
              </div>
            )}
            {trip.completed_at && (
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-fuchsia-400 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-slate-300">Completed</p>
                  <p className="text-[10px] text-slate-500">{new Date(trip.completed_at).toLocaleString('en-IN')}</p>
                </div>
              </div>
            )}
            {!['Completed', 'Cancelled'].includes(trip.status) && (
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-slate-600 shrink-0" />
                <p className="text-xs text-slate-500">In progress…</p>
              </div>
            )}
          </div>
        </section>

        {trip.notes && (
          <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <h2 className="mb-2 text-sm font-semibold text-slate-200">Notes</h2>
            <p className="text-sm text-slate-400">{trip.notes}</p>
          </section>
        )}
      </div>
    </TransitOpsShell>
  )
}
