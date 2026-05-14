import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client that does NOT use cookies.
 * Safe for static / ISR pages that only read public data.
 * Do NOT use for authenticated operations — use server.ts createClient() instead.
 */
export function createAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
