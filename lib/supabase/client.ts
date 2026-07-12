// =============================================================================
// SpireOps — Supabase Browser Client
// For use in: Client Components ('use client')
// Singleton pattern prevents creating multiple GoTrue instances.
// =============================================================================

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/supabase/types'

let client: ReturnType<typeof createBrowserClient<Database>> | undefined

/**
 * Returns a singleton Supabase browser client.
 * Safe to call multiple times — always returns the same instance.
 *
 * Usage in a Client Component:
 * ```tsx
 * 'use client'
 * import { getSupabaseBrowserClient } from '@/lib/supabase/client'
 *
 * const supabase = getSupabaseBrowserClient()
 * const { data } = await supabase.from('vehicles').select('*')
 * ```
 */
export function getSupabaseBrowserClient() {
  if (client) return client

  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return client
}

export type SupabaseBrowserClient = ReturnType<typeof getSupabaseBrowserClient>
