import { createSupabaseServerClient } from "@/lib/supabase/server"
import { Route, ArrowRight, Fuel, MapPin, Package } from "lucide-react"
import Link from "next/link"
import { advanceTripStatus } from "@/app/driver/actions"

export async function DriverDashboard({ userId }: { userId: string }) {
  const supabase = await createSupabaseServerClient()

  // Find this driver's record
  const { data: driverRecord } = await (supabase as any)
    .from('drivers')
    .select('id, status')
    .eq('profile_id', userId)
    .single() as { data: { id: string; status: string } | null }

  // Fetch their active / recent trips
  const { data: myTrips } = await (supabase as any)
    .from('trips')
    .select('*, vehicles(registration_plate, make, model)')
    .eq('driver_id', driverRecord?.id ?? '')
    .order('created_at', { ascending: false })
    .limit(5)

  const activeTrip = myTrips?.find((t: any) => ['Dispatched', 'In Transit'].includes(t.status)) ?? null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-400">Driver View</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-50">My Dispatch Hub</h1>
        <p className="mt-1 text-sm text-slate-400">Manage your active assignment and log fuel receipts.</p>
      </div>

      {/* Active Trip Card */}
      {activeTrip ? (
        <section className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-sky-300">Active Trip</h2>
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${
              activeTrip.status === 'In Transit' ? 'bg-sky-500/10 text-sky-400' : 'bg-amber-500/10 text-amber-400'
            }`}>{activeTrip.status}</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-emerald-400" />
              <div>
                <p className="text-[10px] uppercase text-slate-500">Origin</p>
                <p className="text-sm text-slate-200">{activeTrip.source}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-rose-400" />
              <div>
                <p className="text-[10px] uppercase text-slate-500">Destination</p>
                <p className="text-sm text-slate-200">{activeTrip.destination}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <p className="text-[10px] uppercase text-slate-500">Vehicle</p>
                <p className="text-sm text-slate-200">{activeTrip.vehicles?.registration_plate ?? 'N/A'}</p>
              </div>
            </div>
          </div>
          {/* Status advance */}
          {activeTrip.status !== 'Completed' && (
            <form action={async () => {
              'use server'
              await advanceTripStatus(activeTrip.id, activeTrip.status)
            }} className="mt-5">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400 transition-colors"
              >
                {activeTrip.status === 'Dispatched' ? 'Mark as In Transit' : 'Mark as Completed'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}
        </section>
      ) : (
        <section className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 p-8 text-center">
          <Route className="mx-auto h-8 w-8 text-slate-600" />
          <p className="mt-3 text-sm font-medium text-slate-400">No active trip assigned</p>
          <p className="mt-1 text-xs text-slate-500">A Fleet Manager will assign your next trip.</p>
        </section>
      )}

      {/* Fuel Log CTA */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Fuel className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">Log Fuel Receipt</p>
              <p className="text-xs text-slate-400">Use AI OCR to scan and auto-fill from a photo.</p>
            </div>
          </div>
          <Link
            href="/fuel"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition-colors"
          >
            Log Fuel <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* My Recent Trips */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-200">My Recent Trips</h2>
        {(!myTrips || myTrips.length === 0) ? (
          <p className="text-xs text-slate-500 text-center py-4">No trips assigned yet.</p>
        ) : (
          <div className="space-y-2">
            {myTrips.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-slate-900">
                <div className="min-w-0">
                  <p className="text-sm text-slate-300 truncate">{t.source} → {t.destination}</p>
                  <p className="text-xs text-slate-500">{new Date(t.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`shrink-0 ml-3 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                  t.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400' :
                  t.status === 'In Transit' ? 'bg-sky-500/10 text-sky-400' :
                  t.status === 'Dispatched' ? 'bg-amber-500/10 text-amber-400' :
                  'bg-slate-500/10 text-slate-400'
                }`}>{t.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
