import { createSupabaseServerClient } from "@/lib/supabase/server"
import { updateUserRole } from "@/app/admin/users/actions"
import { Users, Truck, Route, Clock, CheckCircle2, UserCog } from "lucide-react"
import Link from "next/link"

type Profile = {
  id: string
  full_name: string
  email: string
  role: string
  created_at: string
}

export async function AdminDashboard({ adminId }: { adminId: string }) {
  const supabase = await createSupabaseServerClient()

  // Platform stats
  const { data: profiles } = await (supabase as any).from('profiles').select('*').order('created_at', { ascending: false }) as { data: Profile[] | null }
  const { data: vehicles } = await (supabase as any).from('vehicles').select('status')
  const { data: trips } = await (supabase as any).from('trips').select('status, created_at').order('created_at', { ascending: false }).limit(5)

  const pendingUsers = profiles?.filter((p: Profile) => p.role === 'pending') ?? []
  const totalUsers = profiles?.length ?? 0
  const totalVehicles = vehicles?.length ?? 0
  const availableVehicles = vehicles?.filter((v: any) => v.status === 'Available').length ?? 0
  const recentTrips = trips ?? []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-fuchsia-400">Super Admin</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-50">Platform Command Center</h1>
        <p className="mt-1 text-sm text-slate-400">Full visibility across all operations and users.</p>
      </div>

      {/* KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Users", value: totalUsers, icon: Users, color: "fuchsia" },
          { label: "Pending Approval", value: pendingUsers.length, icon: Clock, color: "amber" },
          { label: "Total Vehicles", value: totalVehicles, icon: Truck, color: "sky" },
          { label: "Available Vehicles", value: availableVehicles, icon: CheckCircle2, color: "emerald" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`rounded-xl border border-slate-800 bg-slate-900/50 p-5`}>
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

      {/* Pending Users Approval */}
      {pendingUsers.length > 0 && (
        <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-amber-300">⚠ Pending User Approvals</h2>
              <p className="mt-0.5 text-xs text-slate-400">{pendingUsers.length} user(s) awaiting role assignment</p>
            </div>
            <Link href="/admin/users" className="text-xs font-semibold text-amber-400 hover:text-amber-300">
              Manage all →
            </Link>
          </div>
          <div className="space-y-3">
            {pendingUsers.map((u: Profile) => (
              <div key={u.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 bg-slate-950 p-4">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-800 text-xs font-bold text-slate-300">
                  {u.full_name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{u.full_name}</p>
                  <p className="text-xs text-slate-500 truncate">{u.email}</p>
                </div>
                <form action={async (formData: FormData) => {
                  'use server'
                  await updateUserRole(u.id, formData.get('role') as string)
                }} className="flex items-center gap-2">
                  <select
                    name="role"
                    defaultValue="driver"
                    className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 focus:border-amber-400 focus:outline-none"
                  >
                    <option value="driver">Driver</option>
                    <option value="fleet_manager">Fleet Manager</option>
                    <option value="safety_officer">Safety Officer</option>
                    <option value="financial_analyst">Financial Analyst</option>
                    <option value="admin">Super Admin</option>
                  </select>
                  <button type="submit" className="rounded bg-amber-500 px-3 py-1 text-xs font-semibold text-slate-950 hover:bg-amber-400">
                    Approve
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Two column layout */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* All Users table */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">All Platform Users</h2>
            <Link href="/admin/users" className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300">
              <UserCog className="h-3 w-3" /> Manage
            </Link>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {profiles?.map((u: Profile) => (
              <div key={u.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-900">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-300">
                  {u.full_name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate">{u.full_name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{u.email}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                  u.role === 'admin' ? 'bg-fuchsia-500/10 text-fuchsia-400' :
                  u.role === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                  'bg-sky-500/10 text-sky-400'
                }`}>
                  {u.role.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Recent trips */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">Recent Trips</h2>
            <Route className="h-4 w-4 text-slate-500" />
          </div>
          {recentTrips.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">No trips yet. Fleet Manager can dispatch trips.</p>
          ) : (
            <div className="space-y-2">
              {recentTrips.map((t: any) => (
                <div key={t.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-900">
                  <div className="h-2 w-2 rounded-full bg-sky-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300">{t.source} → {t.destination}</p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-semibold ${
                    t.status === 'Completed' ? 'text-emerald-400' :
                    t.status === 'In Transit' ? 'text-sky-400' : 'text-slate-400'
                  }`}>{t.status}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
