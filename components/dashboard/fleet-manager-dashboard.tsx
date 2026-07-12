import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ClipboardList, CircleCheckBig, TrafficCone, Wrench, ArrowRight } from "lucide-react"
import Link from "next/link"
import { KpiCard } from "@/components/dashboard/kpi-card"

export async function FleetManagerDashboard() {
  const supabase = await createSupabaseServerClient()

  // 1. Fetch vehicle stats
  const { data: vehicles } = await (supabase as any).from('vehicles').select('*').order('status')

  const activeVehicles = vehicles?.filter((v: any) => v.status === 'On Trip').length || 0
  const availableVehicles = vehicles?.filter((v: any) => v.status === 'Available').length || 0
  const inMaintenance = vehicles?.filter((v: any) => v.status === 'In Shop').length || 0
  const totalVehicles = vehicles?.length || 1
  const activePercentage = Math.round(((activeVehicles + availableVehicles) / totalVehicles) * 100)

  // 2. Fetch pending trips
  const { data: trips } = await (supabase as any).from('trips').select('status').in('status', ['Draft', 'Dispatched'])
  const pendingTrips = trips?.length || 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-400">Fleet Manager</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50">Fleet availability overview</h1>
        </div>
        <Link
          href="/dispatch"
          className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 transition-colors"
        >
          Dispatch New Trip <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard isLoading={false} label="Active on Trip" value={activeVehicles.toString()} detail={`${activePercentage}% of fleet operational`} icon={CircleCheckBig} tone="sky" />
        <KpiCard isLoading={false} label="Available Vehicles" value={availableVehicles.toString()} detail="Ready for dispatch" icon={TrafficCone} tone="emerald" />
        <KpiCard isLoading={false} label="In Maintenance" value={inMaintenance.toString()} detail="Currently in shop" icon={Wrench} tone="amber" />
        <KpiCard isLoading={false} label="Pending Trips" value={pendingTrips.toString()} detail="Awaiting driver/dispatch" icon={ClipboardList} tone="rose" />
      </div>

      {/* Vehicle Status Table */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/50">
        <div className="flex items-center justify-between border-b border-slate-800 p-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Vehicle Registry</h2>
            <p className="mt-0.5 text-xs text-slate-400">Real-time fleet status</p>
          </div>
          <Link href="/fleet" className="text-xs font-medium text-sky-400 hover:text-sky-300">
            View all →
          </Link>
        </div>
        <div className="divide-y divide-slate-800">
          {vehicles?.slice(0, 6).map((v: any) => (
            <div key={v.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full ${
                  v.status === 'Available' ? 'bg-emerald-400' :
                  v.status === 'On Trip' ? 'bg-sky-400' :
                  v.status === 'In Shop' ? 'bg-rose-400' : 'bg-slate-500'
                }`} />
                <div>
                  <p className="text-sm font-medium text-slate-200">{v.registration_plate}</p>
                  <p className="text-xs text-slate-500">{v.make} {v.model} · {v.capacity_kg?.toLocaleString()} kg</p>
                </div>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                v.status === 'Available' ? 'bg-emerald-500/10 text-emerald-400' :
                v.status === 'On Trip' ? 'bg-sky-500/10 text-sky-400' :
                v.status === 'In Shop' ? 'bg-rose-500/10 text-rose-400' :
                'bg-slate-500/10 text-slate-400'
              }`}>
                {v.status}
              </span>
            </div>
          ))}
          {(!vehicles || vehicles.length === 0) && (
            <p className="px-5 py-8 text-center text-sm text-slate-500">No vehicles registered. Add vehicles from the Vehicle Registry.</p>
          )}
        </div>
      </section>

      {/* Quick Dispatch CTA */}
      <section className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Ready to dispatch a trip?</h2>
            <p className="mt-1 text-xs text-slate-400">Assign vehicles, drivers and validate capacity before dispatching.</p>
          </div>
          <Link
            href="/dispatch"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-300 hover:bg-sky-500/20 transition-colors"
          >
            Open Dispatch Form <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
