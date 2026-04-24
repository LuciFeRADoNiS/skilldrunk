import { NextResponse } from "next/server";
import { createAnonClient, type Quote } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/daily — deterministic daily quote (same for all visitors today).
 * Useful for Cowork reminders: link to https://quotes.skilldrunk.com and
 * everyone sees the same quote until Istanbul midnight.
 */
export async function GET() {
  const supabase = createAnonClient();
  const { data, error } = await supabase.rpc("qt_daily_quote");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data as Quote, {
    headers: {
      "cache-control": "public, max-age=300, s-maxage=1800",
    },
  });
}
