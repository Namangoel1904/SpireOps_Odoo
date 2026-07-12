import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { TransitOpsShell } from "@/components/layout/transit-ops-shell"
import { DispatchTripForm } from "@/components/workflows/dispatch-trip-form"

export default async function DispatchPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect("/login")

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single() as { data: { role: string; full_name: string } | null }

  const name = profile?.full_name || user.email || ''
  const role = profile?.role ?? ''

  const userInfo = {
    name,
    email: user.email ?? '',
    role: role.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
    initials: name.substring(0, 2).toUpperCase(),
  }

  // Fetch real vehicles and drivers from DB
  const { data: vehicles } = await (supabase as any)
    .from('vehicles')
    .select('id, registration_plate, make, model, capacity_kg, status')
    .eq('status', 'Available')
    .order('registration_plate')

  // Fetch available drivers — includes seeded dummy drivers AND approved profile-linked drivers
  const { data: drivers } = await (supabase as any)
    .from('drivers')
    .select('id, full_name, license_number, license_expiry, status, profile_id')
    .eq('status', 'Available')
    .order('full_name')

  return (
    <TransitOpsShell user={userInfo}>
      <DispatchTripForm vehicles={vehicles ?? []} drivers={drivers ?? []} />
    </TransitOpsShell>
  )
}
