'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server'

export async function updateUserRole(userId: string, newRole: string) {
  // 1. Verify the current user is an admin
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Unauthorized")

  const { data: callerProfile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (callerProfile?.role !== 'admin') {
    throw new Error("Forbidden: Only admins can manage roles.")
  }

  // 2. Use Admin Client to update the target user's role in profiles
  const adminClient = await createSupabaseAdminClient()
  
  const { error: profileError } = await (adminClient as any)
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId)

  if (profileError) {
    console.error("Failed to update role:", profileError)
    throw new Error("Failed to update user role")
  }

  // 3. If promoting to driver, automatically create a drivers table record
  if (newRole === 'driver') {
    // Fetch the target user's auth metadata (contains driver fields from sign-up form)
    const { data: authUserData } = await adminClient.auth.admin.getUserById(userId)
    const meta = authUserData?.user?.user_metadata ?? {}

    // Fetch profile for full_name fallback
    const { data: targetProfile } = await (adminClient as any)
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .single() as { data: { full_name: string; email: string } | null }

    // Check if a drivers record already exists for this profile
    const { data: existingDriver } = await (adminClient as any)
      .from('drivers')
      .select('id')
      .eq('profile_id', userId)
      .maybeSingle()

    if (!existingDriver) {
      const fullName = meta.full_name || targetProfile?.full_name || 'Unknown Driver'
      const licenseNumber = meta.license_number || `DL-TEMP-${Date.now()}`
      const licenseExpiry = meta.license_expiry || '2030-12-31'
      const phone = meta.phone || '+919999999999'

      const { error: driverError } = await (adminClient as any)
        .from('drivers')
        .insert({
          profile_id: userId,
          employee_id: `EMP-${Date.now()}`,
          full_name: fullName,
          license_number: licenseNumber,
          license_expiry: licenseExpiry,
          phone: phone,
          status: 'Available',
        })

      if (driverError) {
        console.error("Warning: Failed to create driver record:", driverError.message)
        // Don't throw — role was still updated, admin can fix manually
      }
    }
  }

  // 4. Update auth.users metadata so future sign-ins retain the role
  await adminClient.auth.admin.updateUserById(userId, {
    user_metadata: { role: newRole }
  })

  revalidatePath('/admin/users')
  revalidatePath('/')
}

export async function approveTrip(tripId: string) {
  // Only admins or fleet managers can approve/dispatch a draft trip
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!['admin', 'fleet_manager'].includes(profile?.role ?? '')) {
    throw new Error("Forbidden: Only admin or fleet manager can approve trips.")
  }

  const adminClient = await createSupabaseAdminClient()
  const { error } = await (adminClient as any)
    .from('trips')
    .update({ status: 'Dispatched', dispatched_at: new Date().toISOString() })
    .eq('id', tripId)
    .eq('status', 'Draft') // Safety: only transition from Draft

  if (error) throw new Error("Failed to approve trip: " + error.message)

  revalidatePath('/')
}
