// /api/custodian/cron/ga4 — Faz 1 PR-C
//
// Daily GA4 pull → cst_analytics_daily upsert. Triggered by Vercel cron
// (apps/admin/vercel.json, 05:00 UTC). Vercel cron requests carry
// `Authorization: Bearer $CRON_SECRET`; we also accept ?secret= for manual
// runs.
//
// Property 534659408 (skilldrunk). GA4_SA_KEY_JSON env required.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchDailyAnalytics } from "@/lib/custodian/ga4";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SKILLDRUNK_GA4_PROPERTY = "534659408";
const DOMAIN = "skilldrunk.com";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const url = new URL(req.url);
  return url.searchParams.get("secret") === secret;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "supabase config missing" }, { status: 500 });
  }

  try {
    const analytics = await fetchDailyAnalytics(SKILLDRUNK_GA4_PROPERTY, "yesterday");
    const supabase = createClient(url, key, { auth: { persistSession: false } });

    const { error } = await supabase.from("cst_analytics_daily").upsert(
      {
        domain: DOMAIN,
        date: analytics.date,
        users: analytics.users,
        pageviews: analytics.pageviews,
        top_pages: analytics.top_pages,
        sources: analytics.sources,
        captured_at: new Date().toISOString(),
      },
      { onConflict: "domain,date" },
    );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      domain: DOMAIN,
      date: analytics.date,
      users: analytics.users,
      pageviews: analytics.pageviews,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[custodian-cron-ga4]", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
