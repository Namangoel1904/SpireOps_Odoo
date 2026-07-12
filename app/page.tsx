import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { TransitOpsShell } from "@/components/layout/transit-ops-shell"
import { AdminDashboard } from "@/components/dashboard/admin-dashboard"
import { FleetManagerDashboard } from "@/components/dashboard/fleet-manager-dashboard"
import { FinancialAnalystDashboard } from "@/components/dashboard/financial-analyst-dashboard"
import { DriverDashboard } from "@/components/dashboard/driver-dashboard"
import { SafetyOfficerDashboard } from "@/components/dashboard/safety-officer-dashboard"
import { PendingDashboard } from "@/components/dashboard/pending-dashboard"

export default async function CommandCenterPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) redirect("/login")

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single() as { data: { role: string; full_name: string } | null }

  const role = profile?.role ?? 'pending'
  const name = profile?.full_name || user.email || 'Unknown User'

  const userInfo = {
    name,
    email: user.email ?? '',
    role: role === 'admin' ? 'Super Admin' : role.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
    initials: name.substring(0, 2).toUpperCase(),
  }

  let DashboardComponent

  if (role === 'admin') {
    DashboardComponent = <AdminDashboard adminId={user.id} />

  } else if (role === 'fleet_manager') {
    DashboardComponent = <FleetManagerDashboard />

  } else if (role === 'safety_officer') {
    DashboardComponent = <SafetyOfficerDashboard />

  } else if (role === 'financial_analyst') {
    // Fetch financial data server-side
    const { data: fuelLogs } = await (supabase as any).from('fuel_logs').select('total_cost, km_per_litre, vehicles(registration_plate)')
    const { data: maintenanceLogs } = await (supabase as any).from('maintenance_logs').select('cost')

    const totalFuelCost = fuelLogs?.reduce((acc: number, l: any) => acc + (l.total_cost || 0), 0) ?? 0
    const totalMaintenanceCost = maintenanceLogs?.reduce((acc: number, l: any) => acc + (l.cost || 0), 0) ?? 0

    // Build per-vehicle efficiency map
    const efficiencyMap: Record<string, { total: number; count: number }> = {}
    for (const log of fuelLogs ?? []) {
      if (log.km_per_litre && log.vehicles?.registration_plate) {
        const plate = log.vehicles.registration_plate
        if (!efficiencyMap[plate]) efficiencyMap[plate] = { total: 0, count: 0 }
        efficiencyMap[plate].total += log.km_per_litre
        efficiencyMap[plate].count += 1
      }
    }
    const efficiencyData = Object.entries(efficiencyMap).map(([vehicle, { total, count }]) => ({
      vehicle,
      kmPerLitre: parseFloat((total / count).toFixed(2)),
    })).sort((a, b) => b.kmPerLitre - a.kmPerLitre)

    const validKmL = fuelLogs?.filter((l: any) => l.km_per_litre > 0) ?? []
    const avgKmPerLitre = validKmL.length > 0
      ? validKmL.reduce((acc: number, l: any) => acc + l.km_per_litre, 0) / validKmL.length
      : 0

    // Fake 7-day utilization data (could be computed from trips later)
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const utilizationData = days.map(day => ({ day, utilization: 50 + Math.floor(Math.random() * 40) }))

    DashboardComponent = (
      <FinancialAnalystDashboard
        totalFuelCost={totalFuelCost}
        totalMaintenanceCost={totalMaintenanceCost}
        avgKmPerLitre={avgKmPerLitre}
        efficiencyData={efficiencyData}
        utilizationData={utilizationData}
        anomalies={[]}
      />
    )

  } else if (role === 'driver') {
    DashboardComponent = <DriverDashboard userId={user.id} />

  } else {
    DashboardComponent = <PendingDashboard />
  }

  return (
    <TransitOpsShell user={userInfo}>
      {DashboardComponent}
    </TransitOpsShell>
  )
}
