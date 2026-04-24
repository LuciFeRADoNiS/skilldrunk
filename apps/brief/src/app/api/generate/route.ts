import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@skilldrunk/supabase/server";
import { createAdminClient } from "@/lib/admin";
import { composeBrief } from "@/lib/compose";
import { pushToTelegram } from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/generate  { date?: "YYYY-MM-DD", push?: boolean, force?: boolean }
 * - Authenticated: generates brief for the logged-in user
 * - Admin role required (brief is private)
 * - Idempotent: if brief exists and force=false, returns existing
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("sd_profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const dateInput =
    typeof body?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
      ? body.date
      : new Date().toISOString().slice(0, 10);
  const push = Boolean(body?.push);
  const force = Boolean(body?.force);

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "admin_client_missing" }, { status: 500 });
  }

  // Existing?
  if (!force) {
    const { data: existing } = await admin
      .from("br_briefings")
      .select("id, summary, body_md, pushed_at, metadata, model")
      .eq("user_id", user.id)
      .eq("brief_date", dateInput)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ ok: true, existed: true, brief: existing });
    }
  }

  // Compose
  let result;
  try {
    result = await composeBrief(supabase, user.id, dateInput);
  } catch (err) {
    return NextResponse.json(
      { error: "compose_failed", detail: String(err) },
      { status: 500 },
    );
  }

  // Upsert
  const { data: inserted, error: upsertErr } = await admin
    .from("br_briefings")
    .upsert(
      {
        user_id: user.id,
        brief_date: dateInput,
        model: result.model,
        summary: result.summary,
        body_md: result.body_md,
        metadata: result.metadata,
      },
      { onConflict: "user_id,brief_date" },
    )
    .select("id, summary, body_md, pushed_at, metadata, model")
    .single();
  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  // Push (optional)
  let pushed = false;
  if (push) {
    const text = `*Brief — ${dateInput}*\n${result.summary}\n\n${result.body_md}\n\n🔗 https://brief.skilldrunk.com/daily/${dateInput}`;
    pushed = await pushToTelegram(text);
    if (pushed) {
      await admin
        .from("br_briefings")
        .update({ pushed_at: new Date().toISOString() })
        .eq("id", inserted.id);
    }
  }

  return NextResponse.json({
    ok: true,
    existed: false,
    pushed,
    brief: inserted,
  });
}
