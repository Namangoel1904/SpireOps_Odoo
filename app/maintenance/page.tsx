import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { TransitOpsShell } from "@/components/layout/transit-ops-shell"
import { Wrench } from "lucide-react"

export default async function MaintenancePage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/login")
  }

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single() as { data: { role: string; full_name: string } | null }

  const role = profile?.role ?? 'driver'
  const name = profile?.full_name || user.email || 'Unknown User'

  const userInfo = {
    name,
    email: user.email ?? '',
    role: role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    initials: name.substring(0, 2).toUpperCase(),
  }

  // Fetch maintenance logs
  const { data: logs } = await (supabase as any)
    .from('maintenance_logs')
    .select('*, vehicles(registration_plate)')
    .order('start_date', { ascending: false })

  return (
    <TransitOpsShell user={userInfo}>
      <div className="space-y-6">
        <section className="rounded-lg border border-dashed border-slate-800 bg-slate-900/30 p-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-400">Repairs</p>
          <h1 className="mt-2 text-2xl font-semibold">Maintenance Logs</h1>
          <p className="mt-2 text-sm text-slate-400">Track vehicle repairs and shop time.</p>
        </section>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          {logs && logs.length > 0 ? (
            <div className="grid gap-4">
              {logs.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <div className="flex items-center gap-4">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-rose-500/10 text-rose-400">
                      <Wrench className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-200">{log.title}</p>
                      <p className="text-xs text-slate-500">{log.vehicles?.registration_plate} • {log.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      log.end_date ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {log.end_date ? 'Resolved' : 'In Shop'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">No maintenance logs found.</p>
          )}
        </div>
      </div>
    </TransitOpsShell>
  )
}
