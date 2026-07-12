import { type ReactNode } from "react"
import { ClipboardList, CircleCheckBig, TrafficCone, Wrench } from "lucide-react"
import { createSupabaseServerClient } from "@/lib/supabase/server"

import { KpiCard } from "@/components/dashboard/kpi-card"

export async function FleetManagerDashboard() {
  const supabase = await createSupabaseServerClient()

  // 1. Fetch vehicle stats
  const { data: vehicles } = await (supabase as any).from('vehicles').select('status')
  
  const activeVehicles = vehicles?.filter((v: any) => v.status === 'On Trip').length || 0
  const availableVehicles = vehicles?.filter((v: any) => v.status === 'Available').length || 0
  const inMaintenance = vehicles?.filter((v: any) => v.status === 'In Shop').length || 0
  const totalVehicles = vehicles?.length || 1 // prevent divide by zero
  const activePercentage = Math.round(((activeVehicles + availableVehicles) / totalVehicles) * 100)

  // 2. Fetch pending trips (Draft or Dispatched)
  const { data: trips } = await (supabase as any).from('trips').select('status').in('status', ['Draft', 'Dispatched'])
  const pendingTrips = trips?.length || 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-400">Fleet Manager</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50">Fleet availability overview</h1></div>
        <p className="text-sm text-slate-400">Live operational snapshot · Updated moments ago</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard isLoading={false} label="Active on Trip" value={activeVehicles.toString()} detail={`${activePercentage}% of fleet operational`} icon={CircleCheckBig} tone="sky" />
        <KpiCard isLoading={false} label="Available Vehicles" value={availableVehicles.toString()} detail="Ready for dispatch" icon={TrafficCone} tone="emerald" />
        <KpiCard isLoading={false} label="In Maintenance" value={inMaintenance.toString()} detail="Currently in shop" icon={Wrench} tone="amber" />
        <KpiCard isLoading={false} label="Pending Trips" value={pendingTrips.toString()} detail="Awaiting driver/dispatch" icon={ClipboardList} tone="rose" />
      </div>
      <section className="rounded-lg border border-slate-800 bg-slate-900/30 p-6"><p className="text-sm font-medium text-slate-200">Dispatch readiness</p><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Use the operational metrics above to prioritize vehicle assignment and maintenance scheduling.</p></section>
    </div>
  )
}
