import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ShieldCheck, ShieldAlert, Wrench, Users, Phone } from "lucide-react"

export async function SafetyOfficerDashboard() {
  const supabase = await createSupabaseServerClient()

  // Drivers table has its OWN full_name column — no join needed
  const { data: drivers } = await (supabase as any)
    .from('drivers')
    .select('id, full_name, license_number, license_expiry, status, phone, employee_id')
    .order('status')

  const { data: openMaintenance } = await (supabase as any)
    .from('maintenance_logs')
    .select('id, title, category, start_date, cost, vehicles(registration_plate, make, model)')
    .is('end_date', null)
    .order('start_date', { ascending: false })

  const allDrivers = drivers ?? []
  const totalDrivers = allDrivers.length
  const suspendedDrivers = allDrivers.filter((d: any) => d.status === 'Suspended').length
  const activeDrivers = allDrivers.filter((d: any) => d.status !== 'Suspended').length
  const openIssues = openMaintenance?.length ?? 0

  function statusBgClass(status: string): string {
    if (status === 'Available') return 'bg-emerald-500/10 text-emerald-400'
    if (status === 'On Trip') return 'bg-sky-500/10 text-sky-400'
    if (status === 'Suspended') return 'bg-rose-500/10 text-rose-400'
    return 'bg-slate-500/10 text-slate-400'
  }

  function isExpiringSoon(expiry: string | null): boolean {
    if (!expiry) return false
    return new Date(expiry) < new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-400">Safety Officer</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-50">Safety & Compliance Center</h1>
        <p className="mt-1 text-sm text-slate-400">Monitor driver compliance, license status, and fleet safety metrics.</p>
      </div>

      {/* KPI Row — static Tailwind classes */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-400">Total Drivers</p>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-sky-500/10">
              <Users className="h-5 w-5 text-sky-400" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-sky-400">{totalDrivers}</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-400">Active Drivers</p>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/10">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-emerald-400">{activeDrivers}</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-400">Suspended</p>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-rose-500/10">
              <ShieldAlert className="h-5 w-5 text-rose-400" />
            </div>
          </div>
          <p className={`mt-3 text-3xl font-bold ${suspendedDrivers > 0 ? 'text-rose-400' : 'text-slate-500'}`}>{suspendedDrivers}</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-400">Open Maintenance</p>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-amber-500/10">
              <Wrench className="h-5 w-5 text-amber-400" />
            </div>
          </div>
          <p className={`mt-3 text-3xl font-bold ${openIssues > 0 ? 'text-amber-400' : 'text-slate-500'}`}>{openIssues}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Driver Compliance Table */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/50">
          <div className="border-b border-slate-800 p-5">
            <h2 className="text-sm font-semibold text-slate-200">Driver Compliance</h2>
            <p className="mt-0.5 text-xs text-slate-400">License validity and status overview</p>
          </div>
          <div className="divide-y divide-slate-800 max-h-96 overflow-y-auto">
            {allDrivers.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-500">No drivers registered.</p>
            ) : (
              allDrivers.map((d: any) => (
                <div key={d.id} className="flex items-center gap-3 px-5 py-4">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-800 text-xs font-bold text-slate-300">
                    {d.full_name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200">{d.full_name}</p>
                    <p className="text-xs text-slate-500">
                      License: {d.license_number}
                    </p>
                    <p className="text-xs text-slate-500">
                      Expires: {d.license_expiry ? new Date(d.license_expiry).toLocaleDateString('en-IN') : 'N/A'}
                      {isExpiringSoon(d.license_expiry) && (
                        <span className="ml-2 text-amber-400 font-semibold">⚠ Soon</span>
                      )}
                    </p>
                    {d.phone && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-600">
                        <Phone className="h-3 w-3" /> {d.phone}
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${statusBgClass(d.status)}`}>
                    {d.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Open Maintenance Issues */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/50">
          <div className="border-b border-slate-800 p-5">
            <h2 className="text-sm font-semibold text-slate-200">Open Maintenance Issues</h2>
            <p className="mt-0.5 text-xs text-slate-400">Vehicles currently in shop</p>
          </div>
          <div className="divide-y divide-slate-800 max-h-96 overflow-y-auto">
            {openIssues === 0 ? (
              <div className="flex flex-col items-center gap-2 p-10 text-center">
                <ShieldCheck className="h-10 w-10 text-emerald-500" />
                <p className="text-sm font-medium text-emerald-400">All Clear</p>
                <p className="text-xs text-slate-500">No open maintenance issues.</p>
              </div>
            ) : (
              openMaintenance?.map((m: any) => (
                <div key={m.id} className="flex items-start gap-3 px-5 py-4">
                  <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-rose-500/10">
                    <Wrench className="h-4 w-4 text-rose-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200">{m.title}</p>
                    <p className="text-xs text-slate-500">{m.vehicles?.registration_plate} · {m.category}</p>
                    <p className="text-xs text-slate-500">Since: {new Date(m.start_date).toLocaleDateString('en-IN')}</p>
                    {m.cost > 0 && <p className="text-xs text-amber-400">Cost: ₹{m.cost.toLocaleString('en-IN')}</p>}
                  </div>
                  <span className="shrink-0 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-rose-400 uppercase">In Shop</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
