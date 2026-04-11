// GET /api/v1/me — profile + scopes for the authenticated API key. Use this
// to verify a key is valid before making other calls.

import { createApiClient, extractBearer } from "@/lib/api/auth";
import { apiSuccess, errors } from "@/lib/api/response";

export async function GET(request: Request) {
  const key = extractBearer(request);
  if (!key) return errors.unauthorized();

  const supabase = createApiClient();
  const { data, error } = await supabase.rpc("sd_api_me", { p_key: key });
  if (error) {
    if (error.code === "28000") return errors.unauthorized();
    console.error("sd_api_me rpc error", error);
    return errors.internal();
  }
  const row = (data?.[0] ?? null) as Record<string, unknown> | null;
  if (!row) return errors.unauthorized();
  return apiSuccess(row);
}
