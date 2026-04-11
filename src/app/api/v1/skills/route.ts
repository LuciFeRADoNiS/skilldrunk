// GET /api/v1/skills
//
// Query parameters:
//   q          — full-text search query (optional)
//   type       — claude_skill | gpt | mcp_server | cursor_rule | prompt | agent
//   tag        — filter by tag (repeatable)
//   sort       — trending (default) | new | top
//   limit      — 1..100 (default 20)
//   cursor     — opaque pagination cursor (created_at|id)
//
// Authentication: optional. Authed clients get a higher rate limit.

import { createApiClient, getAuth } from "@/lib/api/auth";
import { apiSuccess, errors } from "@/lib/api/response";
import {
  LIMITS,
  checkRateLimit,
  clientKey,
  rateLimitHeaders,
} from "@/lib/api/ratelimit";

const VALID_TYPES = [
  "claude_skill",
  "gpt",
  "mcp_server",
  "cursor_rule",
  "prompt",
  "agent",
] as const;
const VALID_SORTS = ["trending", "new", "top"] as const;

export async function GET(request: Request) {
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

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const type = url.searchParams.get("type");
  const tags = url.searchParams.getAll("tag").filter(Boolean);
  const sort = (url.searchParams.get("sort") ?? "trending") as (typeof VALID_SORTS)[number];
  const limitRaw = Number(url.searchParams.get("limit") ?? 20);
  const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, Math.trunc(limitRaw))) : 20;
  const cursor = url.searchParams.get("cursor");

  if (type && !VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
    return errors.badRequest(`Invalid type. Valid: ${VALID_TYPES.join(", ")}`);
  }
  if (!VALID_SORTS.includes(sort)) {
    return errors.badRequest(`Invalid sort. Valid: ${VALID_SORTS.join(", ")}`);
  }

  const supabase = createApiClient();
  let query = supabase
    .from("sd_skills")
    .select(
      "id, slug, title, summary, type, tags, category, logo_url, homepage_url, source_url, upvotes_count, downvotes_count, comments_count, score, created_at, updated_at"
    )
    .eq("status", "published");

  if (type) query = query.eq("type", type);
  if (tags.length > 0) query = query.contains("tags", tags);
  if (q) query = query.textSearch("search_vector", q, { type: "websearch" });

  if (sort === "new") {
    query = query.order("created_at", { ascending: false });
  } else {
    query = query.order("score", { ascending: false }).order("created_at", { ascending: false });
  }

  if (cursor) {
    const [ts] = cursor.split("|");
    if (ts) query = query.lt("created_at", ts);
  }

  query = query.limit(limit + 1);

  const { data, error } = await query;
  if (error) {
    console.error("/api/v1/skills error", error);
    return errors.internal();
  }

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor =
    hasMore && items.length > 0
      ? `${items[items.length - 1].created_at}|${items[items.length - 1].id}`
      : null;

  const res = apiSuccess(items, {
    count: items.length,
    has_more: hasMore,
    next_cursor: nextCursor,
  });
  Object.entries(rateLimitHeaders(rl)).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}
