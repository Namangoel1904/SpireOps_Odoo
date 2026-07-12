import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ShieldCheck, ShieldAlert, Wrench, Users } from "lucide-react"

export async function SafetyOfficerDashboard() {
  const supabase = await createSupabaseServerClient()

  const { data: drivers } = await (supabase as any)
    .from('drivers')
    .select('*, profiles(full_name, email)')
    .order('status')

  const { data: openMaintenance } = await (supabase as any)
    .from('maintenance_logs')
    .select('*, vehicles(registration_plate, make, model)')
    .is('end_date', null)
    .order('start_date', { ascending: false })

  const totalDrivers = drivers?.length ?? 0
  const suspendedDrivers = drivers?.filter((d: any) => d.status === 'Suspended').length ?? 0
  const activeDrivers = drivers?.filter((d: any) => d.status !== 'Suspended').length ?? 0
  const openIssues = openMaintenance?.length ?? 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-400">Safety Officer</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-50">Safety & Compliance Center</h1>
        <p className="mt-1 text-sm text-slate-400">Monitor driver compliance, license status, and fleet safety metrics.</p>
      </div>

      {/* KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Drivers", value: totalDrivers, icon: Users, color: "sky" },
          { label: "Active Drivers", value: activeDrivers, icon: ShieldCheck, color: "emerald" },
          { label: "Suspended", value: suspendedDrivers, icon: ShieldAlert, color: suspendedDrivers > 0 ? "rose" : "slate" },
          { label: "Open Maintenance", value: openIssues, icon: Wrench, color: openIssues > 0 ? "amber" : "slate" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-400">{label}</p>
              <div className={`grid h-9 w-9 place-items-center rounded-lg bg-${color}-500/10`}>
                <Icon className={`h-5 w-5 text-${color}-400`} />
              </div>
            </div>
            <p className={`mt-3 text-3xl font-bold text-${color}-400`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Driver Compliance Table */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/50">
          <div className="border-b border-slate-800 p-5">
            <h2 className="text-sm font-semibold text-slate-200">Driver Compliance</h2>
            <p className="mt-0.5 text-xs text-slate-400">License validity and status overview</p>
          </div>
          <div className="divide-y divide-slate-800 max-h-80 overflow-y-auto">
            {drivers?.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-500">No drivers registered.</p>
            ) : drivers?.map((d: any) => (
              <div key={d.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-800 text-xs font-bold text-slate-300">
                  {(d.profiles?.full_name || 'Dr').substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{d.profiles?.full_name ?? 'Unknown Driver'}</p>
                  <p className="text-xs text-slate-500 truncate">
                    License: {d.license_number} · Exp: {d.license_expiry ? new Date(d.license_expiry).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                    d.status === 'Available' ? 'bg-emerald-500/10 text-emerald-400' :
                    d.status === 'On Trip' ? 'bg-sky-500/10 text-sky-400' :
                    d.status === 'Suspended' ? 'bg-rose-500/10 text-rose-400' :
                    'bg-slate-500/10 text-slate-400'
                  }`}>{d.status}</span>
                  {d.license_expiry && new Date(d.license_expiry) < new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) && (
                    <span className="text-[10px] text-amber-400">Expires soon</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Open Maintenance Issues */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/50">
          <div className="border-b border-slate-800 p-5">
            <h2 className="text-sm font-semibold text-slate-200">Open Maintenance Issues</h2>
            <p className="mt-0.5 text-xs text-slate-400">Vehicles currently in shop</p>
          </div>
          <div className="divide-y divide-slate-800 max-h-80 overflow-y-auto">
            {openMaintenance?.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-8 text-center">
                <ShieldCheck className="h-8 w-8 text-emerald-500" />
                <p className="text-sm font-medium text-emerald-400">All Clear</p>
                <p className="text-xs text-slate-500">No open maintenance issues.</p>
              </div>
            ) : openMaintenance?.map((m: any) => (
              <div key={m.id} className="flex items-start gap-3 px-5 py-3.5">
                <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-rose-500/10">
                  <Wrench className="h-4 w-4 text-rose-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{m.title}</p>
                  <p className="text-xs text-slate-500">{m.vehicles?.registration_plate} · {m.category}</p>
                  <p className="text-xs text-slate-500">In shop since: {new Date(m.start_date).toLocaleDateString()}</p>
                </div>
                <span className="shrink-0 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-400">In Shop</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
