import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { TransitOpsShell } from "@/components/layout/transit-ops-shell"
import { LogFuel } from "@/components/workflows/log-fuel"

export default async function FuelPage() {
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

  return (
    <TransitOpsShell user={userInfo}>
      <div className="space-y-6">
        <LogFuel />
      </div>
    </TransitOpsShell>
  )
}
