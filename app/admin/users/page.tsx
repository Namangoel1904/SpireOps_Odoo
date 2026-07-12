import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { TransitOpsShell } from "@/components/layout/transit-ops-shell"
import { ShieldCheck, UserCog } from "lucide-react"
import { updateUserRole } from "./actions"

export default async function AdminUsersPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/login")
  }

  // Verify Admin status
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single() as { data: { role: string; full_name: string } | null }

  if (profile?.role !== 'admin') {
    redirect("/") // Kick non-admins out
  }

  const userInfo = {
    name: profile?.full_name || user.email || 'Admin',
    email: user.email ?? '',
    role: 'Super Admin',
    initials: (profile?.full_name || 'AD').substring(0, 2).toUpperCase(),
  }

  // Fetch all profiles
  const { data: users } = await (supabase as any)
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <TransitOpsShell user={userInfo}>
      <div className="space-y-6">
        <section className="rounded-lg border border-dashed border-slate-800 bg-slate-900/30 p-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-400">Access Control</p>
          <h1 className="mt-2 text-2xl font-semibold">User Management</h1>
          <p className="mt-2 text-sm text-slate-400">Promote, demote, and manage role assignments for all platform users.</p>
        </section>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="border-b border-slate-800 bg-slate-950/50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Current Role</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users?.map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-900/50">
                    <td className="px-4 py-4 font-medium text-slate-200">
                      <div className="flex items-center gap-2">
                        <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-800 text-xs font-bold text-slate-300">
                          {u.full_name.substring(0, 2).toUpperCase()}
                        </div>
                        {u.full_name}
                      </div>
                    </td>
                    <td className="px-4 py-4">{u.email}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        u.role === 'admin' ? 'bg-fuchsia-500/10 text-fuchsia-400' :
                        u.role === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-sky-500/10 text-sky-400'
                      }`}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {u.id !== user.id ? (
                        <form action={async (formData) => {
                          'use server';
                          await updateUserRole(u.id, formData.get('role') as string);
                        }} className="flex items-center justify-end gap-2">
                          <select 
                            name="role" 
                            defaultValue={u.role}
                            className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200 focus:border-sky-400 focus:outline-none"
                          >
                            <option value="pending">Pending</option>
                            <option value="driver">Driver</option>
                            <option value="fleet_manager">Fleet Manager</option>
                            <option value="safety_officer">Safety Officer</option>
                            <option value="financial_analyst">Financial Analyst</option>
                            <option value="admin">Super Admin</option>
                          </select>
                          <button type="submit" className="rounded bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700">
                            Save
                          </button>
                        </form>
                      ) : (
                        <span className="text-xs text-slate-500 italic">Current User</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </TransitOpsShell>
  )
}
