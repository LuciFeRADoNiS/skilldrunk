import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Shared /api/track handler for all skilldrunk subdomains.
 * Writes to sd_pageviews via service_role (bypasses RLS).
 *
 * Each app imports this and re-exports:
 *   export { POST } from "@skilldrunk/analytics/track-handler";
 */
export async function trackHandler(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      path?: string;
      referrer?: string | null;
      sid?: string | null;
      uid?: string | null;
    };
    const path = typeof body.path === "string" ? body.path : null;
    if (!path) return NextResponse.json({ ok: false }, { status: 400 });

    // Skip noise
    if (
      path.startsWith("/admin") ||
      path.startsWith("/api") ||
      path.startsWith("/_next")
    ) {
      return NextResponse.json({ ok: true, skipped: "noise" });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return NextResponse.json({ ok: true, skipped: "no_service_role" });
    }

    const host =
      req.headers.get("x-forwarded-host") ??
      req.headers.get("host") ??
      null;
    const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;
    const country = req.headers.get("x-vercel-ip-country") ?? null;
    const referrer =
      typeof body.referrer === "string" ? body.referrer.slice(0, 500) : null;

    const supabase = createClient(url, key, {
      auth: { persistSession: false },
    });

    await supabase.from("sd_pageviews").insert({
      path,
      referrer,
      user_agent: userAgent,
      country,
      session_id: typeof body.sid === "string" ? body.sid : null,
      user_id: typeof body.uid === "string" ? body.uid : null,
      host,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
