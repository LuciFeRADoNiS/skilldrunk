import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using service_role key.
 * Returns null if SUPABASE_SERVICE_ROLE_KEY is not set (safe fallback).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}
