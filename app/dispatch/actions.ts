"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export type TripFormState = {
  error?: string
  success?: boolean
}

export async function createTrip(prevState: TripFormState, formData: FormData): Promise<TripFormState> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "You must be logged in to dispatch a trip." }

  const source = formData.get('source') as string
  const destination = formData.get('destination') as string
  const cargoWeight = parseFloat(formData.get('cargoWeight') as string)
  const distance = parseFloat(formData.get('distance') as string)
  const vehicleId = formData.get('vehicleId') as string
  const driverId = formData.get('driverId') as string
  const action = formData.get('action') as string // 'draft' or 'dispatch'

  if (!source || !destination || !vehicleId || !driverId || cargoWeight <= 0 || distance <= 0) {
    return { error: "All fields are required and must be valid." }
  }

  const status = action === 'dispatch' ? 'Dispatched' : 'Draft'

  const { error } = await (supabase as any)
    .from('trips')
    .insert({
      source,
      destination,
      cargo_weight_kg: cargoWeight,
      planned_distance_km: distance,
      vehicle_id: vehicleId,
      driver_id: driverId,
      status,
      created_by: user.id,
    })

  if (error) {
    console.error("Trip creation error:", error)
    return { error: `Failed to save trip: ${error.message}` }
  }

  revalidatePath('/')
  revalidatePath('/dispatch')
  
  if (action === 'dispatch') {
    redirect('/')
  }

  return { success: true }
}
