import { createSupabaseServerClient } from "@/lib/supabase/server"
import { updateUserRole, approveTrip } from "@/app/admin/users/actions"
import {
  Users, Truck, Route, Clock, CheckCircle2, UserCog,
  DollarSign, Fuel, ArrowRight, Package, MapPin, FileText
} from "lucide-react"
import Link from "next/link"

type Profile = {
  id: string
  full_name: string
  email: string
  role: string
  created_at: string
}

function roleBadgeClass(role: string): string {
  if (role === 'admin') return 'bg-fuchsia-500/10 text-fuchsia-400'
  if (role === 'pending') return 'bg-amber-500/10 text-amber-400'
  if (role === 'fleet_manager') return 'bg-sky-500/10 text-sky-400'
  if (role === 'driver') return 'bg-emerald-500/10 text-emerald-400'
  if (role === 'safety_officer') return 'bg-teal-500/10 text-teal-400'
  if (role === 'financial_analyst') return 'bg-violet-500/10 text-violet-400'
  return 'bg-slate-500/10 text-slate-400'
}

function tripStatusClass(status: string): string {
  if (status === 'Completed') return 'text-emerald-400'
  if (status === 'In Transit') return 'text-sky-400'
  if (status === 'Dispatched') return 'text-amber-400'
  if (status === 'Draft') return 'text-slate-400'
  return 'text-slate-500'
}

export async function AdminDashboard({ adminId }: { adminId: string }) {
  const supabase = await createSupabaseServerClient()

  const [
    { data: profiles },
    { data: vehicles },
    { data: allTrips },
    { data: fuelLogs },
    { data: maintenanceLogs },
  ] = await Promise.all([
    (supabase as any).from('profiles').select('*').order('created_at', { ascending: false }),
    (supabase as any).from('vehicles').select('status'),
    (supabase as any)
      .from('trips')
      .select('id, source, destination, status, cargo_weight_kg, planned_distance_km, created_at, drivers(full_name), vehicles(registration_plate)')
      .order('created_at', { ascending: false })
      .limit(10),
    (supabase as any).from('fuel_logs').select('total_cost'),
    (supabase as any).from('maintenance_logs').select('cost'),
  ])

  const allProfiles: Profile[] = profiles ?? []
  const pendingUsers = allProfiles.filter((p) => p.role === 'pending')
  const totalUsers = allProfiles.length
  const totalVehicles = vehicles?.length ?? 0
  const availableVehicles = vehicles?.filter((v: any) => v.status === 'Available').length ?? 0

  const allTripsList: any[] = allTrips ?? []
  const draftTrips = allTripsList.filter((t) => t.status === 'Draft')
  const recentTrips = allTripsList.filter((t) => t.status !== 'Draft')

  const totalFuelCost = fuelLogs?.reduce((acc: number, l: any) => acc + (l.total_cost || 0), 0) ?? 0
  const totalMaintenanceCost = maintenanceLogs?.reduce((acc: number, l: any) => acc + (l.cost || 0), 0) ?? 0
  const totalOpex = totalFuelCost + totalMaintenanceCost

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-fuchsia-400">Super Admin</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-50">Platform Command Center</h1>
        <p className="mt-1 text-sm text-slate-400">Full visibility across all operations and users.</p>
      </div>

      {/* Top KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-400">Total Users</p>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-fuchsia-500/10">
              <Users className="h-5 w-5 text-fuchsia-400" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-fuchsia-400">{totalUsers}</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-400">Pending Approval</p>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-amber-400">{pendingUsers.length}</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-400">Total Vehicles</p>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-sky-500/10">
              <Truck className="h-5 w-5 text-sky-400" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-sky-400">{totalVehicles}</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-400">Available Vehicles</p>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/10">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-emerald-400">{availableVehicles}</p>
        </div>
      </div>

      {/* Financial Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-400">Total Fuel OPEX</p>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-orange-500/10">
              <Fuel className="h-5 w-5 text-orange-400" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-orange-400">
            ₹{totalFuelCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-slate-800">
            <div className="h-1.5 rounded-full bg-orange-400" style={{ width: totalOpex > 0 ? `${(totalFuelCost / totalOpex) * 100}%` : '50%' }} />
          </div>
          <p className="mt-1 text-xs text-slate-500">{totalOpex > 0 ? Math.round((totalFuelCost / totalOpex) * 100) : 0}% of total OPEX</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-400">Total Maintenance OPEX</p>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-violet-500/10">
              <DollarSign className="h-5 w-5 text-violet-400" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-violet-400">
            ₹{totalMaintenanceCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-slate-800">
            <div className="h-1.5 rounded-full bg-violet-400" style={{ width: totalOpex > 0 ? `${(totalMaintenanceCost / totalOpex) * 100}%` : '50%' }} />
          </div>
          <p className="mt-1 text-xs text-slate-500">{totalOpex > 0 ? Math.round((totalMaintenanceCost / totalOpex) * 100) : 0}% of total OPEX</p>
        </div>
      </div>

      {/* ── DRAFT TRIPS: Dispatch Approval Panel ── */}
      {draftTrips.length > 0 && (
        <section className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-sky-300 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Pending Trip Approvals ({draftTrips.length})
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Fleet Manager saved these as Drafts. Review and dispatch or reject below.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {draftTrips.map((t: any) => (
              <div key={t.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 bg-slate-950 p-4">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sky-500/10">
                  <Route className="h-4 w-4 text-sky-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">
                    {t.source} → {t.destination}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t.vehicles?.registration_plate ?? 'Vehicle TBD'} · {t.drivers?.full_name ?? 'Driver TBD'} ·{' '}
                    {t.cargo_weight_kg?.toLocaleString()} kg · {t.planned_distance_km} km
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/trips/${t.id}`}
                    className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-slate-600 hover:text-slate-100 transition"
                  >
                    Details
                  </Link>
                  <form action={async () => {
                    'use server'
                    await approveTrip(t.id)
                  }}>
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 rounded bg-sky-500 px-3 py-1 text-xs font-semibold text-slate-950 hover:bg-sky-400 transition"
                    >
                      Approve & Dispatch <ArrowRight className="h-3 w-3" />
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── PENDING USERS: Role Assignment ── */}
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
            {pendingUsers.map((u) => (
              <div key={u.id} className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-800 text-xs font-bold text-slate-300">
                    {u.full_name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{u.full_name}</p>
                    <p className="text-xs text-slate-500 truncate">{u.email}</p>
                  </div>
                  <form
                    action={async (formData: FormData) => {
                      'use server'
                      await updateUserRole(u.id, formData.get('role') as string)
                    }}
                    className="flex items-center gap-2"
                  >
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
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Two column: Users + Active Trips */}
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">All Platform Users</h2>
            <Link href="/admin/users" className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300">
              <UserCog className="h-3 w-3" /> Manage
            </Link>
          </div>
          <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
            {allProfiles.map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-900">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-300">
                  {u.full_name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate">{u.full_name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{u.email}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${roleBadgeClass(u.role)}`}>
                  {u.role.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">Recent Active Trips</h2>
            <Link href="/trips" className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300">
              <Route className="h-3 w-3" /> View all
            </Link>
          </div>
          {recentTrips.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">No dispatched trips yet.</p>
          ) : (
            <div className="space-y-1">
              {recentTrips.slice(0, 6).map((t) => (
                <Link
                  key={t.id}
                  href={`/trips/${t.id}`}
                  className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-slate-900 transition-colors group"
                >
                  <div className="h-2 w-2 rounded-full bg-sky-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-300 group-hover:text-slate-100 truncate">
                      {t.source} → {t.destination}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {t.vehicles?.registration_plate ?? 'N/A'} · {t.drivers?.full_name ?? 'No driver'}
                    </p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-semibold uppercase ${tripStatusClass(t.status)}`}>
                    {t.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
