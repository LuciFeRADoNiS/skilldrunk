// Public REST API authentication helpers.
//
// A request is authenticated by including an API key in the Authorization
// header: `Authorization: Bearer sd_live_…`. All writes go through
// SECURITY DEFINER RPCs that internally verify the key, so no service_role
// credential needs to live in the deployment environment.

import { createClient as createSbClient } from "@supabase/supabase-js";

export type ApiAuth =
  | { authed: false; key: null }
  | { authed: true; key: string };

export function extractBearer(req: Request): string | null {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) return null;
  const key = match[1].trim();
  return key.startsWith("sd_live_") ? key : null;
}

export function getAuth(req: Request): ApiAuth {
  const key = extractBearer(req);
  return key ? { authed: true, key } : { authed: false, key: null };
}

// Anonymous Supabase client — fine for public reads and SECURITY DEFINER RPCs.
export function createApiClient() {
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
