import { ReactNode } from "react"
import { ClipboardCheck, Route } from "lucide-react"

export function DriverDashboard(): ReactNode {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-dashed border-slate-800 bg-slate-900/30 p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-400">Driver View</p>
        <h1 className="mt-2 text-2xl font-semibold">My Dispatch Hub</h1>
        <p className="mt-2 text-sm text-slate-400">View your active trips and log fuel purchases here.</p>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-sky-500/10 text-sky-400">
              <Route className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">Active Trip</p>
              <p className="text-xs text-slate-500">You are currently assigned to a trip.</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">Next Assignment</p>
              <p className="text-xs text-slate-500">No pending assignments.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
