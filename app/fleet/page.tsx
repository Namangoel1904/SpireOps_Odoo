import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { TransitOpsShell } from "@/components/layout/transit-ops-shell"
import { Tractor, Info, Activity } from "lucide-react"

export default async function FleetPage() {
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

  // Fetch vehicles
  const { data: vehicles } = await (supabase as any)
    .from('vehicles')
    .select('*')
    .order('status', { ascending: true })

  return (
    <TransitOpsShell user={userInfo}>
      <div className="space-y-6">
        <section className="rounded-lg border border-dashed border-slate-800 bg-slate-900/30 p-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-400">Registry</p>
          <h1 className="mt-2 text-2xl font-semibold">Vehicle Registry</h1>
          <p className="mt-2 text-sm text-slate-400">Manage your fleet assets and current statuses.</p>
        </section>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles?.map((vehicle: any) => (
              <div key={vehicle.id} className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Tractor className="h-5 w-5 text-slate-500" />
                    <span className="font-medium text-slate-200">{vehicle.registration_plate}</span>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                    vehicle.status === 'Available' ? 'bg-emerald-500/10 text-emerald-400' :
                    vehicle.status === 'On Trip' ? 'bg-sky-500/10 text-sky-400' :
                    vehicle.status === 'In Shop' ? 'bg-rose-500/10 text-rose-400' :
                    'bg-slate-500/10 text-slate-400'
                  }`}>
                    {vehicle.status}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-slate-400">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Make & Model</p>
                    <p>{vehicle.make} {vehicle.model}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Capacity</p>
                    <p>{vehicle.capacity_kg} kg</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </TransitOpsShell>
  )
}
