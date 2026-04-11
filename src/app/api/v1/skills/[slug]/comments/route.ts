// GET  /api/v1/skills/:slug/comments  — list comments
// POST /api/v1/skills/:slug/comments  — create a comment (auth + write scope)

import { createApiClient, extractBearer, getAuth } from "@/lib/api/auth";
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
  const { data: skill, error: skillErr } = await supabase
    .from("sd_skills")
    .select("id")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (skillErr) return errors.internal();
  if (!skill) return errors.notFound("skill");

  const { data, error } = await supabase
    .from("sd_comments")
    .select("id, parent_id, author_id, body_md, upvotes_count, created_at")
    .eq("skill_id", skill.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) return errors.internal();
  const res = apiSuccess(data ?? [], { count: data?.length ?? 0 });
  Object.entries(rateLimitHeaders(rl)).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

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
  const bodyObj = body as { body_md?: string; parent_id?: string | null } | null;
  const text = bodyObj?.body_md?.trim();
  if (!text) return errors.badRequest("body_md is required.");

  const supabase = createApiClient();
  const { data, error } = await supabase.rpc("sd_api_comment", {
    p_key: key,
    p_slug: slug,
    p_body_md: text,
    p_parent_id: bodyObj?.parent_id ?? null,
  });
  if (error) {
    if (error.code === "28000") return errors.unauthorized();
    if (error.code === "42501") return errors.forbidden("API key is missing the 'write' scope.");
    if (error.code === "P0002") return errors.notFound("skill");
    if (error.code === "22023") return errors.badRequest(error.message);
    console.error("sd_api_comment rpc error", error);
    return errors.internal();
  }

  const comment = (data?.[0] ?? {}) as Record<string, unknown>;
  const res = apiSuccess(comment, undefined, { status: 201 });
  Object.entries(rateLimitHeaders(rl)).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}
