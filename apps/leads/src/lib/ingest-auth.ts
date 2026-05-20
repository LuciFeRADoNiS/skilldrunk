/**
 * Validates an incoming write request to /api/leads/*.
 * Accepts either:
 *   - LEAD_INGEST_SECRET in the `x-lead-secret` header (Cowork pipeline)
 *   - An admin cookie session (Özgür triggered from UI/curl)
 *
 * Returns { ok: true, source } when authorized, or { ok: false, status, error }
 * when not. The caller should return a 401/403 immediately.
 */
import { createServerClient } from "@skilldrunk/supabase/server";

export type IngestAuthResult =
  | { ok: true; source: "secret" | "admin" }
  | { ok: false; status: number; error: string };

export async function checkIngestAuth(request: Request): Promise<IngestAuthResult> {
  const headerSecret = request.headers.get("x-lead-secret");
  const expected = process.env.LEAD_INGEST_SECRET;

  if (headerSecret && expected && headerSecret === expected) {
    return { ok: true, source: "secret" };
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  const { data: profile } = await supabase
    .from("sd_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    return { ok: false, status: 403, error: "Admin role required" };
  }
  return { ok: true, source: "admin" };
}
