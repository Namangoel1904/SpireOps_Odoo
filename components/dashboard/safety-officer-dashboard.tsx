import { ReactNode } from "react"
import { ShieldAlert, ShieldCheck } from "lucide-react"

export function SafetyOfficerDashboard(): ReactNode {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-dashed border-slate-800 bg-slate-900/30 p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-400">Safety Compliance</p>
        <h1 className="mt-2 text-2xl font-semibold">Safety Officer Dashboard</h1>
        <p className="mt-2 text-sm text-slate-400">Monitor fleet health, driver compliance, and maintenance alerts.</p>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">Driver Compliance</p>
              <p className="text-xs text-slate-500">100% of drivers have valid licenses.</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-rose-500/10 text-rose-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">Critical Alerts</p>
              <p className="text-xs text-slate-500">0 severe safety incidents reported.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
