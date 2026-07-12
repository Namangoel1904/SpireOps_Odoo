'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createSupabaseServerClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect('/login?message=Could not authenticate: ' + error.message)
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = await createSupabaseServerClient()

  const fullName = formData.get('fullName') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // Optional driver-specific fields
  const licenseNumber = (formData.get('licenseNumber') as string)?.trim() || null
  const licenseExpiry = (formData.get('licenseExpiry') as string)?.trim() || null
  const phone = (formData.get('phone') as string)?.trim() || null
  const vehicleNumber = (formData.get('vehicleNumber') as string)?.trim() || null
  const vehicleModel = (formData.get('vehicleModel') as string)?.trim() || null

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        // Store driver info in metadata so Admin can use it when approving
        ...(licenseNumber && { license_number: licenseNumber }),
        ...(licenseExpiry && { license_expiry: licenseExpiry }),
        ...(phone && { phone }),
        ...(vehicleNumber && { vehicle_number: vehicleNumber }),
        ...(vehicleModel && { vehicle_model: vehicleModel }),
      }
    }
  })

  if (error) {
    redirect('/register?message=Could not sign up: ' + error.message)
  }

  revalidatePath('/', 'layout')
  redirect('/')
}
