import { NextResponse } from "next/server";
import { createAnonClient, type Quote } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/random — random active quote from curated pool. */
export async function GET() {
  const supabase = createAnonClient();
  const { data, error } = await supabase.rpc("qt_random_quote");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data as Quote);
}
