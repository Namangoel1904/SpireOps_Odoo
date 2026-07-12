"use client"

import { useEffect, useState, type ReactNode } from "react"
import { AlertTriangle, Gauge, TrendingUp, WalletCards } from "lucide-react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { KpiCard } from "@/components/dashboard/kpi-card"
import { Skeleton } from "@/components/ui/skeleton"

type Props = {
  totalFuelCost: number
  totalMaintenanceCost: number
  avgKmPerLitre: number
  efficiencyData: { vehicle: string; kmPerLitre: number }[]
  utilizationData: { day: string; utilization: number }[]
  anomalies: { vehicle: string; message: string }[]
}

const chartGrid = "#1e293b"
const chartText = "#94a3b8"
const loadingDelayMs = 1100

function ChartSkeleton(): ReactNode {
  return <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5"><Skeleton className="h-4 w-40" /><Skeleton className="mt-6 h-56 w-full" /></div>
}

export function FinancialAnalystDashboard({
  totalFuelCost,
  totalMaintenanceCost,
  avgKmPerLitre,
  efficiencyData,
  utilizationData,
  anomalies,
}: Props): ReactNode {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), loadingDelayMs)
    return () => window.clearTimeout(timer)
  }, [])

  const totalOpex = totalFuelCost + totalMaintenanceCost

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-400">Financial Analyst</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50">Fleet performance intelligence</h1>
        </div>
        <p className="text-sm text-slate-400">Live operational data</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard isLoading={isLoading} label="Total Fuel Cost" value={`₹${totalFuelCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} detail="From logged receipts" icon={Gauge} tone="sky" />
        <KpiCard isLoading={isLoading} label="Maintenance OPEX" value={`₹${totalMaintenanceCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} detail="Total repair costs" icon={TrendingUp} tone="emerald" />
        <KpiCard isLoading={isLoading} label="Avg Fuel Efficiency" value={avgKmPerLitre > 0 ? `${avgKmPerLitre.toFixed(2)} km/L` : "N/A"} detail="Fleet average" icon={WalletCards} tone="amber" />
      </div>

      {isLoading ? (
        <div className="grid gap-4 xl:grid-cols-2"><ChartSkeleton /><ChartSkeleton /></div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-5">
            <div className="mb-5">
              <h2 className="text-sm font-semibold text-slate-100">Fleet Utilization (7-day)</h2>
              <p className="mt-1 text-xs text-slate-400">Daily active fleet percentage</p>
            </div>
            <div className="h-64" role="img" aria-label="Fleet utilization area chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={utilizationData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="utilization-gradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={chartGrid} vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: chartText, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fill: chartText, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => [`${v}%`, "Utilization"]} contentStyle={{ backgroundColor: "#020617", border: "1px solid #1e293b", borderRadius: "6px" }} labelStyle={{ color: "#cbd5e1" }} />
                  <Area type="monotone" dataKey="utilization" stroke="#38bdf8" strokeWidth={3} fill="url(#utilization-gradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-5">
            <div className="mb-5">
              <h2 className="text-sm font-semibold text-slate-100">Fuel Efficiency by Vehicle</h2>
              <p className="mt-1 text-xs text-slate-400">Kilometres per litre</p>
            </div>
            <div className="h-64" role="img" aria-label="Fuel efficiency bar chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={efficiencyData.slice(0, 6)} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke={chartGrid} vertical={false} />
                  <XAxis dataKey="vehicle" tick={{ fill: chartText, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: chartText, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => [`${v} km/L`, "Efficiency"]} contentStyle={{ backgroundColor: "#020617", border: "1px solid #1e293b", borderRadius: "6px" }} labelStyle={{ color: "#cbd5e1" }} />
                  <Bar dataKey="kmPerLitre" fill="#34d399" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      )}

      {/* OPEX Breakdown */}
      {!isLoading && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-200">OPEX Breakdown</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-700 bg-slate-950 p-4">
              <p className="text-xs text-slate-400">Fuel Costs</p>
              <p className="mt-1 text-2xl font-bold text-sky-400">₹{totalFuelCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
              <div className="mt-2 h-1.5 rounded-full bg-slate-800">
                <div className="h-1.5 rounded-full bg-sky-400" style={{ width: totalOpex > 0 ? `${(totalFuelCost / totalOpex) * 100}%` : '0%' }} />
              </div>
              <p className="mt-1 text-xs text-slate-500">{totalOpex > 0 ? Math.round((totalFuelCost / totalOpex) * 100) : 0}% of total OPEX</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-950 p-4">
              <p className="text-xs text-slate-400">Maintenance Costs</p>
              <p className="mt-1 text-2xl font-bold text-emerald-400">₹{totalMaintenanceCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
              <div className="mt-2 h-1.5 rounded-full bg-slate-800">
                <div className="h-1.5 rounded-full bg-emerald-400" style={{ width: totalOpex > 0 ? `${(totalMaintenanceCost / totalOpex) * 100}%` : '0%' }} />
              </div>
              <p className="mt-1 text-xs text-slate-500">{totalOpex > 0 ? Math.round((totalMaintenanceCost / totalOpex) * 100) : 0}% of total OPEX</p>
            </div>
          </div>
        </section>
      )}

      {/* Fuel Anomaly Alert */}
      {!isLoading && anomalies.length > 0 && (
        <section className="relative overflow-hidden rounded-lg border border-rose-500/50 bg-rose-500/10 p-5 shadow-[0_0_28px_rgba(244,63,94,0.12)]">
          <span className="absolute right-5 top-5 h-3 w-3 animate-ping rounded-full bg-rose-400" />
          <span className="absolute right-5 top-5 h-3 w-3 rounded-full bg-rose-400" />
          <div className="flex gap-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-rose-500/20 text-rose-300">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-rose-100">Fuel Anomaly Detected</p>
              {anomalies.map((a) => (
                <p key={a.vehicle} className="mt-1 text-sm leading-6 text-rose-200/80">{a.message}</p>
              ))}
              <p className="mt-3 text-xs font-medium uppercase tracking-[0.12em] text-rose-300">High priority · Real-time detection</p>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
