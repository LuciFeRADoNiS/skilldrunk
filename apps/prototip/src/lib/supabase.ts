import { createClient } from "@supabase/supabase-js";

/**
 * prototip reads only published apps via the anon client — no auth cookie
 * wrangling needed. Uses RLS policy pt_apps_public_read.
 */
export function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}
