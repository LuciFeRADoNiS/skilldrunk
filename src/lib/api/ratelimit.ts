// Simple per-process rate limiter. Good enough for MVP — on Vercel serverless
// each instance has its own counter, so the effective limit is higher, but it
// still caps abusive clients per-instance. Swap for Upstash Redis when we see
// real traffic.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter: number;
};

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, limit, remaining: limit - 1, resetAt: now + windowMs, retryAfter: 0 };
  }
  existing.count += 1;
  if (existing.count > limit) {
    return {
      ok: false,
      limit,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfter: Math.ceil((existing.resetAt - now) / 1000),
    };
  }
  return {
    ok: true,
    limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
    retryAfter: 0,
  };
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}

export function clientKey(req: Request, auth: { authed: boolean; keyId?: string }): string {
  if (auth.authed && auth.keyId) return `key:${auth.keyId}`;
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0].trim() || "unknown";
  return `ip:${ip}`;
}

// Limits per minute. Keep them generous — we want devs to experiment freely.
export const LIMITS = {
  read_anon: 60,
  read_authed: 300,
  write_authed: 60,
} as const;
