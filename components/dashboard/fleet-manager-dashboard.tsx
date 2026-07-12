"use client"

import { useEffect, useState, type ReactNode } from "react"
import { ClipboardList, CircleCheckBig, TrafficCone, Wrench } from "lucide-react"

import { KpiCard } from "@/components/dashboard/kpi-card"

const loadingDelayMs = 850

export function FleetManagerDashboard(): ReactNode {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), loadingDelayMs)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-400">Fleet Manager</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50">Fleet availability overview</h1></div>
        <p className="text-sm text-slate-400">Live operational snapshot · Updated moments ago</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard isLoading={isLoading} label="Active Vehicles" value="142" detail="92% of registered fleet" icon={CircleCheckBig} tone="sky" />
        <KpiCard isLoading={isLoading} label="Available Vehicles" value="38" detail="Ready for dispatch" icon={TrafficCone} tone="emerald" />
        <KpiCard isLoading={isLoading} label="In Maintenance" value="11" detail="4 due back today" icon={Wrench} tone="amber" />
        <KpiCard isLoading={isLoading} label="Pending Trips" value="27" detail="Awaiting driver allocation" icon={ClipboardList} tone="rose" />
      </div>
      <section className="rounded-lg border border-slate-800 bg-slate-900/30 p-6"><p className="text-sm font-medium text-slate-200">Dispatch readiness</p><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Use the operational metrics above to prioritize vehicle assignment and maintenance scheduling.</p></section>
    </div>
  )
}
