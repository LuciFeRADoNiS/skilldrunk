// GET /api/v1/skills/:slug — full skill record including body_mdx.

import { createApiClient, getAuth } from "@/lib/api/auth";
import { apiSuccess, errors } from "@/lib/api/response";
import {
  LIMITS,
  checkRateLimit,
  clientKey,
  rateLimitHeaders,
} from "@/lib/api/ratelimit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const auth = getAuth(request);
  const rl = checkRateLimit(
    clientKey(request, { authed: auth.authed, keyId: auth.authed ? auth.key : undefined }),
    auth.authed ? LIMITS.read_authed : LIMITS.read_anon,
    60_000
  );
  if (!rl.ok) {
    const res = errors.rateLimited(rl.retryAfter);
    Object.entries(rateLimitHeaders(rl)).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }

  const supabase = createApiClient();
  const { data, error } = await supabase
    .from("sd_skills")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("/api/v1/skills/[slug] error", error);
    return errors.internal();
  }
  if (!data) return errors.notFound("skill");

  const res = apiSuccess(data);
  Object.entries(rateLimitHeaders(rl)).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}
