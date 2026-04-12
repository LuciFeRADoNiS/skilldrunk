import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service_role to bypass RLS for pageview inserts
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const path = typeof body.path === "string" ? body.path : null;
    if (!path) return NextResponse.json({ ok: false }, { status: 400 });

    // Skip tracking for admin, api, and static paths
    if (
      path.startsWith("/admin") ||
      path.startsWith("/api") ||
      path.startsWith("/_next")
    ) {
      return NextResponse.json({ ok: true });
    }

    const referrer =
      typeof body.referrer === "string" ? body.referrer.slice(0, 500) : null;
    const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;
    const country = req.headers.get("x-vercel-ip-country") ?? null;

    await supabaseAdmin.from("sd_pageviews").insert({
      path,
      referrer,
      user_agent: userAgent,
      country,
      session_id: typeof body.sid === "string" ? body.sid : null,
      user_id: typeof body.uid === "string" ? body.uid : null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
