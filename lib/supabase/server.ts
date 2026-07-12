// =============================================================================
// SpireOps — Supabase Server Client
// For use in: Server Components, Route Handlers, Server Actions
// Uses @supabase/ssr to properly manage cookies in Next.js App Router
// =============================================================================

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/supabase/types'

/**
 * Creates a Supabase client for SERVER-SIDE use.
 * Automatically reads/writes auth cookies from the Next.js cookie store.
 *
 * Usage in a Route Handler:
 * ```ts
 * const supabase = await createSupabaseServerClient()
 * const { data: { user } } = await supabase.auth.getUser()
 * ```
 *
 * Usage in a Server Component:
 * ```tsx
 * const supabase = await createSupabaseServerClient()
 * const { data: vehicles } = await supabase.from('vehicles').select('*')
 * ```
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // setAll called from a Server Component — safe to ignore.
            // Middleware will handle session refreshes.
          }
        },
      },
    }
  )
}

/**
 * Creates a Supabase admin client using the SERVICE_ROLE key.
 * BYPASSES Row Level Security — use only for admin operations
 * that need to read/write across all users (e.g., trigger hooks, seeding).
 *
 * ⚠️ NEVER expose this client or the service role key to the browser.
 */
export async function createSupabaseAdminClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Safe to ignore in Server Components
          }
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

// ---------------------------------------------------------------------------
// Utility: extract the authenticated user or throw a 401 response
// Use inside API Route Handlers for clean auth gating.
// ---------------------------------------------------------------------------

import { NextResponse } from 'next/server'

export async function requireAuth() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      user: null,
      profile: null,
      supabase,
      unauthorized: NextResponse.json(
        { data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } },
        { status: 401 }
      ),
    }
  }

  // Fetch profile for role-based logic
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return { user, profile, supabase, unauthorized: null }
}
