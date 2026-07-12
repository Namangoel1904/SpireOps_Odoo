"use client"

import { useEffect, useState, type ReactNode } from "react"
import { AlertTriangle, Gauge, TrendingUp, WalletCards } from "lucide-react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { KpiCard } from "@/components/dashboard/kpi-card"
import { Skeleton } from "@/components/ui/skeleton"

type UtilizationPoint = { day: string; utilization: number }
type EfficiencyPoint = { vehicle: string; kmPerLitre: number }
type RoiPoint = { vehicle: string; roi: number }

const utilizationData: UtilizationPoint[] = [
  { day: "Mon", utilization: 72 }, { day: "Tue", utilization: 78 }, { day: "Wed", utilization: 74 }, { day: "Thu", utilization: 83 }, { day: "Fri", utilization: 88 }, { day: "Sat", utilization: 81 }, { day: "Sun", utilization: 76 },
]
const efficiencyData: EfficiencyPoint[] = [
  { vehicle: "TR-204", kmPerLitre: 5.8 }, { vehicle: "TR-118", kmPerLitre: 5.4 }, { vehicle: "TR-321", kmPerLitre: 5.1 }, { vehicle: "TR-077", kmPerLitre: 4.7 }, { vehicle: "TR-410", kmPerLitre: 4.3 },
]
const roiData: RoiPoint[] = [
  { vehicle: "TR-204", roi: 28 }, { vehicle: "TR-118", roi: 22 }, { vehicle: "TR-321", roi: 19 }, { vehicle: "TR-077", roi: 16 }, { vehicle: "TR-410", roi: 12 },
]

const chartGrid = "#1e293b"
const chartText = "#94a3b8"
const loadingDelayMs = 1100

function ChartSkeleton(): ReactNode {
  return <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5"><Skeleton className="h-4 w-40" /><Skeleton className="mt-6 h-56 w-full" /></div>
}

export function FinancialAnalystDashboard(): ReactNode {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), loadingDelayMs)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-400">Financial Analyst</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50">Fleet performance intelligence</h1></div><p className="text-sm text-slate-400">Rolling 7-day operational view</p></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><KpiCard isLoading={isLoading} label="Fleet Utilization" value="78.9%" detail="Up 4.6% week over week" icon={Gauge} tone="sky" /><KpiCard isLoading={isLoading} label="Fuel Efficiency" value="5.12 km/L" detail="0.18 km/L above target" icon={TrendingUp} tone="emerald" /><KpiCard isLoading={isLoading} label="Portfolio ROI" value="21.4%" detail="Across tracked revenue vehicles" icon={WalletCards} tone="amber" /></div>
      {isLoading ? <div className="grid gap-4 xl:grid-cols-2"><ChartSkeleton /><ChartSkeleton /></div> : <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-5"><div className="mb-5"><h2 className="text-sm font-semibold text-slate-100">Fleet Utilization</h2><p className="mt-1 text-xs text-slate-400">Daily active fleet percentage</p></div><div className="h-64" role="img" aria-label="Area chart showing fleet utilization from 72 to 88 percent during the past week"><ResponsiveContainer width="100%" height="100%"><AreaChart data={utilizationData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}><defs><linearGradient id="utilization-gradient" x1="0" x2="0" y1="0" y2="1"><stop offset="5%" stopColor="#38bdf8" stopOpacity={0.45} /><stop offset="95%" stopColor="#38bdf8" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke={chartGrid} vertical={false} /><XAxis dataKey="day" tick={{ fill: chartText, fontSize: 12 }} axisLine={false} tickLine={false} /><YAxis domain={[60, 100]} tickFormatter={(value: number) => `${value}%`} tick={{ fill: chartText, fontSize: 12 }} axisLine={false} tickLine={false} /><Tooltip formatter={(value: number) => [`${value}%`, "Utilization"]} contentStyle={{ backgroundColor: "#020617", border: "1px solid #1e293b", borderRadius: "6px" }} labelStyle={{ color: "#cbd5e1" }} /><Area type="monotone" dataKey="utilization" stroke="#38bdf8" strokeWidth={3} fill="url(#utilization-gradient)" /></AreaChart></ResponsiveContainer></div></section>
        <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-5"><div className="mb-5"><h2 className="text-sm font-semibold text-slate-100">Fuel Efficiency</h2><p className="mt-1 text-xs text-slate-400">Kilometres per litre by vehicle</p></div><div className="h-64" role="img" aria-label="Bar chart comparing fuel efficiency for five vehicles"><ResponsiveContainer width="100%" height="100%"><BarChart data={efficiencyData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}><CartesianGrid stroke={chartGrid} vertical={false} /><XAxis dataKey="vehicle" tick={{ fill: chartText, fontSize: 12 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: chartText, fontSize: 12 }} axisLine={false} tickLine={false} /><Tooltip formatter={(value: number) => [`${value} km/L`, "Efficiency"]} contentStyle={{ backgroundColor: "#020617", border: "1px solid #1e293b", borderRadius: "6px" }} labelStyle={{ color: "#cbd5e1" }} /><Bar dataKey="kmPerLitre" fill="#34d399" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></section>
      </div>}
      {isLoading ? <ChartSkeleton /> : <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-5"><div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="text-sm font-semibold text-slate-100">Per-vehicle ROI</h2><p className="mt-1 text-xs text-slate-400">Net return for the current reporting period</p></div><span className="rounded border border-sky-400/20 bg-sky-400/10 px-2 py-1 text-xs font-medium text-sky-300">Top 5 assets</span></div><div className="h-64" role="img" aria-label="Horizontal bar chart showing ROI for the top five vehicles"><ResponsiveContainer width="100%" height="100%"><BarChart data={roiData} layout="vertical" margin={{ top: 10, right: 28, left: 12, bottom: 0 }}><CartesianGrid stroke={chartGrid} horizontal={false} /><XAxis type="number" tickFormatter={(value: number) => `${value}%`} tick={{ fill: chartText, fontSize: 12 }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="vehicle" tick={{ fill: chartText, fontSize: 12 }} axisLine={false} tickLine={false} width={55} /><Tooltip formatter={(value: number) => [`${value}%`, "ROI"]} contentStyle={{ backgroundColor: "#020617", border: "1px solid #1e293b", borderRadius: "6px" }} labelStyle={{ color: "#cbd5e1" }} /><Bar dataKey="roi" radius={[0, 4, 4, 0]}>{roiData.map((entry) => <Cell key={entry.vehicle} fill={entry.roi < 16 ? "#f59e0b" : "#818cf8"} />)}</Bar></BarChart></ResponsiveContainer></div></section>}
      {isLoading ? <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-5"><Skeleton className="h-5 w-52" /><Skeleton className="mt-3 h-4 w-80 max-w-full" /></div> : <section className="relative overflow-hidden rounded-lg border border-rose-500/50 bg-rose-500/10 p-5 shadow-[0_0_28px_rgba(244,63,94,0.12)]"><span className="absolute right-5 top-5 h-3 w-3 animate-ping rounded-full bg-rose-400" /><span className="absolute right-5 top-5 h-3 w-3 rounded-full bg-rose-400" /><div className="flex gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-rose-500/20 text-rose-300"><AlertTriangle className="h-5 w-5" /></span><div><p className="text-sm font-semibold text-rose-100">Fuel Anomaly Detection</p><p className="mt-1 text-sm leading-6 text-rose-200/80"><span className="font-semibold text-rose-200">TR-077</span> recorded a 31% fuel-consumption drop against its route baseline. Inspect for a possible fuel leak or unauthorized fuel draw.</p><p className="mt-3 text-xs font-medium uppercase tracking-[0.12em] text-rose-300">High priority · Detected 12 minutes ago</p></div></div></section>}
    </div>
  )
}
