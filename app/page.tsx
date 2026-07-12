import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { TransitOpsShell } from "@/components/layout/transit-ops-shell"
import { FleetManagerDashboard } from "@/components/dashboard/fleet-manager-dashboard"
import { FinancialAnalystDashboard } from "@/components/dashboard/financial-analyst-dashboard"
import { DriverDashboard } from "@/components/dashboard/driver-dashboard"
import { SafetyOfficerDashboard } from "@/components/dashboard/safety-officer-dashboard"
import { PendingDashboard } from "@/components/dashboard/pending-dashboard"

export default async function CommandCenterPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/login")
  }

  // Fetch the profile
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

  let DashboardComponent = <DriverDashboard />

  if (role === 'pending' || role === 'user') {
    DashboardComponent = <PendingDashboard />
  } else if (role === 'fleet_manager' || role === 'admin') {
    DashboardComponent = <FleetManagerDashboard />
  } else if (role === 'safety_officer') {
    DashboardComponent = <SafetyOfficerDashboard />
  } else if (role === 'financial_analyst') {
    DashboardComponent = <FinancialAnalystDashboard />
  }

  return (
    <TransitOpsShell user={userInfo}>
      {DashboardComponent}
    </TransitOpsShell>
  )
}
