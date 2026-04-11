// POST /api/v1/skills/:slug/vote
// Body: { value: 1 | -1 | 0 }  — 0 clears the vote. Auth required.

import { createApiClient, extractBearer } from "@/lib/api/auth";
import { apiSuccess, errors } from "@/lib/api/response";
import {
  LIMITS,
  checkRateLimit,
  clientKey,
  rateLimitHeaders,
} from "@/lib/api/ratelimit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const key = extractBearer(request);
  if (!key) return errors.unauthorized();

  const rl = checkRateLimit(
    clientKey(request, { authed: true, keyId: key }),
    LIMITS.write_authed,
    60_000
  );
  if (!rl.ok) {
    const res = errors.rateLimited(rl.retryAfter);
    Object.entries(rateLimitHeaders(rl)).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errors.badRequest("Body must be valid JSON.");
  }
  const value = (body as { value?: number } | null)?.value;
  if (value !== 1 && value !== -1 && value !== 0) {
    return errors.badRequest("value must be 1, -1, or 0.");
  }

  const supabase = createApiClient();
  const { data, error } = await supabase.rpc("sd_api_vote", {
    p_key: key,
    p_slug: slug,
    p_value: value,
  });

  if (error) {
    if (error.code === "28000") return errors.unauthorized();
    if (error.code === "42501") return errors.forbidden("API key is missing the 'write' scope.");
    if (error.code === "P0002") return errors.notFound("skill");
    if (error.code === "22023") return errors.badRequest(error.message);
    console.error("sd_api_vote rpc error", error);
    return errors.internal();
  }

  const row = (data?.[0] ?? {}) as Record<string, unknown>;
  const res = apiSuccess(row);
  Object.entries(rateLimitHeaders(rl)).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}
