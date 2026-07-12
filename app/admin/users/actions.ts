'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function updateUserRole(userId: string, newRole: string) {
  // 1. Verify the current user is an admin
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Unauthorized")

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (profile?.role !== 'admin') {
    throw new Error("Forbidden: Only admins can manage roles.")
  }

  // 2. Use Admin Client to update the target user's role
  const adminClient = await createSupabaseAdminClient()
  
  const { error } = await (adminClient as any)
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId)

  if (error) {
    console.error("Failed to update role:", error)
    throw new Error("Failed to update user role")
  }

  // 3. Update the auth.users metadata so future sign-ins retain it (optional but good practice)
  await adminClient.auth.admin.updateUserById(userId, {
    user_metadata: { role: newRole }
  })

  revalidatePath('/admin/users')
}
