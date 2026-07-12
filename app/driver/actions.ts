"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function advanceTripStatus(tripId: string, currentStatus: string) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const statusMap: Record<string, string> = {
    'Dispatched': 'In Transit',
    'In Transit': 'Completed',
  }
  const nextStatus = statusMap[currentStatus]
  if (!nextStatus) throw new Error("Cannot advance this trip status")

  const { error } = await (supabase as any)
    .from('trips')
    .update({ status: nextStatus })
    .eq('id', tripId)

  if (error) throw new Error("Failed to update trip status: " + error.message)
  revalidatePath('/')
}
